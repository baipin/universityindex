"""Discover admissions directories on institutional websites, without inventing requirements.

Only links actually present on the institution's homepage are candidates.
Directory pages are checked by collect_admissions.py and never converted to
university-wide GPA or language thresholds.
"""
import concurrent.futures
from datetime import datetime, timezone
import json
import re
from urllib.parse import urljoin, urlparse, urlunparse
from bs4 import BeautifulSoup
from fetch_sources import ROOT, fetch

WEBSITES = {
    'qs-383': 'https://www.um.edu.my/',
    'qs-779': 'https://www.kfupm.edu.sa/',
    'qs-34362': 'https://www.sorbonne-universite.fr/en',
    'qs-167': 'https://www.tcd.ie/',
    'qs-78': 'https://www.uba.ar/',
    'qs-693': 'https://www.uzh.ch/en.html',
    'qs-646': 'https://www.uu.nl/en',
    'qs-418': 'https://www.msu.ru/en/',
    'qs-282': 'https://home.iitd.ac.in/',
    'qs-107': 'https://www.uc.cl/',
    'qs-386': 'https://www.usm.my/',
    'qs-384': 'https://www.ukm.my/portalukm/',
    'qs-281': 'https://www.iitb.ac.in/',
    'qs-385': 'https://www.upm.edu.my/',
    'qs-425': 'https://www.unam.mx/',
    'qs-22873': 'https://www.ku.ac.ae/',
    'us-505700': 'https://www.uab.cat/',
    'us-223223': 'https://www.bcm.edu/',
    'us-193405': 'https://icahn.mssm.edu/',
    'us-510489': 'https://www.kaust.edu.sa/',
    'us-195049': 'https://www.rockefeller.edu/',
    'us-529428': 'https://www.sustech.edu.cn/en/',
    'us-110699': 'https://www.ucsf.edu/',
    'us-529679': 'https://english.ucas.ac.cn/',
    'us-126614': 'https://www.colorado.edu/',
    'us-215293': 'https://www.pitt.edu/',
    'us-228635': 'https://www.utsouthwestern.edu/',
    'us-234076': 'https://www.virginia.edu/',
    'us-529677': 'https://u-paris.fr/en/',
    'us-503987': 'https://en.xjtu.edu.cn/',
    'qs-268': 'https://www.hku.hk/',
    'qs-40': 'https://www.anu.edu.au/',
    'qs-643': 'https://www.uu.se/en',
    'qs-141': 'https://www.ku.dk/english/',
}

def institution_domain(url):
    host = (urlparse(url).hostname or '').lower()
    labels = host.split('.')
    suffix = '.'.join(labels[-2:])
    count = 3 if suffix in {'ac.uk', 'edu.au', 'edu.cn', 'edu.hk', 'ac.jp', 'ac.kr', 'ac.nz', 'edu.my', 'edu.sg', 'edu.tw', 'edu.sa', 'ac.za', 'com.br', 'ac.in', 'ac.ae'} else 2
    return '.'.join(labels[-count:])

def discover(school):
    website = WEBSITES.get(school['id']) or school.get('website')
    if not website:
        return school['id'], None, [], 'No homepage resolved'
    try:
        raw = fetch(website)
        soup = BeautifulSoup(raw, 'html.parser')
        title = soup.title.get_text(' ', strip=True) if soup.title else ''
        if re.search(r'404|not found|forbidden|just a moment|access denied|human verification', title, re.I):
            raise ValueError(title)
        domain = institution_domain(website)
        links = {}
        for anchor in soup.find_all('a', href=True):
            url = urljoin(website, anchor['href'])
            parsed = urlparse(url)
            if parsed.scheme not in ('https', 'http') or institution_domain(url) != domain:
                continue
            url = urlunparse(parsed._replace(fragment=''))
            text = anchor.get_text(' ', strip=True)
            value = text + ' ' + parsed.path
            if not re.search(r'admiss|prospective|apply|招生|申請|申请|入学', value, re.I):
                continue
            if re.search(r'job|career|vacan|alumni|news|event|.pdf$|donat|privacy|cookie', value, re.I):
                continue
            score = 5 * bool(re.search('admiss|招生|入学', value, re.I)) + 3 * bool(re.search('prospective|apply|申请|申請', value, re.I)) - len(parsed.path) / 80
            links[url] = (score, text)
        chosen = sorted(links.items(), key=lambda item: (-item[1][0], item[0]))[:1]
        return school['id'], website, [{'school': school['name'], 'level': 'all', 'kind': 'directory', 'url': url, 'discoveredFrom': website, 'linkText': value[1]} for url, value in chosen], None
    except Exception as error:
        return school['id'], None, [], str(error)

def main():
    data_path = ROOT / 'data' / 'universities.json'
    catalog_path = ROOT / 'data' / 'admissions' / 'catalog.json'
    data = json.loads(data_path.read_text(encoding='utf-8'))
    catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
    eligible = [s for s in data['schools'] if not s.get('admissionSources') or s['id'] in WEBSITES]
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
        for result in pool.map(discover, eligible):
            results.append(result)
            print(result[0], result[1], len(result[2]), result[3] or '', flush=True)
    # Read again after fetching, so other in-flight read-only checks cannot overwrite newer data.
    data = json.loads(data_path.read_text(encoding='utf-8'))
    schools = {s['id']: s for s in data['schools']}
    seen = {source['url'] for source in catalog['sources']}
    now = datetime.now(timezone.utc).isoformat(timespec='seconds')
    for sid, website, sources, error in results:
        if website:
            schools[sid]['website'] = website
            schools[sid]['websiteProvenance'] = {'source': website, 'checkedAt': now}
        for source in sources:
            if source['url'] not in seen:
                catalog['sources'].append(source)
                seen.add(source['url'])
    data_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Catalog now contains', len(catalog['sources']), 'sources', flush=True)

if __name__ == '__main__':
    main()
