# Astrinova : l'espace de l'équipe

Application interne de l'agence, pensée pour le téléphone, la tablette et l'ordinateur. L'accueil reste simple ; on passe d'une rubrique à l'autre par le bouton **Menu**, en haut à gauche sur tous les écrans. Toutes les rubriques ont le même poids : aucune n'est mise en avant.

| Rubrique | Ce qu'on y fait |
| --- | --- |
| **Accueil** (`/`) | Un mot de bienvenue et toutes les rubriques, sans chiffres ni classement |
| **Prospecter** (`/prospection`) | Ajouter chaque restaurant contacté : **nom, ville, moyen de contact** (coordonnées et note en option). Alerte en direct si l'établissement a déjà été contacté. **Importer une liste** : un fichier Excel (.xlsx), CSV ou texte, jusqu'à 500 lignes ; les colonnes sont reconnues d'après leur titre, chaque ligne est vérifiée (doublons, déjà contactés, champs manquants) avant l'enregistrement. |
| **Déjà contacté ?** (`/recherche`) | Chercher un établissement : oui ou non, par qui, quand et comment |
| **Classement** (`/classement`) | Semaine, mois et année, mis à jour à chaque ajout |
| **Bilan du mois** (`/bilan`) | Totaux par personne, calendrier, moyens de contact, export CSV |
| **Contrats** (`/contrats`) | Contrats en cours (maquette, développement, validation) et effectués (en ligne), avec les totaux |
| **Guide du prospecteur** (`/guide`) | La page d'origine du guide, à l'identique (sommaire, modèles à copier, recherche dans la FAQ), sous la barre du menu |
| **Mails et liens** (`/ressources`) | E-mail et téléphones de l'équipe, liens utiles et modèles de message du guide, copiables en un clic |
| **Échange** (`/echange`) | La discussion de l'équipe : messages, photos et fichiers, visibles par tous en direct ; une pastille signale les nouveaux messages |
| **Organigramme** (`/equipe`) | Organigramme et annuaire : qui fait quoi |
| **L'agence** (`/agence`) | Présentation : packs, parcours client, engagements |
| **Panel admin** (`/admin`) | Admins : identifiants et mots de passe, statistiques et remise à zéro des compteurs |
| **Activité** (`/activite`) | Admins : qui est venu sur le site aujourd'hui (heure d'arrivée et dernière visite), présence et travail de chacun sur 7 jours, journal des connexions (réussies et mots de passe refusés), contrats, fichiers et espace de stockage |

## Qui peut faire quoi

| Action | Toute l'équipe | Admins |
| --- | --- | --- |
| Ajouter des prospects, chercher, voir le classement et le bilan | oui | oui |
| Gérer les mails, liens et modèles | oui | oui |
| Écrire dans l'échange, envoyer photos et fichiers | oui | oui |
| Supprimer un message de l'échange | les siens | tous |
| Consulter les contrats | oui | oui |
| Ajouter, modifier ou supprimer un contrat | non | oui |
| Panel admin : identifiants, mots de passe, remise à zéro des statistiques | non | oui |
| Activité : visites, connexions, chiffres du site | non | oui |

Stack : Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS 4, Supabase (Postgres), Motion.

---

## Connexion : identifiant + mot de passe

- L'admin crée un identifiant par personne et **choisit son mot de passe** (ou le génère) dans le **Panel admin**, puis le transmet. Le poste de chacun est défini par l'admin.
- À sa **première connexion**, la personne choisit son identifiant dans la liste, entre son mot de passe, puis confirme son nom.
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

Le plus simple : depuis le projet Vercel, onglet **Storage**, ajoute **Supabase** (plan Free, région **Paris**, préfixe des variables laissé vide). Vercel relie la base au projet et crée lui-même `SUPABASE_URL`, `SUPABASE_SECRET_KEY` et `POSTGRES_URL_NON_POOLING`.

Les tables se créent seules : avant chaque mise en ligne, Vercel lance `npm run db:migrate` ([`scripts/db-migrate.mjs`](scripts/db-migrate.mjs), voir [`vercel.json`](vercel.json)), qui applique dans l'ordre les fichiers de [`supabase/migrations`](supabase/migrations) pas encore passés (0002 : contrats, remise à zéro, téléphones ; 0003 : échange et espace de stockage privé des fichiers ; 0004 : visites et journal des connexions).

