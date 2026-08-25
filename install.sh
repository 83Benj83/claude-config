#!/usr/bin/env bash
#
# install.sh — Installe cette configuration Claude Code dans ~/.claude
#
# Usage :   ./install.sh
#
# Le script SAUVEGARDE ta config existante avant toute copie.
# Il ne touche jamais à tes secrets (~/.claude/.credentials.json) ni à
# tes sessions/historique : seuls les dossiers de config sont copiés.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$REPO_DIR/.claude"
DST="$HOME/.claude"

# Éléments de config à installer (le reste de ~/.claude est laissé intact)
ITEMS=(skills agents commands rules helpers CLAUDE.md settings.json)

echo "▶ Installation de la config Claude Code depuis : $REPO_DIR"
echo "  Destination : $DST"
echo

mkdir -p "$DST"

# 1) Sauvegarde de l'existant
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$DST/backups/config-backup-$STAMP"
mkdir -p "$BACKUP"
for item in "${ITEMS[@]}"; do
  if [ -e "$DST/$item" ]; then
    cp -R "$DST/$item" "$BACKUP/" 2>/dev/null || true
  fi
done
echo "✔ Sauvegarde de ta config actuelle : $BACKUP"

# 2) Copie de la nouvelle config
for item in "${ITEMS[@]}"; do
  if [ -e "$SRC/$item" ]; then
    rm -rf "$DST/$item"
    cp -R "$SRC/$item" "$DST/$item"
    echo "✔ Installé : $item"
  fi
done

# 3) Config plugins (référence des marketplaces + plugins installés)
mkdir -p "$DST/plugins"
[ -f "$SRC/plugins/known_marketplaces.json" ] && cp "$SRC/plugins/known_marketplaces.json" "$DST/plugins/" && echo "✔ Installé : plugins/known_marketplaces.json"
[ -f "$SRC/plugins/installed_plugins.json" ] && cp "$SRC/plugins/installed_plugins.json" "$DST/plugins/" && echo "✔ Installé : plugins/installed_plugins.json"

echo
echo "✅ Config installée."
echo
echo "▶ Étape manuelle — installer le plugin ECC (fournit les skills/agents 'ecc:') :"
echo "    Dans un terminal Claude Code, lance :"
echo "      /plugin marketplace add https://github.com/affaan-m/ECC.git"
echo "      /plugin install ecc@ecc"
echo
echo "ℹ️  Redémarre Claude Code pour que tout soit pris en compte."
echo "ℹ️  En cas de souci, ta config précédente est dans : $BACKUP"
