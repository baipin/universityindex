"""Refresh in an isolated candidate directory, validate, then publish data only."""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from fetch_sources import ROOT


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def ranking_signature(data):
    return {
        "rankings": [{k: v for k, v in r.items() if k not in {"checkedAt", "sha256"}} for r in data["meta"]["rankings"]],
        "schools": sorted([{k: s.get(k) for k in ("id", "name", "nameZh", "country", "ranks", "rankLabels")} for s in data["schools"]], key=lambda s: s["id"]),
    }


def validate_candidate(before, after, checks):
    for rank in ("qs", "the", "usnews"):
        ranked = [s for s in after["schools"] if rank in s["ranks"]]
        if len(ranked) < 150 or not any(s["ranks"][rank] == 1 for s in ranked):
            raise ValueError(f"Incomplete {rank} ranking; keeping published data")
    previous_subjects = before["meta"]["coverage"]["subjects"]
    if after["meta"]["coverage"]["subjects"] < previous_subjects * 0.8:
        raise ValueError("Unexpected loss of QS subject tables")
    active_ids = {s["id"] for s in after["schools"]}
    prior_sources = before["meta"]["coverage"].get("checkedAdmissionSources", 0)
    prior_active = sum(bool(s.get("admissionSources")) for s in before["schools"] if s["id"] in active_ids)
    current_sources = sum(c["status"] == "source-checked" for c in checks)
    # A provider outage must not erase most of the published catalogue.
    if prior_active and current_sources < prior_sources * 0.6:
        raise ValueError("Too many admissions sources unavailable; keeping published data")
    previous_lookup = sum(bool(s.get("requirementLinks")) for s in before["schools"] if s["id"] in active_ids)
    current_lookup = sum(bool(s.get("requirementLinks")) for s in after["schools"])
    if current_lookup < previous_lookup:
        raise ValueError("Official course lookup coverage declined; keeping published data")
    old_editions = {r["id"]: r["year"] for r in before["meta"]["rankings"]}
    for rank in after["meta"]["rankings"]:
        if rank["id"] in old_editions and int(rank["year"][:4]) < int(old_editions[rank["id"]][:4]):
            raise ValueError("Ranking edition regression: " + rank["id"])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=("rankings", "admissions", "all"), default="rankings")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    (ROOT / ".cache").mkdir(exist_ok=True)
    report = {"startedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"), "mode": args.mode, "dryRun": args.dry_run, "success": False}
    before = load(ROOT / "data" / "universities.json")
    previous_checks = load(ROOT / "data" / "admissions" / "checks.json")["sources"]
    previous_urls = {c["url"]: c for c in previous_checks}
    try:
        with tempfile.TemporaryDirectory(prefix="uindex-update-") as directory:
            stage = Path(directory)
            for name in ("scripts", "data", "js", "tests"):
                shutil.copytree(ROOT / name, stage / name, ignore=shutil.ignore_patterns("__pycache__"))
            shutil.copy2(ROOT / "package.json", stage / "package.json")
            env = {**os.environ, "PYTHONIOENCODING": "utf-8"}
            # The staging directory has no cache. No persistent cache is restored
            # in CI; --refresh also makes local runs fetch current pages.
            def run(*command):
                subprocess.run(command, cwd=stage, env=env, check=True, timeout=2700)
            if args.mode in ("rankings", "all"):
                run(sys.executable, "scripts/import_rankings.py", "--discover-latest", "--refresh")
                report["rankingSources"] = load(stage / ".cache" / "ranking-report.json")
            if args.mode in ("admissions", "all"):
                run(sys.executable, "scripts/collect_admissions.py", "--refresh")
            else:
                run(sys.executable, "scripts/collect_admissions.py", "--reuse-checks")
            run(sys.executable, "scripts/requirement_portals.py", "--refresh" if args.mode in ("admissions", "all") else "--missing-only")
            run(sys.executable, "scripts/localize_catalog.py")
            after = load(stage / "data" / "universities.json")
            checks = load(stage / "data" / "admissions" / "checks.json")["sources"]
            validate_candidate(before, after, checks)
            run("node", "--test", "tests/catalog.test.cjs")
            rankings_changed = ranking_signature(before) != ranking_signature(after)
            changed_sources = []
            for item in checks:
                old = previous_urls.get(item["url"])
                field = "contentSha256" if old and old.get("contentSha256") and item.get("contentSha256") else "sha256"
                if old and old.get(field) != item.get(field):
                    changed_sources.append({"school": item["school"], "url": item["url"], "status": item["status"]})
            report.update({
                "success": True, "rankingsChanged": rankings_changed,
                "coverageBefore": before["meta"]["coverage"], "coverageAfter": after["meta"]["coverage"],
                "changedAdmissionsSources": changed_sources,
                "courseLookupIssues": [
                    {"school": s["name"], "url": link["url"], "status": link["verification"],
                     "error": link.get("destinationCheck")}
                    for s in after["schools"] for link in s.get("requirementLinks", [])
                    if link.get("destinationCheck") or link["verification"] == "access-limited"
                ],
                "unavailableAdmissionsSources": [{"school": c["school"], "url": c["url"], "error": c.get("error")} for c in checks if c["status"] != "source-checked"],
                "pendingReviewRecords": [{"schoolId": s["id"], "programId": r.get("id"), "reason": r["reviewState"]} for s in after["schools"] for r in list(s["requirements"].values()) + s["programs"] if r and r.get("reviewState")],
            })
            # Avoid daily commits that change only generated/check timestamps.
            publish = rankings_changed or args.mode in ("admissions", "all")
            if publish and not args.dry_run:
                shutil.copytree(stage / "data", ROOT / "data", dirs_exist_ok=True)
            report["published"] = publish and not args.dry_run
    except Exception as error:
        report["error"] = str(error)
        raise
    finally:
        report["finishedAt"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
        path = ROOT / ".cache" / "update-report.json"
        path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        summary = os.environ.get("GITHUB_STEP_SUMMARY")
        if summary:
            with open(summary, "a", encoding="utf-8") as output:
                output.write("## University data update\n\n")
                output.write(f"Mode: {args.mode}; success: {report['success']}; published: {report.get('published', False)}.\n\n")
                output.write("Changed admissions sources and unavailable URLs are listed in the update-report artifact.\n")
                if report.get("error"):
                    output.write("Update failed; the published data was preserved.\n")
        print(json.dumps({k: report[k] for k in ("mode", "success", "published", "rankingsChanged", "error") if k in report}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
