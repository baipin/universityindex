"""Find and maintain official degree/entry-requirement lookup links.

A linked URL is evidence of an official navigation route, not verification of
scores or deadlines. Portal records never populate academic requirement fields.
"""
from __future__ import annotations
import argparse
import concurrent.futures
from datetime import datetime, timezone
import hashlib
import json
import re
from urllib.parse import urljoin, urlparse, urlunparse
from urllib.request import Request, urlopen
from bs4 import BeautifulSoup
from fetch_sources import ROOT, CACHE
from discover_admissions import institution_domain, WEBSITES

INTEREST = re.compile(r'admiss|entry.require|course|program|degree|prospective|apply|stud(?:y|ies|ium|ien)|bewerb|zulass|formation|etud|estudio|grado|招生|入学|入學|課程|课程|学位|學位|大学院|學部|学部', re.I)
EXCLUDE = re.compile(r'career|jobs?\b|vacanc|staff|alumni|news\b|events?\b|donat|privacy|cookie|contact|summer|short.course|single.course|individual.course|apply.for.erc|grants?\b|housing|accommodation|continuing.education|fee.payment|fee.waiver|teaching.position', re.I)
ERROR_PAGE = re.compile(r'404|page not found|not found|access denied|forbidden|just a moment|security check|human verification|robot or human|error 40[034]', re.I)
# Exclude non-degree material and articles even when their titles mention courses.
EXCLUDE = re.compile(EXCLUDE.pattern + r'|non.degree|exchange|study.abroad|professional.development|cpd\b|open.course|program.administration|finance.your|fees|freedom.of.information|research.program|scholarship|parent|families|kindergarten|幼儿园|教培|继续教育|课程思政|研讨会|national.talent|risk.management|karriere|berufung|alumnos|im-studium|mobilit|erstesemester|syllabus|enrichment|recruiter|pittwire|uniaktuell|brand-vignettes|/posts/|/stories/|/neues/|/info/|/202[0-9]/|news\.|careers\.|roads\.|newstudents\.|sonntagsvorlesung|honours|residency|community/|course-obligations|/registro|/visit|kennenlern|/national/|/uits|教培|worldfellows|life-at-uchicago|/innovation/|/language/programs|professional-studies|/inclusion|/surf/|refresher|aggiornamento|/orientation|programmes-courts|/ciel|/ecourse|ecourse\.|/investigacion/|berufseinstieg|fellowship-program|student-experience|familie\.|/social/|/research/|/fe\.pku|fe\.pku', re.I)
ERROR_PAGE = re.compile(ERROR_PAGE.pattern + r'|access blocked|request rejected|making sure|webserver.wartung|attention required|pàgina no trobada', re.I)
LEVELS = ('undergraduate', 'master', 'phd', 'graduate', 'all')

def now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')

def read(url, refresh=False):
    CACHE.mkdir(exist_ok=True)
    cached = CACHE / (hashlib.sha256(url.encode()).hexdigest() + '.html')
    if cached.exists() and not refresh:
        return cached.read_text(encoding='utf-8')
    request = Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en'})
    with urlopen(request, timeout=12) as response:
        if 'pdf' in response.headers.get('Content-Type', ''):
            raise ValueError('PDF needs a separate document review')
        payload = response.read(5_000_000)
        if response.headers.get('Content-Encoding') == 'gzip' or payload.startswith(b'\x1f\x8b'):
            import gzip
            payload = gzip.decompress(payload)
        raw = payload.decode(response.headers.get_content_charset() or 'utf-8', errors='replace')
    cached.write_text(raw, encoding='utf-8')
    return raw

def document(url, refresh=False):
    def parse(raw):
        soup = BeautifulSoup(raw, 'html.parser')
        title = raw.splitlines()[0].removeprefix('Title:').strip() if raw.startswith('Title:') else soup.title.get_text(' ', strip=True) if soup.title else ''
        if not title or ERROR_PAGE.search(title) or len(raw) < 200 or raw.count('\ufffd') > len(raw) / 50 or re.search(r'Warning: Target URL returned error (?:40[034]|50[023])', raw):
            raise ValueError('Invalid page: ' + title)
        return raw, soup, title
    try:
        return parse(read(url, refresh))
    except Exception:
        # A cached reader copy is useful for initial discovery, never a fresh check.
        path = CACHE / (hashlib.sha256(('https://r.jina.ai/' + url).encode()).hexdigest() + '.html')
        if refresh or not path.exists():
            raise
        return parse(path.read_text(encoding='utf-8'))

