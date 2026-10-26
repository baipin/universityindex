"""Offline regression checks for automated publication safeguards."""
import copy
import json
from pathlib import Path
import sys
import unittest
import yaml
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from collect_admissions import review_is_current
from discover_editions import qs_edition_matches, subject_paths, usnews_edition, discover
from update_data import ranking_signature, validate_candidate


class ReviewTests(unittest.TestCase):
    def setUp(self):
        self.url = "https://example.edu/admissions"
        self.entry = {"fieldSources": {"english": self.url}, "sourceFingerprints": {self.url: {"sha256": "old", "contentSha256": "same"}}}

    def test_unchanged_text_keeps_review_even_when_html_changes(self):
        self.assertTrue(review_is_current(self.entry, {self.url: {"sha256": "new", "contentSha256": "same"}}))

    def test_changed_text_invalidates_previous_review(self):
        self.assertFalse(review_is_current(self.entry, {self.url: {"sha256": "new", "contentSha256": "changed"}}))

    def test_unavailable_or_missing_baseline_does_not_recertify(self):
        self.assertFalse(review_is_current(self.entry, {}))
        self.entry["sourceFingerprints"] = {}
        self.assertFalse(review_is_current(self.entry, {self.url: {"sha256": "new"}}))


class EditionTests(unittest.TestCase):
    def test_http_success_or_link_alone_cannot_confirm_edition(self):
        old = '<title>QS Rankings 2027</title><a href="/2028">2028</a><script>"rank_url":"/data.txt"</script>'
        self.assertTrue(qs_edition_matches(old, "2027"))
        self.assertFalse(qs_edition_matches(old, "2028"))
        self.assertFalse(qs_edition_matches("<title>QS Rankings 2028</title>", "2028"))

    def test_subject_hub_uses_only_requested_year(self):
        raw = '<a href="/university-rankings/university-subject-rankings/2026/law">law</a><a href="/university-rankings/university-subject-rankings/2027/law">law</a>'
        self.assertEqual(len(subject_paths(raw, 2027)), 1)
        self.assertIn("/2027/", subject_paths(raw, 2027)[0])

    def test_usnews_requires_explicit_edition(self):
        self.assertEqual(usnews_edition("Title: Latest\nMarkdown Content:\n2027-2028 Best Global Universities"), "2027–2028")
        with self.assertRaises(ValueError):
            usnews_edition("Published 2027, Best Global Universities")
        with self.assertRaises(ValueError):
            usnews_edition("2027–2030 Best Global Universities")

    def test_unverified_future_pages_do_not_advance_year(self):
        current = json.loads((ROOT / "data/ranking-editions.json").read_text(encoding="utf-8"))
        def page(url):
            if "usnews.com" in url:
                return "Title: Publication\nMarkdown Content:\n" + current["usnews"]["year"] + " Best Global Universities"
            return "<title>Not found</title>"
        with patch("discover_editions.fetch", side_effect=page):
            result, warnings = discover(current)
        self.assertEqual(result, current)

    def test_usnews_outage_does_not_invent_an_edition(self):
        current = json.loads((ROOT / "data/ranking-editions.json").read_text(encoding="utf-8"))
        with patch("discover_editions.fetch", side_effect=OSError("temporary outage")):
            result, warnings = discover(current)
        self.assertEqual(result["usnews"]["year"], current["usnews"]["year"])
        self.assertIn("unavailable", result["usnews"])
        self.assertTrue(warnings)


class CandidateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads((ROOT / "data/universities.json").read_text(encoding="utf-8"))
        cls.checks = json.loads((ROOT / "data/admissions/checks.json").read_text(encoding="utf-8"))["sources"]

    def test_published_snapshot_passes(self):
        validate_candidate(self.data, self.data, self.checks)

    def test_partial_rankings_and_mass_outage_are_rejected(self):
        broken = copy.deepcopy(self.data)
        broken["schools"] = broken["schools"][:10]
        with self.assertRaises(ValueError):
            validate_candidate(self.data, broken, self.checks)
        with self.assertRaises(ValueError):
            validate_candidate(self.data, self.data, [])

    def test_edition_regression_is_rejected(self):
        broken = copy.deepcopy(self.data)
        broken["meta"]["rankings"][0]["year"] = "2000"
        with self.assertRaises(ValueError):
            validate_candidate(self.data, broken, self.checks)

    def test_timestamps_do_not_cause_daily_noop_commits(self):
        other = copy.deepcopy(self.data)
        other["meta"]["generatedAt"] = "2099-01-01T00:00:00Z"
        other["meta"]["rankings"][0]["checkedAt"] = "2099-01-01"
        other["meta"]["rankings"][0]["sha256"] = "different-html"
        self.assertEqual(ranking_signature(self.data), ranking_signature(other))


class WorkflowTests(unittest.TestCase):
    def test_workflow_yaml_and_schedule(self):
        path = ROOT / ".github/workflows/update-data.yml"
        config = yaml.load(path.read_text(encoding="utf-8"), Loader=yaml.BaseLoader)
        self.assertEqual(config["permissions"]["contents"], "write")
        self.assertEqual({s["cron"] for s in config["on"]["schedule"]}, {"37 0 * * *", "17 2 1 * *"})
        self.assertEqual(config["concurrency"]["cancel-in-progress"], "false")
        self.assertIn("workflow_dispatch", config["on"])
        self.assertEqual(config["on"]["workflow_dispatch"]["inputs"]["mode"]["options"], ["rankings", "admissions", "all", "validate"])
        check = yaml.load((ROOT / ".github/workflows/checks.yml").read_text(encoding="utf-8"), Loader=yaml.BaseLoader)
        self.assertIn("push", check["on"])


if __name__ == "__main__":
    unittest.main()
