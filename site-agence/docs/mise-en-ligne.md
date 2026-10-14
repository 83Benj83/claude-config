# Mise en ligne (Vercel + Supabase)

Pas à pas suivi pour mettre le site en ligne avec les identifiants de l'aperçu.
Aucun secret n'est écrit dans le dépôt : les clés restent dans les variables
d'environnement (`VERCEL_TOKEN`, `SUPABASE_ACCESS_TOKEN`) et dans `.env.local`
(ignoré par Git).

## 1. Base Supabase (API de gestion, `https://api.supabase.com/v1`)

1. `GET /organizations` : l'organisation du compte.
2. `POST /projects` : `name` « astrinova-equipe », `region` « eu-west-3 » (Paris),
   `db_pass` aléatoire (non conservé : tout passe ensuite par l'API).
3. Attendre `status = ACTIVE_HEALTHY` (`GET /projects/{ref}`).
4. Exécuter dans l'ordre `0001_init.sql`, `0002_contracts_settings.sql`, `0003_echange.sql`
   (`POST /projects/{ref}/database/query`).
5. Clé serveur : `GET /projects/{ref}/api-keys?reveal=true` (clé secrète ou `service_role`).
6. `.env.local` : `SUPABASE_URL=https://{ref}.supabase.co`, `SUPABASE_SECRET_KEY`,
   `SESSION_SECRET` (48 octets aléatoires en base64).

## 2. Identifiants

Les identifiants et les empreintes des mots de passe viennent de l'aperçu
(https://claude.ai/artifact/YM3CnWsuPwDA4T3FDqh171), collections `members` et
`credentials`, exportées en fichiers JSON dans un dossier **hors du dépôt** :

```bash
npm run members:from-preview -- <dossier> --verifier
npm run members:from-preview -- <dossier>
```

Puis supprimer le dossier exporté. Chacun garde son mot de passe ; la
première connexion déjà faite dans l'aperçu n'est pas redemandée.

## 3. Site Vercel

Depuis `site-agence/` :

```bash
npx vercel link --yes --project astrinova-equipe --token "$VERCEL_TOKEN"
printf '%s' "$SUPABASE_URL" | npx vercel env add SUPABASE_URL production --token "$VERCEL_TOKEN"
# idem pour SUPABASE_SECRET_KEY et SESSION_SECRET
npx vercel deploy --prod --yes --token "$VERCEL_TOKEN"
```

La région des fonctions est Paris (`vercel.json`). Vérifier ensuite : la page
`/connexion` liste les identifiants, un mauvais mot de passe est refusé, et
`/fichiers/<id>` répond 401 sans session.
