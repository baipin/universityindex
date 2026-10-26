"""Check official admissions sources and publish bounded, attributed excerpts.

Automatic excerpts are explicitly unreviewed. Only reviewed.json may supply
human-reviewed GPA/English/deadline/document summaries. A reachable page is
never treated as proof that every programme has the same requirements.
"""
from __future__ import annotations
import concurrent.futures
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
import re
import threading
import time
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from fetch_sources import ROOT, fetch
from import_rankings import key

CATEGORIES = {
    'gpa': r'GPA|grade.point.average|honours|honors|upper.second|2:1|first.class|bachelor.{0,20}degree|master.{0,20}degree',
    'english': r'IELTS|TOEFL|Duolingo|English.language.proficiency|English.proficiency|English.language.requirement',
    'deadline': r'deadline|closing.date',
    'documents': r'transcript|recommendation|reference.letter|statement.of.purpose|research.proposal|curriculum.vitae',
}
READER_LOCK = threading.Lock()
LAST_READER_REQUEST = 0.0

def read_source(url):
    global LAST_READER_REQUEST
    cached = ROOT / '.cache' / (hashlib.sha256(url.encode()).hexdigest() + '.html')
    if url.startswith('https://r.jina.ai/') and (not cached.exists() or os.environ.get("UINDEX_REFRESH") == "1"):
        with READER_LOCK:
            wait = 3.2 - (time.monotonic() - LAST_READER_REQUEST)
            if wait > 0:
                time.sleep(wait)
            LAST_READER_REQUEST = time.monotonic()
    return fetch(url)

def readable(raw):
    if raw.startswith('Title:'):
        title = raw.splitlines()[0].removeprefix('Title:').strip()
        text = raw.split('Markdown Content:', 1)[-1]
        text = re.sub(r'!\[[^]]*\]\([^)]+\)', '', text)
        text = re.sub(r'\[([^]]+)\]\([^)]+\)', r'\1', text)
        return title, text
    soup = BeautifulSoup(raw, 'html.parser')
    title = soup.title.get_text(' ', strip=True) if soup.title else ''
    for node in soup(['script', 'style', 'nav', 'header', 'footer', 'noscript', 'svg', 'form']):
        node.decompose()
    candidates = soup.find_all('main') + soup.find_all('article')
    main = max(candidates, key=lambda node: len(node.get_text(' ', strip=True))) if candidates else soup.body or soup
    if len(main.get_text(' ', strip=True)) < 600 and soup.body and len(soup.body.get_text(' ', strip=True)) > 1200:
        main = soup.body
    return title, main.get_text(' ', strip=True)

