---
name: public-apis
description: Trouver et appeler des API publiques/gratuites du catalogue public-apis (1600+ API dans 51 catégories). À utiliser quand l'utilisateur cherche une API gratuite pour un besoin (météo, images, finance, IA, géocodage, jeux…), demande « une API pour X », veut tester/consommer une API REST, ou veut lister/filtrer des API par catégorie ou par type d'authentification.
---

# public-apis — catalogue d'API gratuites

Ce skill donne accès au catalogue du dépôt [public-apis/public-apis](https://github.com/public-apis/public-apis) :
un annuaire d'API publiques (souvent gratuites) classées par catégorie, avec pour chacune
l'authentification requise, le support HTTPS et CORS.

Le catalogue est stocké localement dans `data/apis.json`. Trois scripts Python (stdlib
uniquement, aucune dépendance à installer) permettent de le rafraîchir, chercher, et appeler
n'importe quelle API REST.

## Workflow recommandé

1. **Comprendre le besoin** : catégorie visée ? contrainte « sans clé d'API » ? HTTPS obligatoire ?
2. **Chercher** une API candidate avec `scripts/search.py`.
3. **Lire la doc** de l'API choisie (le champ `url` du résultat pointe vers sa documentation).
   Utilise WebFetch si tu as besoin des détails d'endpoints/paramètres.
4. **Appeler** l'API avec `scripts/call.py` et traiter la réponse.

## Chercher une API

```bash
# Mot-clé (cherche dans le nom ET la description)
python3 scripts/search.py weather

# Une catégorie entière
python3 scripts/search.py --category Weather

# Sans authentification requise (idéal pour un test rapide)
python3 scripts/search.py image --no-auth

# HTTPS uniquement, avec limite de résultats
python3 scripts/search.py finance --https -n 30

# Lister toutes les catégories et leur nombre d'API
python3 scripts/search.py --list-categories

# Sortie JSON (pour enchaîner un traitement)
python3 scripts/search.py crypto --json
```

Catégories utiles côté IA/données : `Machine Learning`, `Art & Design`, `Photography`,
`Text Analysis`, `Open Data`, `Development`.

## Appeler une API

`scripts/call.py` est un client REST générique (GET/POST…, en-têtes, query params, corps JSON).

```bash
# GET simple
python3 scripts/call.py https://catfact.ninja/fact

# Avec paramètres de requête
python3 scripts/call.py https://api.exemple.com/search -q q=paris -q lang=fr

# Avec une clé d'API en en-tête (depuis une variable d'environnement, PAS en clair)
python3 scripts/call.py https://api.exemple.com/v1/data -H "Authorization: Bearer $MA_CLE"

# POST avec corps JSON
python3 scripts/call.py https://api.exemple.com/items -X POST \
  -H "Content-Type: application/json" -d '{"q":"chat"}'
```

## Rafraîchir le catalogue

Les API apparaissent et disparaissent régulièrement. Pour re-télécharger la dernière version :

```bash
python3 scripts/build_catalog.py
```

## Règles importantes

- **Clés d'API** : ce skill ne fournit aucune clé. Quand une API a `auth=apiKey`/`OAuth`,
  demande la clé à l'utilisateur ou lis-la depuis une variable d'environnement. Ne jamais
  écrire une clé en clair dans une commande loggée ; préférer `-H "... $VAR"`.
- **Vérifier avant de consommer** : une entrée du catalogue peut être morte ou avoir changé
  d'URL. En cas d'erreur réseau, le signaler plutôt que d'inventer une réponse.
- **Ce que le catalogue NE contient PAS** : les grandes API d'IA commerciales récentes
  (Google Gemini / « Nano Banana », OpenAI, Anthropic, Midjourney…) ne sont généralement pas
  listées car payantes et hors périmètre. Pour celles-ci, orienter vers les fournisseurs
  officiels — ce skill ne s'y substitue pas.
- **Respecter les conditions d'usage** et les limites de débit de chaque API.