def anchors(raw, soup, base):
    if raw.startswith('Title:'):
        values = [(label, urljoin(base, href)) for label, href in re.findall(r'\[([^]\n]+)\]\((https?://[^)\s]+|/[^)\s]+)\)', raw)]
    else:
        values = [(a.get_text(' ', strip=True) or a.get('aria-label', ''), urljoin(base, a['href'])) for a in soup.select('a[href]')]
    result = []
    for label, url in values:
        p = urlparse(url)
        url = urlunparse(p._replace(fragment=''))
        if p.scheme not in ('http', 'https') or p.path.lower().endswith(('.pdf', '.jpg', '.png', '.zip')):
            continue
        if institution_domain(url) != institution_domain(base):
            continue
        value = label + ' ' + url
        if not INTEREST.search(value) or EXCLUDE.search(value) or url.rstrip('/') == base.rstrip('/'):
            continue
        result.append((label, url))
    return result

def scope(label):
    if re.search(r'undergrad|bachelor|本科|学部|學部', label, re.I):
        return 'undergraduate'
    if re.search(r'ph\.?d|doctor|博士|promotion', label, re.I):
        return 'phd'
    if re.search(r'postgrad|graduate|研究生|大学院', label, re.I):
        return 'graduate'
    if re.search(r'master|硕士|碩士', label, re.I):
        return 'master'
    return 'all'

def score(label, url):
    value = label + ' ' + urlparse(url).path
    return (25 * bool(re.search(r'entry.require|admission.require|entrance.require|招生简章|招生簡章', value, re.I))
            + 20 * bool(re.search(r'course|program|degree|課程|课程|学位|學位', value, re.I))
            + 15 * bool(re.search(r'admiss|prospective|招生|入学|入學|zulass|bewerb', value, re.I))
            + 5 * bool(re.search(r'stud|apply|formation|etud', value, re.I))
            - len(urlparse(url).path) / 100)

