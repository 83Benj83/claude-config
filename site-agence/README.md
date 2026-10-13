# Atelier Vif : l'espace de l'équipe

Site interne de l'agence, en quatre parties :

| Page | Contenu |
| --- | --- |
| **Accueil** (`/`) | Présentation de l'agence, podium du jour, chiffres de l'équipe en direct |
| **Équipe** (`/equipe`) | Organigramme, avec le total du mois de chaque prospecteur |
| **Guide** (`/guide`) | Guide de prospection, avec sommaire automatique |
| **Classement** (`/classement`) | Saisie quotidienne + classement du jour, de la semaine et du mois |
| **Bilan** (`/bilan`) | Bilan mensuel par personne, calendrier d'activité, export CSV |
| **Gestion** (`/admin`) | Réservé aux admins : postes, pôles, responsables, accès |

Stack : Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS 4, Supabase (Postgres + Auth), Motion.

---

## Démarrer en local (mode démo)

```bash
npm install
npm run dev
```

Ouvre http://localhost:3000 et choisis un profil fictif. Sans configuration, le site tourne en **mode démo** : une équipe fictive de 11 personnes avec 4 mois d'historique, stockée en mémoire (tout est remis à zéro au redémarrage).

## Mettre en ligne avec ton équipe (≈ 15 minutes)

### 1. Créer la base Supabase (gratuit)

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Dans **SQL Editor**, colle et exécute le contenu de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
3. Dans **Authentication > Sign In / Providers**, **désactive « Allow new users to sign up »**. Les comptes sont créés uniquement par le site, avec le code d'invitation : personne ne peut s'inscrire sans lui.
4. Récupère l'URL du projet et les deux clés (**Project Settings > API Keys** : clé *publishable* et clé *secret*).

### 2. Configurer les variables

Copie `.env.example` en `.env.local` et remplis :

| Variable | Rôle |
| --- | --- |
| `SUPABASE_URL` | URL du projet |
| `SUPABASE_PUBLISHABLE_KEY` | Clé publique (sessions des membres, soumise aux règles de sécurité) |
| `SUPABASE_SECRET_KEY` | Clé secrète, **serveur uniquement** (création des comptes, modifications admin) |
| `TEAM_INVITE_CODE` | Code à transmettre aux nouveaux membres |

Aucune clé n'est envoyée au navigateur : tout passe par le serveur.

### 3. Déployer (Vercel)

1. Pousse le dossier sur un dépôt GitHub et importe-le sur [vercel.com](https://vercel.com) (dossier racine : `site-agence`).
2. Ajoute les 4 variables d'environnement ci-dessus.
3. Déploie.

### 4. Inviter l'équipe

1. **Toi en premier** : va sur `/inscription` avec le code d'invitation. **Le premier compte créé devient administrateur.**
2. Envoie le lien `/inscription` et le code à chaque membre.
3. Dans **Gestion de l'équipe** (menu de ton avatar), complète le poste, le pôle et le responsable de chacun : l'organigramme se construit tout seul. Décoche « Apparaît dans le classement » pour les personnes qui ne prospectent pas.

## Personnaliser

| Quoi | Où |
| --- | --- |
| Nom de l'agence, textes de l'accueil, services, méthode, valeurs | [`src/config/site.ts`](src/config/site.ts) |
| Guide de prospection | [`content/guide-prospection.md`](content/guide-prospection.md) (Markdown ; chaque titre `##` apparaît dans le sommaire) |
| Couleurs, typographie | Variables en haut de [`src/app/globals.css`](src/app/globals.css) |
| Limite de prospections par jour, délai de correction | [`src/lib/rules.ts`](src/lib/rules.ts) (et les mêmes valeurs dans la migration SQL) |

## Règles du classement

- Chacun saisit **son** nombre de prospections, une valeur par jour (une nouvelle saisie remplace l'ancienne).
- Saisie possible pour aujourd'hui et les **7 derniers jours** (oublis), jamais dans le futur, entre 0 et 500.
- Les journées sont comptées à l'**heure de Paris**.
- La variation affichée compare à la même durée de la période précédente (ex. lundi→mercredi vs lundi→mercredi dernier).
- Ces règles sont vérifiées par l'application **et** par la base (Row Level Security) : impossible de modifier les chiffres d'un autre membre.

## Développement

```bash
npm run dev            # serveur de développement
npm run typecheck      # TypeScript
npm run lint           # ESLint
npm test               # tests unitaires (Vitest)
npm run test:coverage  # couverture de la logique métier
npm run test:e2e       # tests navigateur (Playwright, desktop + mobile, mode démo)
npm run build          # build de production
```

### Architecture

```
src/
  app/
    (auth)/            connexion, inscription
    (site)/            pages de l'espace (accueil, équipe, guide, classement, bilan, admin)
    actions/           Server Actions (chacune revérifie la session et les droits)
  components/          interface (header, classement, graphiques, organigramme…)
  config/site.ts       contenu éditorial
  lib/
    data/              accès aux données : SupabaseRepository / DemoRepository
    auth/session.ts    membre connecté, requireMember / requireAdmin
    stats.ts           calculs purs (classement, séries, bilan mensuel, organigramme)
    dates.ts           dates au fuseau de Paris
    validation.ts      schémas zod
  proxy.ts             redirection vers /connexion + rafraîchissement de session
supabase/migrations/   schéma SQL et règles de sécurité
content/               guide de prospection (Markdown)
```
