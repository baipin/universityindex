"""Discover published editions from official pages, never from calendar alone."""
from __future__ import annotations
from copy import deepcopy
from datetime import datetime, timezone
import re
from bs4 import BeautifulSoup
from fetch_sources import fetch, find_values, next_data


def qs_edition_matches(raw, year):
    soup = BeautifulSoup(raw, "html.parser")
    heading = " ".join(node.get_text(" ", strip=True) for node in soup.select("title, h1"))
    return str(year) in heading and bool(re.search(r'"rank_url":"([^" ]+)"', raw))


def subject_paths(raw, year):
    pattern = r'href="(/university-rankings/university-subject-rankings/' + re.escape(str(year)) + r'/[^"?#]+)"'
    return sorted(set(re.findall(pattern, raw)))


def usnews_edition(raw):
    if raw.startswith("Title:"):
        text = raw.split("Markdown Content:", 1)[-1]
    else:
        soup = BeautifulSoup(raw, "html.parser")
        for node in soup(["script", "style", "nav", "header", "footer"]):
            node.decompose()
        text = (soup.find("main") or soup).get_text(" ", strip=True)
    found = re.search(r"\b(20\d{2})\s*[–—-]\s*(20\d{2})\b", text[:20000])
    if not found or int(found[2]) != int(found[1]) + 1:
        raise ValueError("US News official article has no explicit consecutive-year edition")
    return found[1] + "–" + found[2]


def discover(current):
    result = deepcopy(current)
    warnings = []
    limit = datetime.now(timezone.utc).year + 2
    for year in range(limit, int(current["qs"]["year"]), -1):
        url = f"https://www.qs-topuniversities.cn/university-rankings/world-university-rankings/{year}"
        try:
            if qs_edition_matches(fetch(url), year):
                result["qs"] = {"year": str(year), "source": url}
                break
        except Exception as error:
            warnings.append(f"QS {year}: {error}")
    for year in range(limit, int(current["the"]["year"]), -1):
        url = f"https://www.timeshighereducation.com/world-university-rankings/{year}/world-ranking"
        try:
            configs = list(find_values(next_data(fetch(url)), "rankingsTableConfig"))
            if configs and str(configs[0].get("year")) == str(year) and configs[0].get("rankingsData", {}).get("data"):
                result["the"] = {"year": str(year), "source": url}
                break
        except Exception as error:
            warnings.append(f"THE {year}: {error}")
    for year in range(limit - 1, int(current["subjects"]["year"]), -1):
        url = f"https://www.qs-topuniversities.cn/subject-rankings/{year}"
        try:
            paths = subject_paths(fetch(url), year)
            if len(paths) >= 40 and qs_edition_matches(fetch("https://www.qs-topuniversities.cn" + paths[0]), year):
                result["subjects"] = {"year": str(year), "source": url}
                break
        except Exception as error:
            warnings.append(f"QS subjects {year}: {error}")
    article = current["usnews"]["editionSource"]
    try:
        try:
            edition = usnews_edition(fetch(article))
        except Exception:
            edition = usnews_edition(fetch("https://r.jina.ai/" + article))
        if int(edition[:4]) < int(current["usnews"]["year"][:4]):
            raise ValueError("US News edition would regress")
        result["usnews"]["year"] = edition
    except Exception as error:
        # This list has no year in its URL, so retaining an assumed old year
        # while importing a live list would mislabel an entire dataset.
        result["usnews"]["unavailable"] = "Cannot verify live edition: " + str(error)
        warnings.append("US News is unavailable; preserve its previously verified snapshot: " + str(error))
    return result, warnings
