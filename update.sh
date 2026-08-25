#!/usr/bin/env bash
#
# update.sh — Resynchronise TA config locale (~/.claude) vers ce repo.
#             Réservé au propriétaire du repo (toi). Ne pousse rien tout seul.
#
#   ./update.sh          # copie la config partageable dans le repo + affiche le diff
#   ./update.sh --push   # idem puis commit + push
#
# Sécurité : whitelist EXPLICITE. Aucun secret / session / historique / cache /
# log / donnée perso n'est jamais copié. Pas de `rsync ~/.claude` global.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$HOME/.claude"
DST="$REPO_DIR/.claude"

# Whitelist : SEULS ces éléments partent vers le repo.
ITEMS=(skills agents commands rules helpers CLAUDE.md settings.json)

# Garde-fou : motifs interdits (si trouvés dans les fichiers à commiter → stop).
FORBIDDEN='(\.credentials|\.env$|/sessions/|history\.jsonl|/telemetry/|/projects/)'

DO_PUSH=0
[ "${1:-}" = "--push" ] && DO_PUSH=1

echo "▶ Sync ~/.claude → repo (whitelist : ${ITEMS[*]})"

for item in "${ITEMS[@]}"; do
  if [ -e "$SRC/$item" ]; then
    rm -rf "$DST/$item"
    cp -R "$SRC/$item" "$DST/$item"
    echo "  ✓ $item"
  else
    echo "  ! absent de ~/.claude, ignoré : $item"
  fi
done

# Nettoyage : jamais de .DS_Store ni d'état plugin machine-spécifique
find "$DST" -name ".DS_Store" -delete 2>/dev/null || true
rm -rf "$DST/plugins" 2>/dev/null || true

cd "$REPO_DIR"

echo "▶ Scan de sécurité…"
git add -A
if git status --porcelain | awk '{print $2}' | grep -qE "$FORBIDDEN"; then
  echo "✗ STOP : un fichier interdit s'apprête à être commité :"
  git status --porcelain | grep -E "$FORBIDDEN" || true
  exit 1
fi
echo "  ✓ Aucun fichier interdit détecté."

echo "▶ Changements :"
git status --short

if [ "$DO_PUSH" -eq 1 ]; then
  if git diff --cached --quiet; then
    echo "▶ Rien à committer."
  else
    git commit -m "chore: sync config depuis ~/.claude"
    git push
    echo "✓ Poussé."
  fi
else
  echo
  echo "ℹ️  Rien n'a été poussé. Pour committer + pousser :"
  echo "     ./update.sh --push"
fi
