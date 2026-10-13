# Atelier Vif : l'espace de l'équipe

Application interne de l'agence, pensée pour le téléphone, la tablette et l'ordinateur. On passe d'une rubrique à l'autre par le menu (barre d'onglets en bas sur téléphone, rail sur tablette, menu latéral sur ordinateur), sans faire défiler une longue page.

| Rubrique | Ce qu'on y fait |
| --- | --- |
| **Accueil** (`/`) | Ma journée, recherche rapide « déjà contacté ? », podium du jour, activité de l'équipe |
| **Prospecter** (`/prospection`) | Ajouter chaque restaurant contacté : **nom, ville, moyen de contact** (coordonnées et note en option). Alerte en direct si l'établissement a déjà été contacté. |
| **Déjà contacté ?** (`/recherche`) | Chercher un établissement : oui ou non, par qui, quand et comment |
| **Classement** (`/classement`) | Jour, semaine, mois, mis à jour à chaque ajout |
| **Bilan du mois** (`/bilan`) | Totaux par personne, calendrier, moyens de contact, export CSV |
| **Organigramme** (`/equipe`) | Organigramme et annuaire, avec le total du mois de chacun |
| **Mails et liens** (`/ressources`) | Adresses e-mail, modèles de message et liens utiles, copiables en un clic |
| **L'agence** (`/agence`) | Présentation : services, méthode, valeurs |
| **Identifiants** (`/admin`) | Admins : créer les identifiants et définir le mot de passe de chacun |

Le guide de prospection viendra plus tard (contenu à fournir).

Stack : Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS 4, Supabase (Postgres), Motion.

---

## Connexion : identifiant + mot de passe

- L'admin crée un identifiant par personne et **choisit son mot de passe** (ou le génère) dans **Identifiants**, puis le transmet.
- À sa **première connexion**, la personne choisit son identifiant dans la liste, entre son mot de passe, puis confirme son nom et son poste.
- Mot de passe oublié : l'admin en définit un nouveau. Les sessions ouvertes de cette personne sont alors fermées. Un identifiant désactivé disparaît de la connexion ; son historique reste.
- Les mots de passe ne sont jamais stockés en clair (PBKDF2-SHA256, 600 000 itérations).

## Démarrer en local (mode démo)

```bash
npm install
npm run dev
```

Ouvre http://localhost:3000. Sans configuration, le site tourne en **mode démo** : une équipe fictive de 11 personnes avec 45 jours d'historique, stockée en mémoire (remise à zéro au redémarrage). Mot de passe de chaque compte de démo : l'identifiant suivi de `2026` (ex. `lea2026`).

En production, le mode démo ne s'active jamais par accident : sans variables Supabase, le site refuse de démarrer, sauf si `DEMO_MODE=1` est défini. Une configuration incomplète bloque aussi le démarrage avec un message clair.

## Mettre en ligne avec ton équipe

### 1. Créer la base Supabase (gratuit)

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Dans **SQL Editor**, exécute le contenu de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
3. Récupère l'URL du projet et la **clé secrète** (**Project Settings > API Keys**).

Supabase sert uniquement de base Postgres, interrogée par le serveur avec la clé secrète. Les tables ont la Row Level Security activée **sans aucune règle d'accès public** : depuis Internet, sans la clé secrète, la base ne renvoie rien.

### 2. Configurer les variables

Copie `.env.example` en `.env.local` et remplis :

| Variable | Rôle |
| --- | --- |
| `SUPABASE_URL` | URL du projet |
| `SUPABASE_SECRET_KEY` | Clé secrète, **serveur uniquement** |
| `SESSION_SECRET` | Signe les cookies de session (32 caractères aléatoires minimum) |

Aucune clé n'est envoyée au navigateur.

### 3. Importer les identifiants

Prépare un fichier CSV (séparateur `;`) à partir de [`scripts/identifiants.exemple.csv`](scripts/identifiants.exemple.csv) : une ligne par personne, avec **son** mot de passe. Mets `oui` dans la colonne `admin` pour toi (au moins un admin).

```bash
npm run members:import -- scripts/identifiants.csv
```

Tout est vérifié avant l'écriture (identifiants en double, mots de passe trop courts…). Un identifiant déjà présent est mis à jour. Les fichiers `scripts/*.csv` sont ignorés par Git : supprime le tien une fois l'import fait. Ensuite, tout se gère depuis la rubrique **Identifiants** du site.

### 4. Déployer (Vercel)

1. Importe le dépôt sur [vercel.com](https://vercel.com) (dossier racine : `site-agence`).
2. Ajoute les 3 variables d'environnement ci-dessus.
3. Déploie, puis complète dans **Identifiants** le pôle et le responsable de chacun : l'organigramme se construit tout seul.

## Personnaliser

| Quoi | Où |
| --- | --- |
| Nom de l'agence, textes, services, méthode, valeurs | [`src/config/site.ts`](src/config/site.ts) |
| Mails, modèles et liens | Directement sur le site (rubrique **Mails et liens**, admins) |
| Moyens de contact proposés | [`src/lib/channels.ts`](src/lib/channels.ts) (et la contrainte `channel` de la migration SQL) |
| Couleurs, typographie | Variables en haut de [`src/app/globals.css`](src/app/globals.css) |
| Délai de correction, longueur minimale des mots de passe | [`src/lib/rules.ts`](src/lib/rules.ts) |

## Règles

- Chaque prospect compte pour une prospection, au nom de la personne qui l'ajoute, pour aujourd'hui ou l'un des **7 derniers jours** (jamais dans le futur). Les journées sont comptées à l'**heure de Paris**.
- « Déjà contacté ? » ignore les majuscules, les accents, la ponctuation, les articles (le, la, chez…) et le mot « restaurant » : « Le Café des Arts » et « cafe des arts » sont le même établissement. Un même nom dans une autre ville est signalé à part.
- Chacun peut supprimer ses propres prospects des 7 derniers jours ; un admin peut tout supprimer.
- La variation du classement compare à la même durée de la période précédente.

## Sécurité

- Clés et secrets côté serveur uniquement ; cookie de session `httpOnly`, signé (HMAC-SHA256) et révocable ; en-têtes de sécurité (CSP, HSTS, anti-iframe).
- Chaque Server Action revérifie la session et les droits (admin, propriétaire du prospect) avant d'écrire.
- Connexion limitée par adresse IP et par identifiant (essais en série freinés) ; message d'erreur identique que l'identifiant existe ou non.
- Export CSV protégé contre l’injection de formules ; liens limités aux adresses web (`http`, `https`), photos à `https`.

## Aperçu interactif

Le dossier [`preview/`](preview/) empaquette les mêmes écrans dans une seule page, publiée sur claude.ai avec une base partagée et des données d'exemple, pour tester sans rien installer.

```bash
npm run preview:build   # page à publier : preview/dist/page.html
npm run preview:local   # même page avec une base locale en mémoire : preview/dist-local/local.html
npm run preview:seed    # données d'exemple au format de la base de l'aperçu
```

Dans l'aperçu, la connexion est simulée dans le navigateur : n'y mets pas de vrais mots de passe.

## Développement

```bash
npm run dev            # serveur de développement
npm run typecheck      # TypeScript
npm run lint           # ESLint
npm test               # tests unitaires (Vitest)
npm run test:coverage  # couverture de la logique métier
npm run test:e2e       # tests navigateur (Playwright, ordinateur + téléphone, mode démo)
npm run build          # build de production
```

### Architecture

```
src/
  app/
    (app)/             pages de l'espace connecté (une page = un écran partagé + ses données)
    connexion/         choix de l'identifiant, mot de passe
    bienvenue/         première connexion
    actions/           Server Actions (session + droits, puis services)
    next-platform.tsx  branchement des écrans sur Next.js (liens, navigation, actions)
  ui/
    screens/           écrans (communs au site et à l'aperçu)
    shell/             menu latéral, rail tablette, barre d'onglets mobile
    primitives/        boutons, champs, panneaux, notifications…
  config/              contenu éditorial, menu
  lib/
    services/          règles métier (prospects, identifiants, chargement des écrans)
    data/              accès aux données : SupabaseRepository / DemoRepository
    auth/              session signée, requireMember / requireAdmin
    establishments.ts  reconnaissance des établissements (doublons, recherche)
    views.ts, stats.ts calculs purs (classement, bilan, organigramme)
    validation.ts      schémas zod
  proxy.ts             redirection vers /connexion
preview/               aperçu interactif (claude.ai)
scripts/               import des identifiants
supabase/migrations/   schéma SQL
```