def discover(school, old=None, refresh=False):
    homepage = WEBSITES.get(school['id']) or school.get('website')
    candidates = {}
    stamp = now()
    # Already checked official admissions/degree pages are valid routes too.
    for source in school.get('admissionSources', []):
        value = source['title'] + ' ' + source['url']
        if not source['title'] or source.get('kind') == 'program' or EXCLUDE.search(value) or not INTEREST.search(value):
            continue
        candidates[source['url']] = {'url': source['url'], 'label': source['title'], 'scope': source.get('scope') if source.get('scope') in LEVELS and source.get('scope') != 'all' else scope(value),
            'discoveredFrom': source['url'], 'checkedAt': source['checkedAt'], 'verification': 'page-checked',
            'verificationUrl': source['url'], 'sha256': source['sha256'], 'priority': score(source['title'], source['url']) + 15}
    # Prefer catalogue/navigation routes usable beyond the few indexed programmes.
    if homepage:
        try:
            raw, soup, title = document(homepage, refresh)
            for label, url in anchors(raw, soup, homepage):
                if url in candidates:
                    continue
                candidates[url] = {'url': url, 'label': label, 'scope': scope(label + ' ' + urlparse(url).path),
                    'discoveredFrom': homepage, 'checkedAt': stamp, 'verification': 'official-link',
                    'verificationUrl': homepage, 'sha256': hashlib.sha256(raw.encode()).hexdigest(), 'priority': score(label, url)}
        except Exception:
            pass
    curated = ROOT / 'data/admissions/portal-routes.json'
    if curated.exists():
        for route in json.loads(curated.read_text(encoding='utf-8')).get(school['id'], []):
            url = route['url']
            try:
                raw, soup, title = document(url, refresh)
                candidates[url] = {**route, 'label': title or route.get('label', ''), 'discoveredFrom': url,
                    'checkedAt': stamp, 'verification': 'page-checked', 'verificationUrl': url,
                    'sha256': hashlib.sha256(raw.encode()).hexdigest(), 'priority': 100}
            except Exception:
                prior = next((x for x in (old or {}).get('links', []) if x['url'] == url), None)
                if prior:
                    candidates[url] = {**prior, 'priority': 100, 'lastAttemptAt': stamp,
                                       'destinationCheck': 'Could not recheck destination; previous evidence retained'}
                else:
                    candidates[url] = {**route, 'discoveredFrom': url, 'verification': 'access-limited',
                                       'lastAttemptAt': stamp, 'destinationCheck': 'Destination could not be checked',
                                       'priority': 100}
    ranked = sorted(candidates.values(), key=lambda c: -c['priority'])
    chosen = []
    seen = set()
    for c in ranked:
        if c['scope'] in seen and len(chosen) >= 2:
            continue
        chosen.append(c)
        seen.add(c['scope'])
        if len(chosen) == 3:
            break
    # Check destination content where possible, retaining the distinction
    # between a live checked page and a URL linked by an official page.
    for c in chosen:
        if c['verification'] == 'official-link' or refresh:
            try:
                raw, soup, title = document(c['url'], refresh)
                if ERROR_PAGE.search(' '.join(soup.get_text(' ', strip=True).split())[:500]):
                    raise ValueError('Error response')
                c.update(verification='page-checked', verificationUrl=c['url'], checkedAt=stamp,
                         sha256=hashlib.sha256(raw.encode()).hexdigest(), label=title or c['label'])
            except Exception as error:
                c['destinationCheck'] = str(error)[:250]
                if old:
                    prior = next((x for x in old.get('links', []) if x['url'] == c['url']), None)
                    if prior:
                        c.update(prior)
                        c['destinationCheck'] = str(error)[:250]
        c.pop('priority', None)
    chosen = [c for c in chosen if not EXCLUDE.search(c['label'] + ' ' + c['url'])]
    if not chosen and old and old.get('links') and all(not EXCLUDE.search(x['url'] + ' ' + x['label']) for x in old['links']):
        return {**old, 'refreshError': 'Could not recheck official navigation; previous evidence retained'}
    return {'schoolId': school['id'], 'school': school['name'], 'links': chosen}

def apply(data, portals):
    by_id = {p['schoolId']: p for p in portals['schools']}
    for school in data['schools']:
        school['requirementLinks'] = by_id.get(school['id'], {}).get('links', [])
    data['meta']['coverage']['requirementLookupSchools'] = sum(bool(s['requirementLinks']) for s in data['schools'])
    data['meta']['coverage']['requirementLookupAccessLimitedSchools'] = sum(
        bool(s['requirementLinks']) and all(x['verification'] == 'access-limited' for x in s['requirementLinks'])
        for s in data['schools'])
    return data

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--refresh', action='store_true')
    parser.add_argument('--missing-only', action='store_true')
    parser.add_argument('--apply-only', action='store_true')
    args = parser.parse_args()
    path = ROOT / 'data/admissions/portals.json'
    data_path = ROOT / 'data/universities.json'
    data = json.loads(data_path.read_text(encoding='utf-8'))
    previous = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {'schools': []}
    old = {p['schoolId']: p for p in previous['schools']}
    if args.apply_only:
        portals = previous
    else:
        selected = [s for s in data['schools'] if not args.missing_only or not old.get(s['id'], {}).get('links')]
        updated = dict(old)
        def task(s):
            return discover(s, old.get(s['id']), args.refresh)
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
            for p in pool.map(task, selected):
                updated[p['schoolId']] = p
                print(p['schoolId'], len(p['links']), p['school'], flush=True)
        portals = {'schools': [updated[s['id']] for s in data['schools']]}
        path.write_text(json.dumps(portals, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    apply(data, portals)
    data_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Official requirement lookup:', data['meta']['coverage']['requirementLookupSchools'], '/', len(data['schools']), flush=True)

if __name__ == '__main__':
    main()
