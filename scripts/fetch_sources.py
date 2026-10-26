"""Fetch public source pages with a local cache; never infer missing facts."""
from __future__ import annotations
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import re
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.cache'

def fetch(url, refresh=False):
    CACHE.mkdir(exist_ok=True)
    path = CACHE / (hashlib.sha256(url.encode()).hexdigest() + '.html')
    if path.exists() and not refresh:
        return path.read_text(encoding='utf-8')
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36', 'Accept-Language': 'en'})
    with urllib.request.urlopen(request, timeout=25) as response:
        content = response.read().decode('utf-8', errors='replace')
    path.write_text(content, encoding='utf-8')
    return content

def next_data(html):
    match = re.search(r'<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not match:
        raise ValueError('Publisher page does not contain __NEXT_DATA__')
    return json.loads(match.group(1))

def find_values(value, key):
    if isinstance(value, dict):
        if key in value:
            yield value[key]
        for child in value.values():
            yield from find_values(child, key)
    elif isinstance(value, list):
        for child in value:
            yield from find_values(child, key)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('urls', nargs='+')
    parser.add_argument('--refresh', action='store_true')
    args = parser.parse_args()
    def check(url):
        try:
            html = fetch(url, args.refresh)
            title = re.search(r'<title[^>]*>(.*?)</title>', html, re.S)
            return {'url': url, 'bytes': len(html), 'title': title.group(1) if title else None}
        except Exception as error:
            return {'url': url, 'error': str(error)}
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        for result in pool.map(check, args.urls):
            print(json.dumps(result, ensure_ascii=False), flush=True)