def check(item):
    result = dict(item)
    url = item['url']
    try:
        error = None
        for transport in (url, 'https://r.jina.ai/' + url):
            try:
                raw = read_source(transport)
                title, content = readable(raw)
                if len(content) < 160 or re.search(r'404|page not found|could not be found|access denied|just a moment|security verification|human verification|robot or human', title, re.I) or re.search(r'Warning: Target URL returned error (?:40[034]|50[023])|testing whether you are a human visitor|What code is in the image', raw, re.I):
                    raise ValueError('Source returned an error or challenge page: ' + title)
                error = None
                break
            except Exception as issue:
                error = issue
        if error:
            raise error
        if item['kind'] == 'program':
            significant = [word for word in re.findall(r'[a-z]+', item['name'].lower()) if len(word) > 3 and word not in {'master', 'masters', 'science', 'computer', 'advanced', 'information', 'doctor', 'philosophy'}]
            if significant and not any(word in (title + ' ' + content[:5000]).lower() for word in significant):
                raise ValueError('Programme identity does not match the source')
        excerpts = []
        total = 0
        # Publish exact, bounded strings, never synthesized minimum scores or dates.
        for category, expression in CATEGORIES.items():
            match = re.search(expression, content, re.I)
            if not match:
                continue
            start = max(0, match.start() - 55)
            end = min(len(content), match.end() + 145)
            snippet = re.sub(r'\s+', ' ', content[start:end]).strip()
            words = snippet.split()[:45]
            snippet = ' '.join(words)
            if total + len(words) > 160:
                continue
            total += len(words)
            excerpts.append({'category': category, 'text': snippet, 'source': url})
        result.update({'status': 'source-checked', 'title': title, 'checkedAt': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'retrievedVia': transport, 'sha256': hashlib.sha256(raw.encode()).hexdigest(), 'contentSha256': hashlib.sha256(re.sub(r"\s+", " ", content).strip().encode()).hexdigest(), 'excerpts': excerpts})
        (ROOT / '.cache' / ('admission-' + hashlib.sha256(url.encode()).hexdigest() + '.txt')).write_text(content, encoding='utf-8')
    except Exception as error:
        result.update({'status': 'unavailable', 'error': str(error)})
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reuse-checks', action='store_true', help='Reuse prior source checks for unchanged catalog records; check only new/changed records. Does not change prior check dates.')
    parser.add_argument('--refresh', action='store_true', help='Fetch current official pages instead of using the disk cache.')
    args = parser.parse_args()
    if args.refresh and args.reuse_checks:
        parser.error("--refresh cannot be combined with --reuse-checks")
    if args.refresh:
        os.environ["UINDEX_REFRESH"] = "1"
    catalog = json.loads((ROOT / 'data' / 'admissions' / 'catalog.json').read_text(encoding='utf-8'))['sources']
    data_path = ROOT / 'data' / 'universities.json'
    initial = json.loads(data_path.read_text(encoding='utf-8'))
    lookup = {key(s['name']): s['id'] for s in initial['schools']}
    # A school can leave the top-150 union in a new ranking edition. Keep its
    # catalog and reviews on disk, but do not attach them to a different school.
    catalog = [item for item in catalog if key(item['school']) in lookup]
    reviewed_path = ROOT / 'data' / 'admissions' / 'reviewed.json'
    reviewed = json.loads(reviewed_path.read_text(encoding="utf-8"))
    check_path = ROOT / 'data' / 'admissions' / 'checks.json'
    old_checks = json.loads(check_path.read_text(encoding="utf-8"))["sources"] if check_path.exists() else []
    old_urls = {item["url"]: item for item in old_checks if item["status"] == "source-checked"}
    # Anchor a review to the source revision it was actually based on. This
    # baseline must be captured BEFORE downloading a newer page.
    for entry in reviewed["entries"]:
        if "sourceFingerprints" not in entry:
            entry["sourceFingerprints"] = {url: {k: old_urls[url][k] for k in ("sha256", "contentSha256") if k in old_urls[url]} for url in set(entry.get("fieldSources", {}).values()) if url in old_urls}
    checked = []
    def identity(item):
        return tuple(item.get(k) for k in ('school', 'level', 'url', 'kind', 'name', 'subject'))
    previous = {}
    check_path = ROOT / 'data' / 'admissions' / 'checks.json'
    if args.reuse_checks and check_path.exists():
        previous = {identity(item): item for item in json.loads(check_path.read_text(encoding='utf-8'))['sources']}
    def check_or_reuse(item):
        return dict(previous[identity(item)]) if identity(item) in previous else check(item)
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
        for result in pool.map(check_or_reuse, catalog):
            result['schoolId'] = lookup[key(result['school'])]
            checked.append(result)
            print(result['status'], result['school'], result.get('name', result['level']), result.get('title', result.get('error', '')), flush=True)
    data = json.loads(data_path.read_text(encoding='utf-8'))
    schools = {s['id']: s for s in data['schools']}
    for school in schools.values():
        school['requirements'] = {level: None for level in data['meta']['levels']}
        school['programs'] = []
        school['admissionSources'] = []
    for result in checked:
        if result['status'] != 'source-checked':
            continue
        school = schools[result['schoolId']]
        source = {k: result[k] for k in ('url', 'title', 'checkedAt', 'retrievedVia', 'sha256')}
        source['scope'] = result['level']
        source['kind'] = result['kind']
        school['admissionSources'].append(source)
        # General directories are useful links, not verified rules for every degree.
        levels = data['meta']['levels'] if result['kind'] == 'english-standard' else [] if result['level'] == 'all' else ['master', 'phd'] if result['level'] == 'graduate' else [result['level']]
        if result['kind'] == 'program':
            pid = re.sub(r'[^a-z0-9]+', '-', result['name'].lower()).strip('-')
            existing = next((p for p in school['programs'] if p['id'] == pid), None)
            if existing:
                existing['sources'].append(source)
                existing['sourceExcerpts'].extend(result['excerpts'])
            else:
                school['programs'].append({'id': pid, 'name': result['name'], 'subject': result['subject'], 'level': result['level'], 'status': 'source-checked', 'gpa': None, 'english': None, 'deadline': None, 'documents': None, 'sources': [source], 'sourceExcerpts': result['excerpts']})
            continue
        if result['kind'] == 'directory':
            continue
        for level in levels:
            if school['requirements'][level] is None:
                school['requirements'][level] = {'scope': 'institution', 'status': 'source-checked', 'gpa': None, 'english': None, 'deadline': None, 'documents': None, 'sources': [], 'sourceExcerpts': []}
            req = school['requirements'][level]
            req['sources'].append(source)
            req['sourceExcerpts'].extend(result['excerpts'])
    if reviewed_path.exists():
        for entry in reviewed['entries']:
            if entry["schoolId"] not in schools:
                continue
            school = schools[entry['schoolId']]
            target = school['requirements'][entry['level']] if entry.get('programId') is None else next((p for p in school['programs'] if p['id'] == entry['programId']), None)
            if target is None:
                continue
            current_urls = {item["url"]: item for item in checked if item["schoolId"] == entry["schoolId"] and item["status"] == "source-checked"}
            if not review_is_current(entry, current_urls):
                target["reviewState"] = "source-changed-or-unavailable"
                continue
            for field in ('gpa', 'english', 'deadline', 'documents', 'notes', 'intake', 'reviewedAt', 'fieldSources'):
                if field in entry:
                    target[field] = entry[field]
            checked_urls = {s['url']: s for s in school['admissionSources']}
            for url in set(entry.get('fieldSources', {}).values()):
                if url not in checked_urls:
                    raise ValueError('Reviewed field references an unchecked source: ' + url)
                if not any(s['url'] == url for s in target['sources']):
                    target['sources'].append(checked_urls[url])
            target['status'] = 'reviewed'
    coverage = data['meta']['coverage']
    coverage.update({'admissionSchools': sum(bool(s['admissionSources']) for s in schools.values()), 'checkedAdmissionSources': sum(c['status'] == 'source-checked' for c in checked), 'unavailableAdmissionSources': sum(c['status'] != 'source-checked' for c in checked), 'programs': sum(len(s['programs']) for s in schools.values()), 'reviewedRequirementRecords': sum(r is not None and r['status'] == 'reviewed' for s in schools.values() for r in list(s['requirements'].values()) + s['programs'])})
    data['meta']['generatedAt'] = datetime.now(timezone.utc).isoformat(timespec='seconds')
    data_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (ROOT / 'data' / 'admissions' / 'checks.json').write_text(json.dumps({'sources': checked}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    reviewed_path.write_text(json.dumps(reviewed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(coverage, ensure_ascii=False), flush=True)

def review_is_current(entry, current_urls):
    for url in set(entry.get("fieldSources", {}).values()):
        current = current_urls.get(url)
        baseline = entry.get("sourceFingerprints", {}).get(url)
        if not current or not baseline:
            return False
        field = "contentSha256" if baseline.get("contentSha256") and current.get("contentSha256") else "sha256"
        if baseline.get(field) != current.get(field):
            return False
    return bool(entry.get("fieldSources"))


if __name__ == '__main__':
    main()
