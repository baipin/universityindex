"""Import publisher rankings, preserving edition, ties, bands and provenance.

QS China is QS's official regional site. Its public data files share stable
core_id identifiers across overall and subject tables. US News is read from
the publisher's public pages via Jina Reader when direct requests time out.
No third-party ranking lists or inferred ranks are used.
"""
from __future__ import annotations
import concurrent.futures
import argparse
import os
from datetime import datetime, timezone
import hashlib
import html
import json
from pathlib import Path
import re
import time
import unicodedata
from fetch_sources import CACHE, ROOT, fetch, next_data, find_values
from discover_editions import discover, subject_paths, qs_edition_matches
from localize_catalog import localize

QS_HOST = 'https://www.qs-topuniversities.cn'
US_PAGE = 'https://www.usnews.com/education/best-global-universities/rankings'
COUNTRIES = {'United States': '美国', 'United Kingdom': '英国', 'China (Mainland)': '中国内地', 'China': '中国内地', 'Hong Kong SAR': '中国香港', 'Hong Kong': '中国香港', 'Singapore': '新加坡', 'Australia': '澳大利亚', 'Canada': '加拿大', 'Germany': '德国', 'France': '法国', 'Switzerland': '瑞士', 'Netherlands': '荷兰', 'Japan': '日本', 'South Korea': '韩国', 'Sweden': '瑞典', 'Denmark': '丹麦', 'Belgium': '比利时', 'Finland': '芬兰', 'Norway': '挪威', 'New Zealand': '新西兰', 'Ireland': '爱尔兰', 'Italy': '意大利', 'Spain': '西班牙', 'Austria': '奥地利', 'Taiwan': '中国台湾', 'Taiwan (China)': '中国台湾', 'Malaysia': '马来西亚', 'Saudi Arabia': '沙特阿拉伯', 'United Arab Emirates': '阿联酋', 'South Africa': '南非', 'Brazil': '巴西', 'Chile': '智利', 'Mexico': '墨西哥', 'Israel': '以色列', 'Russia': '俄罗斯', 'India': '印度', 'Luxembourg': '卢森堡', 'Portugal': '葡萄牙'}
ALIASES = {
    'nanyang technological university singapore ntu': 'nanyang technological university',
    'chinese university of hong kong cuhk': 'chinese university of hong kong',
    'chinese university hong kong': 'chinese university of hong kong',
    'city university hong kong': 'city university of hong kong',
    'new york university nyu': 'new york university',
    'national taiwan university ntu': 'national taiwan university',
    'free university of berlin': 'freie universitat berlin',
    'freie universitaet berlin': 'freie universitat berlin',
    'humboldt universitat zu berlin': 'humboldt university of berlin',
    'kit karlsruhe institute of technology': 'karlsruhe institute of technology',
    'ruprecht karls universitat heidelberg': 'heidelberg university',
    'universitat heidelberg': 'heidelberg university',
    'paris sciences et lettres psl research university paris': 'psl research university paris',
    'psl research university paris comue': 'psl research university paris',
    'penn state main campus': 'pennsylvania state university',
    'purdue university west lafayette': 'purdue university',
    'alma mater studiorum university of bologna': 'university of bologna',
    'university of california san diego ucsd': 'university of california san diego',
    'university of minnesota twin cities': 'university of minnesota',
    'university of queensland australia': 'university of queensland',
    'university of science technology of china cas': 'university of science and technology of china',
    'universidade de sao paulo': 'university of sao paulo',
    'yonsei university seoul campus': 'yonsei university',
    'ecole polytechnique federale of lausanne': 'epfl',
    'wageningen university research': 'wageningen university and research',
    'wageningen university and research center': 'wageningen university and research',
    'ohio state university columbus': 'ohio state university',
    'osaka university': 'university of osaka',
    'massachusetts institute of technology mit': 'massachusetts institute of technology',
    'california institute of technology caltech': 'california institute of technology',
    'ucl': 'university college london',
    'eth zurich swiss federal institute of technology': 'eth zurich',
    'epfl ecole polytechnique federale de lausanne': 'epfl',
    'ecole polytechnique federale de lausanne': 'epfl',
    'national university of singapore nus': 'national university of singapore',
    'nanyang technological university singapore ntu singapore': 'nanyang technological university',
    'nanyang technological university singapore': 'nanyang technological university',
    'university of california berkeley ucb': 'university of california berkeley',
    'university of california los angeles ucla': 'university of california los angeles',
    'university of illinois at urbana champaign': 'university of illinois urbana champaign',
    'university of illinois urbana champaign uiuc': 'university of illinois urbana champaign',
    'university of texas at austin': 'university of texas austin',
    'pennsylvania state university university park': 'pennsylvania state university',
    'university of pennsylvania penn': 'university of pennsylvania',
    'kaist korea advanced institute of science technology': 'korea advanced institute of science and technology kaist',
    'kth royal institute of technology': 'kth royal institute of technology',
    'king s college london': 'kings college london',
    'london school of economics and political science lse': 'london school of economics and political science',
    'ludwig maximilians universitat munchen': 'lmu munich',
    'ludwig maximilians university munich': 'lmu munich',
    'university of munich': 'lmu munich',
    'universite psl': 'psl research university paris',
    'psl universite paris': 'psl research university paris',
    'sorbonne universite': 'sorbonne university',
    'universite paris saclay': 'universite paris saclay',
    'technical university of denmark dtu': 'technical university of denmark',
    'university of science and technology of china': 'university of science and technology of china',
    'university of north carolina at chapel hill': 'university of north carolina chapel hill',
    'hong kong university of science and technology': 'hong kong university of science and technology',
    'city university of hong kong cityuhk': 'city university of hong kong',
    'karlsruhe institute of technology kit': 'karlsruhe institute of technology',
    'pohang university of science and technology postech': 'pohang university of science and technology postech',
    'university of technology sydney uts': 'university of technology sydney',
    'universiti malaya um': 'universiti malaya',
    'king saud university': 'king saud university',
    'king abdulaziz university kau': 'king abdulaziz university',
    'king fahd university of petroleum minerals': 'king fahd university of petroleum and minerals',
    'university of new south wales unsw sydney': 'unsw sydney',
    'unsw sydney university of new south wales': 'unsw sydney',
    'university of new south wales': 'unsw sydney',
    'ohio state university main campus': 'ohio state university',
    'rutgers university new brunswick': 'rutgers university new brunswick',
    'texas a m university': 'texas a and m university',
    'texas a m university college station': 'texas a and m university',
    'university of maryland college park': 'university of maryland college park',
    'universite de montreal': 'university of montreal',
    'universite paris cite': 'universite paris cite',
    'hong kong polytechnic university': 'hong kong polytechnic university',
}

