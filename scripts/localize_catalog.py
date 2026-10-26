"""Create distinct Simplified/Traditional display names without changing source identities."""
from __future__ import annotations
import json
from opencc import OpenCC
from fetch_sources import ROOT

FALLBACK_NAMES = {
    "Autonomous University of Barcelona": "巴塞罗那自治大学",
    "Baylor College of Medicine": "贝勒医学院",
    "Charité – Universitätsmedizin Berlin": "柏林夏里特医学院",
    "Icahn School of Medicine at Mount Sinai": "西奈山伊坎医学院",
    "Karolinska Institute": "卡罗林斯卡医学院",
    "King Abdullah University of Science and Technology": "阿卜杜拉国王科技大学",
    "London School of Hygiene and Tropical Medicine": "伦敦卫生与热带医学院",
    "Radboud University Nijmegen": "奈梅亨拉德堡德大学",
    "Rockefeller University": "洛克菲勒大学",
    "Scuola Normale Superiore di Pisa": "比萨高等师范学校",
    "University of Barcelona": "巴塞罗那大学",
    "University of Bonn": "波恩大学",
    "University of California, Santa Barbara": "加利福尼亚大学圣塔芭芭拉分校",
    "University of California--San Francisco": "加利福尼亚大学旧金山分校",
    "University of Chinese Academy of Sciences": "中国科学院大学",
    "University of Freiburg": "弗赖堡大学",
    "University of Hamburg": "汉堡大学",
    "University of Massachusetts": "马萨诸塞大学",
    "University of Texas Southwestern Medical Center--Dallas": "得克萨斯大学西南医学中心",
    "University of Tübingen": "图宾根大学",
    "Xi'an Jiaotong University": "西安交通大学",
}

REGIONS = {
    "Hong Kong": ("Hong Kong SAR", "香港特别行政区"),
    "Hong Kong SAR": ("Hong Kong SAR", "香港特别行政区"),
    "Taiwan": ("Taiwan", "台湾"),
    "Taiwan (China)": ("Taiwan", "台湾"),
    "Macau": ("Macau SAR", "澳门特别行政区"),
    "Macau SAR": ("Macau SAR", "澳门特别行政区"),
    "China": ("China (Mainland)", "中国内地"),
    "Argentina": ("Argentina", "阿根廷"),
    "Qatar": ("Qatar", "卡塔尔"),
}

# Preserve official institution names even when a ranking's translation is abbreviated.
OFFICIAL_NAMES = {
    'qs-441': ('国立台湾大学', '國立臺灣大學'),
}


def localize(data):
    traditional = OpenCC("s2t")
    for school in data["schools"]:
        school["nameZh"] = school.get("nameZh") or FALLBACK_NAMES.get(school["name"])
        school["nameZhHant"] = traditional.convert(school["nameZh"]) if school.get("nameZh") else None
        if school['id'] in OFFICIAL_NAMES:
            school['nameZh'], school['nameZhHant'] = OFFICIAL_NAMES[school['id']]
        english, simplified = REGIONS.get(school["country"], (school["country"], school.get("countryZh", school["country"])))
        school["countryDisplayEn"] = english
        school["countryZh"] = simplified
        school["countryZhHant"] = traditional.convert(simplified)
    return data


if __name__ == "__main__":
    path = ROOT / "data" / "universities.json"
    data = localize(json.loads(path.read_text(encoding="utf-8")))
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
