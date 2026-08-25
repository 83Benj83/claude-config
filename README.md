# Ma config Claude Code

Configuration [Claude Code](https://claude.com/claude-code) partagée : **65 skills**,
agents, commandes, règles, hooks, `CLAUDE.md` et `settings.json`.
Clone, lance le script, ouvre Claude Code — tu as la même config.

---

## 🚀 Quick start

```bash
git clone https://github.com/83Benj83/claude-config.git
cd claude-config
./install.sh
```

Puis **ouvre (ou redémarre) Claude Code**. C'est tout.

`install.sh` (tout est automatique par défaut) :
- vérifie les prérequis (Node, npm, git, claude) ;
- **sauvegarde** ta config existante dans `~/.claude/backups/` ;
- copie la config partageable dans `~/.claude/` ;
- **installe le plugin ECC** (skills/agents `ecc:`) — le clone du repo ECC peut prendre 1-2 min ;
- **ajoute le serveur MCP claude-flow/ruflo** (memory, routing, swarm, AgentDB) au scope user ;
- affiche un résumé + les éventuelles étapes restantes.

> **Seule action manuelle possible** : au 1er lancement de Claude Code, approuver le
> serveur MCP claude-flow quand il le demande (un serveur MCP exécute du code →
> l'approbation ne peut pas être scriptée). Rien n'est jamais écrasé sans sauvegarde.

Vérifier que tout fonctionne, à tout moment :

```bash
./doctor.sh
```

Options (rarement utiles) :

```bash
./install.sh --no-claude-flow   # sans le serveur MCP claude-flow
./install.sh --no-ecc           # sans le plugin ECC
./install.sh --doctor           # diagnostic seul, n'installe rien
```

---

## 📁 Architecture du repo

```
claude-config/
├── install.sh              # installeur (idempotent, avec sauvegarde)
├── doctor.sh               # diagnostic complet de la stack
├── update.sh               # (propriétaire) resync ~/.claude → repo
├── README.md
├── docs/
│   └── dependencies.md     # dépendances obligatoires / optionnelles
└── .claude/
    ├── skills/             # 65 skills
    ├── agents/             # agents personnalisés
    ├── commands/           # slash-commands
    ├── rules/              # règles globales (git, contexte, style…)
    ├── helpers/            # scripts de hooks
    ├── CLAUDE.md           # instructions globales
    └── settings.json       # réglages (thème, permissions, hooks)
```

L'état local des plugins (`~/.claude/plugins/`) n'est **pas** versionné : il contient
des chemins machine-spécifiques et est régénéré par `claude plugin install`.

---

## 🎨 Catégories de skills

- **Design & web** : `design`, `design-system`, `ui-ux-pro-max`, `impeccable`, `brand`, `banner-design`, `slides`, `ui-styling`, `art-director-web`, `huashu-design`…
- **3D / Motion / WebGL** : `threejs`, `threejs-r3f`, `gsap`, `webgl-shaders`, `blender-3d`, `motion-design`, `canvas-generative`…
- **Dev frontend** : `nextjs-expert`, `react-expert`, `performance-web`, `project-architect`
- **SEO / Marketing** : `seo`, `copywriting`, `conversion-optimization`
- **Claude-Flow / Swarm / AgentDB** : `swarm-orchestration`, `agentdb-*`, `reasoningbank-*`, `v3-*`, `sparc-methodology`
- **GitHub** : `github-code-review`, `github-workflow-automation`, `github-release-management`…
- **Outils** : `browser`, `playwright-cli`, `context7-mcp`, `graphify`, `skill-builder`, `find-skills`, `public-apis`

---

## 📦 Dépendances

Détail complet : **[docs/dependencies.md](docs/dependencies.md)**.

- **Obligatoire** : Node.js 18+, npm, git, Claude Code.
- **Plugin ECC** : installé automatiquement par `install.sh`.
- **Optionnel** (par skill) : deps npm de `huashu-design`, clé `GEMINI_API_KEY` pour la génération d'images, serveur MCP `claude-flow` pour les features avancées.

### ECC
Fournit tous les skills/agents/commandes `ecc:`. Auto-installé. Vérifier :
`claude plugin list` (doit montrer `ecc@ecc … enabled`).

### Claude Flow / Ruflo / AgentDB
Active memory graph, routing, swarm, AgentDB, hooks avancés + outils `mcp__claude-flow__*`.
**Installé automatiquement** par `install.sh` (scope user, via npx). Au 1er lancement de
Claude Code, approuve le serveur MCP quand il le demande. Désactiver : `--no-claude-flow`.
Sans lui, les hooks dégradent proprement (rien ne casse).

### MCP personnels
Tes connecteurs (context7, Supabase, Figma, Notion…) sont configurés hors `~/.claude`
et **ne sont pas** reproductibles par ce repo. Chacun ajoute les siens.

---

## 🔧 Troubleshooting

| Symptôme | Cause / Solution |
|---|---|
| `node absent — REQUIS` | Installe Node.js 18+ (`brew install node`) puis relance `./install.sh`. |
| Skills `ecc:` absents | ECC pas installé → `claude plugin install ecc@ecc` puis redémarre Claude Code. |
| « Imported 0 entries » au démarrage | `claude-flow` pas encore approuvé/connecté. Ouvre Claude Code et approuve le serveur MCP. Vérifie avec `./doctor.sh`. |
| Un skill se plaint d'un module manquant | Voir [docs/dependencies.md](docs/dependencies.md) (deps optionnelles par skill). |
| Je veux annuler | Ta config précédente est dans `~/.claude/backups/config-backup-<date>`. |

---

## 🔄 Mise à jour

**Côté ami (récupérer mes changements)** :
```bash
cd claude-config && git pull && ./install.sh
```

**Côté propriétaire (publier ma config locale)** :
```bash
./update.sh          # copie ~/.claude → repo + montre le diff (ne pousse pas)
./update.sh --push   # copie + commit + push
```
`update.sh` utilise une **whitelist stricte** et bloque tout secret avant commit.

---

## 🔒 Sécurité

Ce repo **ne contient aucun secret**. Le `.gitignore` exclut :
`.credentials.json`, sessions, history, cache, telemetry, logs, projects, downloads,
backups, et l'état local des plugins.

⚠️ Ne committez **jamais** de token, clé d'API, ni `.credentials.json`.
Chacun se connecte avec **son propre** compte Claude.

---

## 🚫 Ce qui n'est volontairement PAS synchronisé

- Credentials / tokens OAuth (`~/.claude/.credentials.json`)
- Sessions, historique, projets, télémétrie, logs, caches
- État local d'installation des plugins (chemins machine-spécifiques)
- Serveurs MCP personnels (connecteurs claude.ai / `.mcp.json` projet)
- `settings.local.json` (overrides locaux)