Base créée directement sur [supabase.com](https://supabase.com) : exécute ces fichiers dans **SQL Editor**, puis récupère l'URL du projet et la **clé secrète** (**Project Settings > API Keys**).

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

Prépare un fichier CSV (séparateur `;`) à partir de [`scripts/identifiants.exemple.csv`](scripts/identifiants.exemple.csv) : une ligne par personne, avec **son** mot de passe. Colonnes : `identifiant;nom;poste;mot de passe;admin;responsable;pôle;prospecteur`. Mets `oui` dans la colonne `admin` pour toi (au moins un admin).

```bash
npm run members:import -- scripts/identifiants.csv
```

Tout est vérifié avant l'écriture (identifiants en double, mots de passe trop courts…) ; ajoute `--verifier` pour tout contrôler sans rien écrire. Un identifiant déjà présent est mis à jour. Si la rubrique **Mails et liens** est vide, l'import y ajoute les contacts, liens et modèles du guide. Les fichiers `scripts/*.csv` sont ignorés par Git : supprime le tien une fois l'import fait. Ensuite, tout se gère depuis le **Panel admin** du site.

### 4. Déployer (Vercel)

1. Importe le dépôt sur [vercel.com](https://vercel.com) (dossier racine : `site-agence`), ou déploie depuis ce dossier avec `npx vercel deploy --prod`.
2. Ajoute `SESSION_SECRET` (les variables Supabase sont déjà là si la base vient de l'onglet **Storage**).
3. Déploie, puis complète dans le **Panel admin** le pôle et le responsable de chacun : l'organigramme se construit tout seul.

Les fonctions tournent à Paris, comme la base. [`.vercelignore`](.vercelignore) garde hors de l'envoi les fichiers d'identifiants, `.env*`, les tests et l'aperçu.

## Personnaliser

| Quoi | Où |
| --- | --- |
| Nom de l'agence, textes, packs, parcours, engagements | [`src/config/site.ts`](src/config/site.ts) |
| Guide du prospecteur | [`src/content/guide-original.ts`](src/content/guide-original.ts) : la page entière, à remplacer par la nouvelle version (les modèles de **Mails et liens** viennent de [`src/content/guide.ts`](src/content/guide.ts)) |
| Mails, téléphones, modèles et liens | Directement sur le site (rubrique **Mails et liens**) ; contenu de départ dans [`src/content/resources.ts`](src/content/resources.ts) |
| Contrats | Directement sur le site (rubrique **Contrats**, admins) |
| Moyens de contact proposés | [`src/lib/channels.ts`](src/lib/channels.ts) (et la contrainte `channel` de la migration SQL) |
| Couleurs, typographie | Variables en haut de [`src/app/globals.css`](src/app/globals.css) |
| Délai de correction, longueur minimale des mots de passe | [`src/lib/rules.ts`](src/lib/rules.ts) |

## Règles

- Chaque prospect compte pour une prospection, au nom de la personne qui l'ajoute, pour aujourd'hui ou l'un des **7 derniers jours** (jamais dans le futur). Les journées sont comptées à l'**heure de Paris**.
- « Déjà contacté ? » ignore les majuscules, les accents, la ponctuation, les articles (le, la, chez…) et le mot « restaurant » : « Le Café des Arts » et « cafe des arts » sont le même établissement. Un même nom dans une autre ville est signalé à part.
- Chacun peut supprimer ses propres prospects des 7 derniers jours ; un admin peut tout supprimer.
- **Remise à zéro des statistiques** (Panel admin > Statistiques, confirmer en tapant « zéro ») : l'accueil, le classement, le bilan et l'organigramme ne comptent plus que les prospects ajoutés depuis. Rien n'est effacé : « Déjà contacté ? » garde tout l'historique, pour ne jamais rappeler un commerce déjà contacté.
- **Échange** : texte jusqu'à 2 000 caractères et 4 fichiers par message, 4 Mo par fichier (les photos sont réduites avant l'envoi). Fichiers acceptés : photos (JPEG, PNG, WebP, GIF), PDF, Word, Excel, PowerPoint, texte et CSV ; le type est vérifié sur le contenu du fichier. Les fichiers sont dans un espace de stockage privé et ne sont servis qu'aux membres connectés.
- Un contrat passe de **maquette** à **développement**, **validation**, puis **en ligne** (effectué) ; la date de mise en ligne est celle du jour si elle n'est pas précisée.
- La variation du classement compare à la même durée de la période précédente.

## Sécurité

- Clés et secrets côté serveur uniquement ; cookie de session `httpOnly`, signé (HMAC-SHA256) et révocable ; en-têtes de sécurité (CSP, HSTS, anti-iframe).
- Chaque Server Action revérifie la session et les droits (admin, propriétaire du prospect) avant d'écrire.
- Connexion limitée par adresse IP et par identifiant (essais en série freinés) ; message d'erreur identique que l'identifiant existe ou non.
- Export CSV protégé contre l’injection de formules ; liens limités aux adresses web (`http`, `https`), photos à `https`.

## Aperçu interactif

Le dossier [`preview/`](preview/) empaquette les mêmes écrans dans une seule page, publiée sur claude.ai avec une base partagée, pour tester sans rien installer.

```bash
npm run preview:build   # page à publier : preview/dist/page.html
npm run preview:local   # même page avec une base locale en mémoire : preview/dist-local/local.html
npm run preview:seed    # données de départ au format de la base de l'aperçu (avec un CSV : ces identifiants, aucun prospect)
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
    guide/             blocs du guide (tableaux, modèles, FAQ…)
    shell/             barre du haut et menu (tiroir à gauche)
    primitives/        boutons, champs, panneaux, notifications…
  config/              contenu éditorial, menu
  content/             guide du prospecteur, mails et liens de départ
  lib/
    services/          règles métier (prospects, identifiants, contrats, chargement des écrans)
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
