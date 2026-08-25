# Dépendances

Ce document liste ce qui est **obligatoire** pour faire tourner la config, et ce qui
est **optionnel** (seulement pour certains skills). L'installeur `install.sh` vérifie
les obligatoires et installe le plugin ECC automatiquement ; le reste est optionnel.

## ✅ Obligatoire (vérifié par `install.sh`)

| Outil | Pourquoi | Installer | Vérifier |
|---|---|---|---|
| **Node.js 18+** | Tous les hooks (`settings.json`) appellent `node`. Sans lui, les hooks échouent. | macOS : `brew install node` · autres : https://nodejs.org | `node -v` |
| **npm** | Fourni avec Node ; requis pour les skills optionnels. | (avec Node.js) | `npm -v` |
| **git** | Cloner le repo + le marketplace ECC. | macOS : `brew install git` | `git --version` |
| **Claude Code** (`claude`) | L'application elle-même + installation auto d'ECC. | https://claude.com/claude-code | `claude --version` |

## 🧩 Plugin ECC (installé automatiquement)

Fournit tous les skills/agents/commandes préfixés `ecc:`.

`install.sh` exécute automatiquement :

```bash
claude plugin marketplace add https://github.com/affaan-m/ECC.git
claude plugin install ecc@ecc --yes --scope user
```

Si Claude Code n'est pas encore configuré/authentifié sur la machine, l'auto-install
peut échouer proprement → refaire manuellement dans un terminal Claude Code :

```
/plugin marketplace add https://github.com/affaan-m/ECC.git
/plugin install ecc@ecc
```

**Vérifier :** `claude plugin list` → doit afficher `ecc@ecc … enabled`.

## 🌀 Claude Flow / Ruflo / AgentDB (installé automatiquement)

Active : **memory graph, routing intelligent, swarm, agents, AgentDB, hooks avancés**,
et les outils MCP `mcp__claude-flow__*`.

`install.sh` l'ajoute automatiquement au **scope user** (global) :

```bash
claude mcp add -s user claude-flow -- npx -y ruflo@latest mcp start
```

Le serveur tourne via **npx** (aucune install globale) : `ruflo@latest` est téléchargé
à la volée au 1er lancement. **Action manuelle résiduelle** : au premier démarrage de
Claude Code, il faut **approuver** le serveur MCP quand il le demande (sécurité Claude
Code — un serveur MCP exécute du code, l'approbation ne peut donc pas être scriptée).

> ⚠️ Le `settings.json` référence `mcp__claude-flow__*` dans les *permissions*, mais
> c'est juste une autorisation, pas une installation. Le serveur lui-même est ajouté
> par la commande ci-dessus (faite par `install.sh`).
>
> Pour ne PAS l'installer : `./install.sh --no-claude-flow`. Sans lui, les hooks
> **fonctionnent quand même** en mode dégradé (ex. « Imported 0 entries »). Rien ne casse.

**Vérifier :** `claude mcp list` → doit afficher `claude-flow` (Connected ou Pending approval).

## 🎨 Dépendances par skill (optionnelles)

Installe-les **seulement si tu utilises le skill concerné**.

| Skill(s) | Dépendance | Installer | Vérifier |
|---|---|---|---|
| `huashu-design` | npm : pdf-lib, playwright, pptxgenjs, sharp | `cd ~/.claude/skills/huashu-design && npm install && npx playwright install chromium` | `ls node_modules` |
| `ui-styling` | shadcn/ui CLI (par projet) | `npx shadcn-ui@latest init` (dans ton projet) | — |
| `design`, `banner-design`, `huashu-design` | Clé API **Gemini** (génération d'images/logos) | définir `GEMINI_API_KEY` dans ton shell | `echo $GEMINI_API_KEY` |
| Skills avec tests Python (`ui-styling`, `design-system`, `brand`) | pytest (dev only) | `pip install pytest pytest-cov pytest-mock` | `pytest --version` |

> Les clés d'API (Gemini, etc.) ne sont **jamais** stockées dans le repo. Chacun met
> les siennes dans son environnement local.

## 🔌 Serveurs MCP personnels (non reproductibles par ce repo)

Les connecteurs MCP que tu utilises (context7, Supabase, Figma, Notion, Vercel…) sont
configurés **hors `~/.claude`** (connecteurs claude.ai / `.mcp.json` par projet).
Ce repo ne peut pas les reproduire : chacun ajoute les siens via `claude mcp add …`
ou l'interface connecteurs de claude.ai.
