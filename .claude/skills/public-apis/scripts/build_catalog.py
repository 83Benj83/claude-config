#!/usr/bin/env python3
"""Télécharge le README de public-apis/public-apis et le transforme en data/apis.json.

Usage: python3 build_catalog.py [--source README_URL]
Relance-le quand tu veux rafraîchir le catalogue.
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

DEFAULT_URL = "https://raw.githubusercontent.com/public-apis/public-apis/master/README.md"
DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "apis.json"

# Cellule 1 d'une ligne de tableau : [Nom](url)
LINK = re.compile(r"^\[([^\]]+)\]\((https?://[^)]+)\)$")
HEADER = re.compile(r"^###\s+(.+?)\s*$")


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "public-apis-skill"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8")


def split_row(line: str) -> list[str]:
    """Découpe une ligne de tableau Markdown en cellules (sans les pipes de bord)."""
    s = line.strip()
    if s.startswith("|"):
        s = s[1:]
    if s.endswith("|"):
        s = s[:-1]
    return [c.strip() for c in s.split("|")]


def parse(md: str) -> list[dict]:
    apis: list[dict] = []
    category = None
    in_std_table = False  # dans un tableau standard API|Desc|Auth|HTTPS|CORS
    for line in md.splitlines():
        h = HEADER.match(line)
        if h:
            category = h.group(1).strip()
            in_std_table = False
            continue
        s = line.strip()
        # En-tête du tableau standard (avec ou sans pipe de bord) : active le parsing
        if "Description" in s and "Auth" in s and "HTTPS" in s and "CORS" in s:
            in_std_table = True
            continue
        if s.startswith("|---") or s.startswith("|:--"):
            continue
        if not (in_std_table and category and s.startswith("| [")):
            continue
        cells = split_row(s)
        if len(cells) < 5:
            continue
        m = LINK.match(cells[0])
        if not m:
            continue
        name, url = m.group(1).strip(), m.group(2).strip()
        auth = cells[2].replace("`", "").strip() or "No"
        apis.append({
            "name": name,
            "url": url,
            "description": cells[1],
            "auth": auth,           # "No", "apiKey", "OAuth", "X-Mashape-Key"...
            "https": cells[3],      # "Yes"/"No"
            "cors": cells[4],       # "Yes"/"No"/"Unknown"
            "category": category,
        })
    return apis


def main() -> int:
    url = DEFAULT_URL
    if "--source" in sys.argv:
        url = sys.argv[sys.argv.index("--source") + 1]
    print(f"→ Téléchargement : {url}", file=sys.stderr)
    md = fetch(url)
    apis = parse(md)
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATA_PATH.write_text(json.dumps(apis, ensure_ascii=False, indent=1), encoding="utf-8")
    cats = sorted({a["category"] for a in apis})
    print(f"✓ {len(apis)} API dans {len(cats)} catégories → {DATA_PATH}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
