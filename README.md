# Ma config Claude Code

Ma configuration [Claude Code](https://claude.com/claude-code) partagée : **66 skills**, agents, commandes, règles et hooks. Clone, lance le script, et tu as la même config que moi.

## 🚀 Installation

```bash
git clone <URL_DE_CE_REPO> claude-config
cd claude-config
./install.sh
```

Le script **sauvegarde ta config existante** (dans `~/.claude/backups/`) avant de copier la nouvelle. Il ne touche **jamais** à tes secrets ni à ton historique.

Ensuite, installe le plugin ECC (qui fournit tous les skills/agents `ecc:`) dans un terminal Claude Code :

```
/plugin marketplace add https://github.com/affaan-m/ECC.git
/plugin install ecc@ecc
```

Puis redémarre Claude Code.

## 📦 Ce que contient ce repo

| Dossier | Contenu |
|---|---|
| `.claude/skills/` | 66 skills (design, dev, SEO, 3D, marketing…) |
| `.claude/agents/` | Agents personnalisés |
| `.claude/commands/` | Slash-commands |
| `.claude/rules/` | Règles globales (git, contexte, style…) |
| `.claude/helpers/` | Scripts de hooks |
| `.claude/CLAUDE.md` | Instructions globales |
| `.claude/settings.json` | Réglages (thème, permissions, hooks) |
| `.claude/plugins/*.json` | Références des plugins/marketplaces à réinstaller |

## 🔒 Sécurité

Ce repo **ne contient aucun secret**. Sont exclus via `.gitignore` :
tokens (`.credentials.json`), sessions, historique, logs, caches, télémétrie.

⚠️ **Ne committez jamais** votre `.credentials.json` ni de clés d'API.

## 🔄 Mettre à jour le repo depuis ma machine

```bash
# Recopier la config actuelle vers le repo puis pousser
rsync -a --delete ~/.claude/skills ~/.claude/agents ~/.claude/commands \
      ~/.claude/rules ~/.claude/helpers claude-config/.claude/
cp ~/.claude/CLAUDE.md ~/.claude/settings.json claude-config/.claude/
cd claude-config && git add -A && git commit -m "chore: update config" && git push
```
