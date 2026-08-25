#!/usr/bin/env python3
"""Appelle une API REST générique (GET/POST...) et affiche la réponse.

Aucune dépendance externe (urllib de la stdlib).

Exemples :
  python3 call.py https://catfact.ninja/fact
  python3 call.py https://api.exemple.com/v1/data -H "Authorization: Bearer $CLE"
  python3 call.py https://api.exemple.com/items -X POST -d '{"q":"chat"}' -H "Content-Type: application/json"
  python3 call.py "https://api.exemple.com/search" -q q=paris -q lang=fr

Les clés d'API se passent via -H (en-tête) ou -q (query string).
Astuce : stocke tes clés dans des variables d'env et référence-les dans la commande,
plutôt que de les écrire en clair.
"""
import argparse
import json
import sys
import urllib.parse
import urllib.request


def main() -> int:
    p = argparse.ArgumentParser(description="Appel d'API REST générique")
    p.add_argument("url", help="URL de l'endpoint")
    p.add_argument("-X", "--method", default="GET", help="méthode HTTP (défaut GET)")
    p.add_argument("-H", "--header", action="append", default=[], help="en-tête 'Nom: valeur' (répétable)")
    p.add_argument("-q", "--query", action="append", default=[], help="paramètre 'clé=valeur' (répétable)")
    p.add_argument("-d", "--data", help="corps de requête (chaîne brute, souvent du JSON)")
    p.add_argument("--timeout", type=int, default=30)
    p.add_argument("--raw", action="store_true", help="ne pas tenter d'embellir le JSON")
    args = p.parse_args()

    url = args.url
    if args.query:
        sep = "&" if "?" in url else "?"
        qs = "&".join(urllib.parse.quote(k, safe="=") for k in args.query)
        url = f"{url}{sep}{qs}"

    headers = {}
    for h in args.header:
        if ":" not in h:
            print(f"En-tête ignoré (format 'Nom: valeur' attendu) : {h}", file=sys.stderr)
            continue
        k, v = h.split(":", 1)
        headers[k.strip()] = v.strip()
    headers.setdefault("User-Agent", "public-apis-skill")

    body = args.data.encode("utf-8") if args.data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=args.method.upper())

    try:
        with urllib.request.urlopen(req, timeout=args.timeout) as r:
            status = r.status
            ct = r.headers.get("Content-Type", "")
            payload = r.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code} {e.reason}", file=sys.stderr)
        print(e.read().decode("utf-8", errors="replace"))
        return 1
    except Exception as e:
        print(f"Erreur : {e}", file=sys.stderr)
        return 1

    print(f"← HTTP {status}  ({ct})", file=sys.stderr)
    if not args.raw and "json" in ct.lower():
        try:
            print(json.dumps(json.loads(payload), ensure_ascii=False, indent=2))
            return 0
        except json.JSONDecodeError:
            pass
    print(payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
