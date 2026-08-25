#!/usr/bin/env python3
"""Cherche des API dans le catalogue public-apis (data/apis.json).

Exemples :
  python3 search.py weather                  # mot-clé (nom + description)
  python3 search.py --category Weather       # une catégorie entière
  python3 search.py image --no-auth          # sans clé d'API requise
  python3 search.py --list-categories        # liste les catégories
  python3 search.py ai --https --limit 30    # HTTPS uniquement
"""
import argparse
import json
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "apis.json"


def load() -> list[dict]:
    if not DATA_PATH.exists():
        raise SystemExit("Catalogue absent. Lance d'abord : python3 build_catalog.py")
    return json.loads(DATA_PATH.read_text(encoding="utf-8"))


def main() -> int:
    p = argparse.ArgumentParser(description="Recherche dans le catalogue public-apis")
    p.add_argument("query", nargs="?", default="", help="mot-clé (nom ou description)")
    p.add_argument("--category", "-c", help="filtre par catégorie (insensible à la casse)")
    p.add_argument("--no-auth", action="store_true", help="uniquement les API sans authentification")
    p.add_argument("--https", action="store_true", help="uniquement les API en HTTPS")
    p.add_argument("--limit", "-n", type=int, default=25, help="nombre max de résultats")
    p.add_argument("--list-categories", action="store_true", help="afficher les catégories et leur nombre d'API")
    p.add_argument("--json", action="store_true", help="sortie JSON brute")
    args = p.parse_args()

    apis = load()

    if args.list_categories:
        cats: dict[str, int] = {}
        for a in apis:
            cats[a["category"]] = cats.get(a["category"], 0) + 1
        for cat in sorted(cats):
            print(f"{cats[cat]:>4}  {cat}")
        print(f"\nTotal : {len(apis)} API dans {len(cats)} catégories")
        return 0

    q = args.query.lower()
    res = []
    for a in apis:
        if q and q not in a["name"].lower() and q not in a["description"].lower():
            continue
        if args.category and args.category.lower() not in a["category"].lower():
            continue
        if args.no_auth and a["auth"].lower() not in ("no", ""):
            continue
        if args.https and a["https"].lower() != "yes":
            continue
        res.append(a)

    if args.json:
        print(json.dumps(res[: args.limit], ensure_ascii=False, indent=1))
        return 0

    print(f"{len(res)} résultat(s)" + (f" (affichés : {min(len(res), args.limit)})" if len(res) > args.limit else ""))
    for a in res[: args.limit]:
        auth = a["auth"] or "No"
        print(f"\n• {a['name']}  [{a['category']}]")
        print(f"  {a['description']}")
        print(f"  auth={auth} | https={a['https']} | cors={a['cors']}")
        print(f"  {a['url']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
