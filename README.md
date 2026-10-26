# University Index

**English** · [繁體中文](README.zh-Hant.md) · [简体中文](README.zh-Hans.md)

A multilingual university admissions directory with QS, U.S. News and Times Higher Education rankings, degree filters, programme search, original official sources, and review status. The static site supports English, Traditional Chinese, Simplified Chinese, light/dark themes and mobile screens.

## Coverage

Snapshot: **27 October 2026**. Live counts and edition labels are generated from `data/universities.json`.

| Dataset | Coverage |
| --- | --- |
| QS World University Rankings 2027 | Ranks 1–150; 151 institutions including ties |
| THE World University Rankings 2027 | Ranks 1–150; 151 institutions including ties |
| U.S. News Best Global Universities 2026–2027 | Ranks 1–150; 151 institutions including ties |
| Deduplicated global ranking union | 216 institutions |
| QS 2026 subject / broad-area categories | 59 views |
| Institutions with checked admissions sources | 140 |
| Checked admissions source records | 316 |
| Specific programmes | 78, including 74 with reviewed summaries |
| Reviewed requirement records | 125: 51 institutional/faculty baselines and 74 programme records |

Admissions coverage is **partial**, not every programme at every institution. There are 76 institutions without a publishable admissions source and 45 unavailable candidate source records. Subject views show subject ranks up to 150 **within the global ranking union**; they are not complete subject league tables. U.S. News refers to its global ranking, not the US domestic undergraduate ranking. Ties and bands such as `=2` and `101-150` retain the publishers’ labels.

## Automated GitHub bot

[University data bot](.github/workflows/update-data.yml) runs on the default branch:

| Job | Schedule in Hong Kong time (UTC+8) | Behaviour |
| --- | --- | --- |
| Rankings | Daily, 08:37 | Look for published QS/THE overall and QS subject editions, verify the live U.S. News edition, and import official ranking data |
| Admissions | First day of each month, 10:17 | Fetch all active official candidate pages afresh, compare fingerprints and update source excerpts/status |
| Manual | Actions → University data bot → Run workflow | Choose rankings, admissions, all, or offline validation; optional dry run |

No separate bot account, paid AI service or API key is required. The workflow uses `GITHUB_TOKEN` and commits changed data as `github-actions[bot]`. GitHub Actions must be enabled and repository rules must allow the workflow to push to the default branch. Branch protection can reject that push; the bot never force-pushes. An optional Actions secret `DATA_BOT_TOKEN` can supply a separately authorized token when repository policy or downstream workflows require it. Do not commit credentials.

GitHub schedules can be delayed. Public-repository schedules may be disabled after 60 days without repository activity; inspect Actions if updates stop. Monthly successful checks normally create data activity. Failure notifications follow your GitHub notification settings. Pushes made using `GITHUB_TOKEN` do not normally trigger other push-based Actions; this workflow runs its own checks before committing.

### Publication safeguards

- Calendar changes alone never advance an edition. Official headings/data metadata must confirm QS/THE years; U.S. News requires an explicit edition in the official publication article.
- Downloads and validation run in a temporary candidate directory. Incomplete rankings, edition regressions or a widespread admissions-source outage leave published data unchanged.
- If U.S. News temporarily blocks access or its live edition cannot be confirmed, retain its previously verified snapshot and original check date, record the reason in the report, and allow other rankings to update.
- A reviewed summary is anchored to source fingerprints. If a referenced page changes or becomes unavailable, old scores/deadlines are not automatically certified again. Reachable changed pages publish as awaiting review with fresh excerpts; reviewers must verify and re-anchor any summary.
- Unknown scores/deadlines remain `null`. The bot does not infer requirements from ranking, keywords or another faculty’s rules.
- Daily timestamp-only ranking changes do not create commits. Changed source URLs, unavailable pages and pending-review records are recorded in a 90-day Actions report artifact.

Automatic source refresh does **not** replace substantive review of new admission rules. A blocked/changed official website may need a parser or source-link update.

## Data and localization

- `data/universities.json`: the published catalogue, editions, degree rules, programmes and coverage.
- `data/ranking-editions.json`: persisted official edition entry points, updated after successful discovery/import.
- `data/rankings/*.json`: normalized rank facts, original URLs, edition, check date and SHA-256.
- `data/admissions/catalog.json`: candidate official pages and their scope.
- `data/admissions/checks.json`: source checks and fingerprints, including unavailable-source reasons.
- `data/admissions/reviewed.json`: reviewed field summaries, `fieldSources`, review dates and source revision fingerprints.

`null` means unverified, not “no requirement”. `source-checked` means the page was readable; it does not certify automatically extracted scores. `reviewed` applies to the listed fields, not to every possible condition. Institutional/faculty baselines remain separate from programme rules. The legacy `gpa` field can contain broader academic qualifications rather than a numeric GPA. TOEFL scales are recorded only as stated by the institution, without inferred conversions.

School and region display fields distinguish Traditional and Simplified Chinese. Region display uses **Hong Kong SAR / 香港特別行政區 / 香港特别行政区** and **Taiwan / 臺灣 / 台湾**, while original source identities remain intact. OpenCC creates Traditional characters during data builds, without a client-side CDN dependency. The header banner sits inside a bounded card and uses `img/ulist.jpg`.

Official links, check dates and attribution are visible in the site. Some public pages are read via Jina Reader; the original institution/publisher remains the source. Raw cached pages are not committed. Source content belongs to its publisher; the catalogue uses limited attributed excerpts and summaries.

## Development

Requirements: Node.js 18+ and Python 3.10+. No npm dependencies are needed for the standard data tests.

```sh
python -m pip install -r requirements-dev.txt
npm run serve
# Open http://127.0.0.1:8080
npm run check
python -m unittest discover -s tests -p "test_*.py"
python -m compileall -q scripts
```

Browser checks require Playwright and an installed browser. Set `PLAYWRIGHT_MODULE` to the Playwright module path if it is outside normal module resolution; set `BROWSER_CHANNEL=msedge` to use installed Edge, or provide Playwright Chromium. Run `npm run test:browser`. Checks cover initial empty selection, controls used before data finishes loading, the independent official-site link, language-specific names, region labels, bounded banner dimensions, filters, provenance, themes and expanded ranking chips at five viewport widths. Screenshots are saved under ignored `.cache/`.

## Updating and reviewing data

```sh
python scripts/update_data.py --mode rankings --dry-run
python scripts/update_data.py --mode rankings
python scripts/update_data.py --mode admissions
python scripts/update_data.py --mode all
```

The orchestrator always uses a fresh candidate cache. For lower-level manual maintenance:

```sh
python scripts/import_rankings.py --discover-latest --refresh
python scripts/collect_admissions.py --refresh
python scripts/localize_catalog.py
npm run check
```

Always rebuild admissions after importing rankings. Optional `discover_websites.py` and `discover_admissions.py` discover official links; a directory never automatically becomes a requirement. Lower-level scripts otherwise reuse `.cache/`. `collect_admissions.py --reuse-checks` reapplies reviews without refreshing unchanged sources or check dates. It cannot be combined with `--refresh`.

To add a review, read the actual official rules, record the field-specific URLs and review date, and use `sourceFingerprints` from the checked source revisions. For an existing entry, replace those fingerprints only after reviewing its changed sources. Newly eligible institutions can have empty admissions coverage until their official sources are added. Run data, updater and browser checks before publishing.
