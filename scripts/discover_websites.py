"""Resolve institutional homepages from THE's publisher profiles."""
import concurrent.futures
from datetime import datetime, timezone
import json
from urllib.parse import urlparse
from fetch_sources import ROOT, fetch, next_data, find_values

def main():
    path = ROOT / 'data' / 'universities.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    def resolve(school):
        profile = school.get('rankProfiles', {}).get('the')
        if not profile:
            return school['id'], None, 'No THE profile matched'
        try:
            document = next_data(fetch(profile))
            websites = list(find_values(document, 'website'))
            for website in websites:
                href = website.get('href') if isinstance(website, dict) else website if isinstance(website, str) else None
                if href and urlparse(href).scheme in ('http', 'https') and 'timeshighereducation.com' not in urlparse(href).netloc:
                    return school['id'], href, None
            return school['id'], None, 'No institutional homepage published'
        except Exception as error:
            return school['id'], None, str(error)
    resolved = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        for sid, website, error in pool.map(resolve, data['schools']):
            resolved[sid] = {'url': website, 'error': error}
            print(sid, website or error, flush=True)
    now = datetime.now(timezone.utc).isoformat(timespec='seconds')
    for school in data['schools']:
        result = resolved[school['id']]
        if result['url']:
            school['website'] = result['url']
            school['websiteProvenance'] = {'source': school['rankProfiles']['the'], 'checkedAt': now}
    (ROOT / '.cache' / 'websites.json').write_text(json.dumps(resolved, indent=2), encoding='utf-8')
    # This command is sequential with other dataset writes.
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Resolved', sum(bool(r['url']) for r in resolved.values()), 'of', len(resolved), flush=True)

if __name__ == '__main__':
    main()