def clean(value):
    return html.unescape(re.sub('<[^>]+>', '', str(value))).strip()

def key(name):
    value = unicodedata.normalize('NFKD', html.unescape(name)).encode('ascii', 'ignore').decode().lower()
    value = re.sub(r'[^a-z0-9]+', ' ', value).strip()
    value = re.sub(r'^the ', '', value)
    return ALIASES.get(value, value)

def rank_number(value):
    match = re.match(r'=?([0-9]+)(?:$|[–—-])', str(value).strip())
    return int(match.group(1)) if match else None

def qs_data(page):
    source = fetch(page)
    match = re.search(r'"rank_url":"([^"]+)"', source)
    if not match:
        raise ValueError('No QS data URL on ' + page)
    url = json.loads('"' + match.group(1) + '"')
    english_url = url.replace('/cn/', '/en/')
    raw = fetch(english_url)
    return json.loads(raw)['data'], english_url, raw


def us_pages(refresh):
    pages = []
    for page in range(1, 17):
        url = US_PAGE + ("?page=" + str(page) if page > 1 else "")
        cached = CACHE / ("jinaus.html" if page == 1 else "us2.html" if page == 2 else "us" + str(page) + ".md")
        if cached.exists() and not refresh:
            raw = cached.read_text(encoding="utf-8")
        else:
            if page > 1:
                time.sleep(3.2)
            raw = fetch("https://r.jina.ai/" + url)
        pages.append((url, raw))
    return pages

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--discover-latest", action="store_true")
    parser.add_argument("--refresh", action="store_true")
    args = parser.parse_args()
    if args.refresh:
        os.environ["UINDEX_REFRESH"] = "1"
    edition_path = ROOT / "data" / "ranking-editions.json"
    editions = json.loads(edition_path.read_text(encoding="utf-8"))
    warnings = []
    if args.discover_latest:
        editions, warnings = discover(editions)
        for warning in warnings:
            print("Edition probe (not yet confirmed):", warning, flush=True)
    qs_page, the_page = editions["qs"]["source"], editions["the"]["source"]
    old = json.loads((ROOT / "data" / "universities.json").read_text(encoding="utf-8"))
    previous = {s["id"]: s for s in old["schools"]}
    previous_identity = {(key(s["name"]), s["country"]): s["id"] for s in old["schools"]}
    now = datetime.now(timezone.utc).isoformat(timespec='seconds')
    output = ROOT / 'data' / 'rankings'
    output.mkdir(exist_ok=True)
    sources = []
    schools = {}
    by_key = {}
    def source_record(rid, name, year, scope, page, transport, raw, rows, **extra):
        record = {'id': rid, 'name': name, 'year': year, 'scope': scope, 'source': page, 'dataSource': transport, 'checkedAt': now, 'sha256': hashlib.sha256(raw.encode()).hexdigest(), 'status': 'verified', **extra}
        sources.append(record)
        (output / (rid + '.json')).write_text(json.dumps({'meta': record, 'rows': rows}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    def add(sid, name, country, rid, label, **extra):
        canonical = key(name)
        country = {'China (Mainland)': 'China', 'Hong Kong SAR': 'Hong Kong', 'Taiwan (China)': 'Taiwan'}.get(country, country)
        existing = by_key.get((canonical, country))
        sid = existing or previous_identity.get((canonical, country)) or sid
        if sid not in schools:
            schools[sid] = {'id': sid, 'name': name, 'nameZh': None, 'country': country, 'countryZh': COUNTRIES.get(country, country), 'website': None, 'ranks': {}, 'rankLabels': {}, 'rankProfiles': {}, 'requirements': {'undergraduate': None, 'master': None, 'phd': None}, 'programs': []}
        school = schools[sid]
        if rid in school['ranks']:
            raise ValueError('Duplicate rank identity ' + name + ' / ' + rid)
        school['ranks'][rid] = rank_number(label)
        school['rankLabels'][rid] = label
        school.update(extra)
        by_key[(canonical, country)] = sid
        return school
    rows, qs_url, raw = qs_data(qs_page)
    if not qs_edition_matches(fetch(qs_page), editions["qs"]["year"]):
        raise ValueError("QS page does not identify the requested edition")
    chinese = json.loads(fetch(qs_url.replace('/en/', '/cn/')))['data']
    names_zh = {r['core_id']: clean(r['title']) for r in chinese}
    qs_rows = []
    for row in rows:
        rank = rank_number(row['rank_display'])
        if rank is None or rank > 150:
            continue
        name = clean(row['title'])
        school = add('qs-' + row['core_id'], name, row['country'], 'qs', row['rank_display'], nameZh=names_zh.get(row['core_id']))
        href = re.search(r'href="([^"]+)"', row['title'])
        school['rankProfiles']['qs'] = QS_HOST + href.group(1) if href else qs_page
        qs_rows.append({'schoolId': school['id'], 'name': name, 'country': school['country'], 'rank': rank, 'rankLabel': row['rank_display']})
    source_record('qs', 'QS World University Rankings', editions["qs"]["year"], 'global', qs_page, qs_url, raw, qs_rows)
    print('Imported QS:', len(qs_rows), flush=True)
    # Explicit edition is the persisted source, even when the latest redirect was used for discovery.
    raw_the = fetch(the_page)
    config = list(find_values(next_data(raw_the), 'rankingsTableConfig'))[0]
    if str(config['year']) != editions["the"]["year"]:
        raise ValueError('Unexpected THE edition')
    the_rows = []
    for row in config['rankingsData']['data']:
        rank = rank_number(row['rank'])
        if rank is None or rank > 150:
            continue
        school = add('the-' + str(row['nid']), row['name'], row['location'], 'the', row['rank'])
        school['rankProfiles']['the'] = 'https://www.timeshighereducation.com' + row['url']
        the_rows.append({'schoolId': school['id'], 'name': row['name'], 'country': school['country'], 'rank': rank, 'rankLabel': row['rank']})
    source_record('the', 'Times Higher Education World University Rankings', editions["the"]["year"], 'global', the_page, config['jsonUrl'], raw_the, the_rows)
    print('Imported THE:', len(the_rows), flush=True)
    us_rows = []
    us_raw = []
    seen_us = set()
    pages = []
    if not editions["usnews"].get("unavailable"):
        try:
            pages = us_pages(args.refresh)
        except Exception as error:
            editions["usnews"]["unavailable"] = str(error)
            warnings.append("US News download failed; preserving verified snapshot: " + str(error))
    retained_publishers = ["usnews"] if editions["usnews"].get("unavailable") else []
    for url, raw in pages:
        us_raw.append(raw)
        for match in re.finditer(r'^## \[([^\n]+?)\]\((https://www\.usnews\.com/education/best-global-universities/[^)]+)\)(.*?)(?=^## |\Z)', raw, re.M | re.S):
            name, profile, body = match.groups()
            if profile in seen_us:
                continue
            ranked = re.search(r'\[\*\*#([0-9]+)\*\* in\*\*Best Global Universities([^*]*)\*\*', body)
            country = re.search(r'\)\s*([^\n|]+)\|', body)
            if not ranked or not country:
                continue
            rank = int(ranked.group(1))
            if rank > 150:
                continue
            seen_us.add(profile)
            label = ('=' if 'tie' in ranked.group(2) else '') + str(rank)
            school = add('us-' + profile.rsplit('-', 1)[-1], name, country.group(1).strip(), 'usnews', label)
            school['rankProfiles']['usnews'] = profile
            us_rows.append({'schoolId': school['id'], 'name': name, 'country': school['country'], 'rank': rank, 'rankLabel': label, 'source': url})
    if editions["usnews"].get("unavailable"):
        retained = json.loads((output / "usnews.json").read_text(encoding="utf-8"))
        editions["usnews"]["year"] = retained["meta"]["year"]
        for row in retained["rows"]:
            school = add(row["schoolId"], row["name"], row["country"], "usnews", row["rankLabel"])
            if row["schoolId"] in previous:
                school["rankProfiles"]["usnews"] = previous[row["schoolId"]].get("rankProfiles", {}).get("usnews", US_PAGE)
            us_rows.append({**row, "schoolId": school["id"]})
        sources.append(retained["meta"])
        editions["usnews"].pop("unavailable")
    else:
        source_record('usnews', 'U.S. News Best Global Universities', editions["usnews"]["year"], 'global', US_PAGE, 'https://r.jina.ai/' + US_PAGE, '\n'.join(us_raw), us_rows, editionSource=editions["usnews"]["editionSource"])
    if len(us_rows) < 150:
        raise ValueError('Incomplete US News import: ' + str(len(us_rows)))
    print('Imported US News:', len(us_rows), flush=True)
    # Resolve subject identities for globally eligible institutions outside the QS top 150.
    qs_ids = {}
    for row in rows:
        country = {'China (Mainland)': 'China', 'Hong Kong SAR': 'Hong Kong', 'Taiwan (China)': 'Taiwan'}.get(row['country'], row['country'])
        sid = by_key.get((key(clean(row['title'])), country))
        if sid:
            qs_ids[row['core_id']] = sid
            schools[sid]['nameZh'] = names_zh.get(row['core_id'])
            href = re.search(r'href="([^"]+)"', row['title'])
            if href:
                schools[sid]['rankProfiles']['qs'] = QS_HOST + href.group(1)
    for row in config['rankingsData']['data']:
        country = {'China (Mainland)': 'China', 'Hong Kong SAR': 'Hong Kong', 'Taiwan (China)': 'Taiwan'}.get(row['location'], row['location'])
        sid = by_key.get((key(row['name']), country))
        if sid:
            schools[sid]['rankProfiles']['the'] = 'https://www.timeshighereducation.com' + row['url']
    hub = fetch(editions["subjects"]["source"])
    paths = subject_paths(hub, editions["subjects"]["year"])
    def subject(path):
        subject_rows, transport, raw = qs_data(QS_HOST + path)
        return path.rsplit('/', 1)[-1], subject_rows, transport, raw
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for slug, subject_rows, transport, raw in pool.map(subject, paths):
            rid = 'qs-' + ('cs' if slug == 'computer-science-and-information-systems' else slug)
            title = slug.replace('-', ' ').title()
            normalized = []
            for row in subject_rows:
                sid = qs_ids.get(row['core_id'])
                rank = rank_number(row['rank_display'])
                # Subject tables describe the globally eligible school pool, not a new invented global top 150.
                if sid not in schools or rank is None or rank > 150:
                    continue
                schools[sid]['ranks'][rid] = rank
                schools[sid]['rankLabels'][rid] = row['rank_display']
                normalized.append({'schoolId': sid, 'name': schools[sid]['name'], 'rank': rank, 'rankLabel': row['rank_display']})
            source_record(rid, 'QS by Subject', editions['subjects']['year'], 'subject', QS_HOST + '/university-rankings/university-subject-rankings/' + editions['subjects']['year'] + '/' + slug, transport, raw, normalized, subject=title, eligiblePool='Global top 150 union (QS / THE / US News); subject ranks up to 150 only')
            print('Imported subject:', slug, len(normalized), flush=True)
    old = json.loads((ROOT / 'data' / 'universities.json').read_text(encoding='utf-8'))
    previous = {s['id']: s for s in old['schools']}
    for sid, school in schools.items():
        if sid in previous:
            for field in ('website', 'websiteProvenance', 'requirements', 'programs', 'admissionSources'):
                if field in previous[sid]:
                    school[field] = previous[sid][field]
    data = {'_notice': 'Real publisher rankings. Admissions coverage is partial: null means not yet verified, not no requirement. University-wide rules and specific programmes are kept separate. Subject views cover schools in the global top-150 union, not every subject-only institution.', 'meta': {'schemaVersion': 2, 'status': 'partial', 'verified': False, 'generatedAt': now, 'rankLimit': 150, 'rankings': sources, 'levels': ['undergraduate', 'master', 'phd'], 'coverage': {'schools': len(schools), 'globalRankings': {rid: sum(rid in s['ranks'] for s in schools.values()) for rid in ('qs', 'the', 'usnews')}, 'subjects': len(paths), 'scope': f"Union of schools ranked 1–150 globally in QS {editions['qs']['year']}, THE {editions['the']['year']} or US News {editions['usnews']['year']}. Subject views are restricted to this pool."}}, 'schools': sorted(schools.values(), key=lambda s: (s['ranks'].get('qs', 9999), s['name']))}
    localize(data)
    (ROOT / 'data' / 'universities.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    edition_path.write_text(json.dumps(editions, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    CACHE.mkdir(exist_ok=True)
    (CACHE / "ranking-report.json").write_text(json.dumps({"warnings": warnings, "retainedPublishers": retained_publishers}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(data['meta']['coverage'], ensure_ascii=False), flush=True)

if __name__ == '__main__':
    main()
