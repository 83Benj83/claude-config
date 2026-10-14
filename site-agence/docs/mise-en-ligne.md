# Mise en ligne (Vercel + Supabase)

Pas à pas suivi pour mettre le site en ligne sur https://astrinova-equipe.vercel.app
avec les identifiants de l'aperçu. Aucun secret n'est écrit dans le dépôt : les
clés restent dans les variables d'environnement du projet Vercel et, le temps
des commandes, dans des fichiers privés hors du dépôt.

## 1. Projet et base

1. Projet Vercel `astrinova-equipe` (équipe `astrinova`), relié à ce dossier :
   `npx vercel link --yes --project astrinova-equipe`.
2. Base : intégration Supabase du Marketplace Vercel, plan Free, région Paris
   (`cdg1`, soit `eu-west-3`). La première fois, les conditions du Marketplace
   s'acceptent dans le navigateur.

   ```bash
   npx vercel integration add supabase --plan free -m region=cdg1 --name astrinova-db
   ```

   Vercel relie la base au projet et crée `SUPABASE_URL`, `SUPABASE_SECRET_KEY`,
   `POSTGRES_URL_NON_POOLING`, etc. (préfixe laissé vide).
3. `SESSION_SECRET` : 48 octets aléatoires en base64, ajoutés en variable sensible
   de production (`npx vercel env add SESSION_SECRET production --sensitive`).

## 2. Tables

Rien à lancer à la main : `vercel.json` exécute `npm run db:migrate` avant chaque
construction de production. Le script applique les fichiers de
`supabase/migrations` pas encore passés (table `schema_migrations`), sous verrou,
avec vérification du certificat de la base (`supabase/prod-ca-2021.crt`). Les
versions d'essai (preview) ne touchent pas à la base.

## 3. Déploiement

```bash
npx vercel deploy --prod --yes
```

`.vercelignore` exclut `scripts/identifiants.csv`, `.env*`, les tests et l'aperçu.

## 4. Identifiants

Les identifiants et les empreintes des mots de passe viennent de l'aperçu
(https://claude.ai/artifact/YM3CnWsuPwDA4T3FDqh171), collections `members` et
`credentials`, exportées en fichiers JSON dans un dossier **hors du dépôt** :

```bash
npx vite build --config scripts/vite.config.mts --logLevel warn
node scripts/.build/import-preview.mjs <dossier> --verifier
node --env-file=<fichier privé> scripts/.build/import-preview.mjs <dossier>
```

Le fichier privé contient `SUPABASE_URL`, `SUPABASE_SECRET_KEY` et
`SESSION_SECRET` (récupérés avec `npx vercel env pull`). Supprimer ensuite le
dossier exporté. Chacun garde son mot de passe ; la première connexion déjà
faite dans l'aperçu n'est pas redemandée.

## 5. Vérifications faites

- `/connexion` liste les 5 identifiants ;
- un mauvais mot de passe est refusé, le bon ouvre l'accueil ;
- Échange, Prospecter, Guide et Panel admin s'ouvrent une fois connecté ;
- `/fichiers/<id>` sans session renvoie vers `/connexion`.
