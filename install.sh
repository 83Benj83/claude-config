#!/usr/bin/env bash
#
# install.sh — Installe cette configuration Claude Code dans ~/.claude
#
#   git clone https://github.com/83Benj83/claude-config.git
#   cd claude-config
#   ./install.sh                 # installation complète (config + ECC + claude-flow)
#   ./install.sh --no-claude-flow  # sans le serveur MCP claude-flow/ruflo
#   ./install.sh --no-ecc          # sans le plugin ECC
#   ./install.sh --doctor          # ne rien installer, juste diagnostiquer
#
# Par défaut, install.sh installe TOUT ce qui est reproductible automatiquement :
#   • la configuration partageable (skills, agents, commands, rules, helpers…) ;
#   • le plugin ECC (skills/agents 'ecc:') ;
#   • le serveur MCP claude-flow/ruflo (memory, routing, swarm, AgentDB, hooks).
#
# Garanties :
#   • Sauvegarde ~/.claude existant avant toute modification.
#   • Copie UNIQUEMENT la configuration partageable (whitelist explicite).
#   • Ne copie jamais credentials / sessions / history / cache / logs.
#   • Aucun chemin absolu machine-spécifique.
#   • Idempotent : relançable sans casser la configuration.

set -euo pipefail

# ── Couleurs ───────────────────────────────────────────────────
if [ -t 1 ]; then
  B=$'\033[1m'; G=$'\033[0;32m'; Y=$'\033[0;33m'; R=$'\033[0;31m'; C=$'\033[0;36m'; N=$'\033[0m'
else
  B=""; G=""; Y=""; R=""; C=""; N=""
fi
ok(){ echo "${G}✓${N} $*"; }
warn(){ echo "${Y}!${N} $*"; }
err(){ echo "${R}✗${N} $*"; }
info(){ echo "${C}▶${N} $*"; }

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$REPO_DIR/.claude"
DST="$HOME/.claude"

# ── Options ────────────────────────────────────────────────────
DO_CLAUDE_FLOW=1     # claude-flow installé PAR DÉFAUT
DO_ECC=1
for arg in "$@"; do
  case "$arg" in
    --no-claude-flow) DO_CLAUDE_FLOW=0 ;;
    --with-claude-flow) DO_CLAUDE_FLOW=1 ;;   # rétro-compat : no-op (déjà par défaut)
    --no-ecc) DO_ECC=0 ;;
    --doctor) exec "$REPO_DIR/doctor.sh" ;;   # délègue au diagnostic
    -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) warn "Option inconnue ignorée : $arg" ;;
  esac
done

# ── Whitelist explicite : SEULS ces éléments sont copiés ───────
ITEMS=(skills agents commands rules helpers CLAUDE.md settings.json)

# ── Timeout portable (macOS n'a pas toujours `timeout`) ────────
run_timeout() { # run_timeout <secs> <cmd...>
  local secs="$1"; shift
  "$@" & local pid=$!
  ( sleep "$secs"; kill -9 "$pid" 2>/dev/null ) & local watcher=$!
  local rc=0
  wait "$pid" 2>/dev/null || rc=$?
  kill -9 "$watcher" 2>/dev/null || true
  wait "$watcher" 2>/dev/null || true
  return "$rc"
}

# ── Détection OS ───────────────────────────────────────────────
OS="$(uname -s)"
case "$OS" in
  Darwin) OS_NAME="macOS"; PKG_HINT="brew install node git" ;;
  Linux)  OS_NAME="Linux"; PKG_HINT="voir https://nodejs.org (ou votre gestionnaire de paquets)" ;;
  *)      OS_NAME="$OS";   PKG_HINT="voir https://nodejs.org" ;;
esac

echo
echo "${B}========================================${N}"
echo "${B} Claude Config — Installation${N}"
echo "${B}========================================${N}"
echo "  OS         : $OS_NAME"
echo "  Source     : $REPO_DIR"
echo "  Destination: $DST"
echo

# ── A. PRÉREQUIS ───────────────────────────────────────────────
info "Vérification des prérequis…"
MISSING_REQUIRED=0
have(){ command -v "$1" >/dev/null 2>&1; }

if have node; then ok "node $(node -v)"; else err "node absent — REQUIS (les hooks en dépendent)"; MISSING_REQUIRED=1; fi
if have npm;  then ok "npm  $(npm -v)";  else warn "npm absent (fourni avec Node.js — requis pour claude-flow et skills optionnels)"; fi
if have git;  then ok "git  $(git --version | awk '{print $3}')"; else err "git absent — REQUIS"; MISSING_REQUIRED=1; fi
if have claude; then ok "claude $(claude --version 2>/dev/null | awk '{print $1}')"; CLAUDE_OK=1; else warn "claude (Claude Code) absent — installe-le : https://claude.com/claude-code"; CLAUDE_OK=0; fi
if have npx;  then NPX_OK=1; else NPX_OK=0; fi

if [ "$MISSING_REQUIRED" -eq 1 ]; then
  echo
  err "Prérequis manquants. Installe-les puis relance :"
  echo "   $OS_NAME → $PKG_HINT"
  echo "   Node.js  → https://nodejs.org (version 18+ recommandée)"
  exit 1
fi
echo

# ── B. Ce qui va être fait ─────────────────────────────────────
info "Config copiée dans $DST : ${ITEMS[*]}"
[ "$DO_ECC" -eq 1 ]         && info "Plugin ECC         : installation automatique"
[ "$DO_CLAUDE_FLOW" -eq 1 ] && info "MCP claude-flow    : installation automatique (scope user)"
info "Ne seront JAMAIS touchés : .credentials.json, sessions, history, cache, telemetry, logs, projects, downloads."
echo

mkdir -p "$DST"

# ── C. Sauvegarde de l'existant ────────────────────────────────
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$DST/backups/config-backup-$STAMP"
BACKED_UP=0
for item in "${ITEMS[@]}"; do
  if [ -e "$DST/$item" ]; then
    mkdir -p "$BACKUP"
    cp -R "$DST/$item" "$BACKUP/" 2>/dev/null || true
    BACKED_UP=1
  fi
done
if [ "$BACKED_UP" -eq 1 ]; then ok "Sauvegarde de la config existante : $BACKUP"; else ok "Aucune config existante à sauvegarder (installation neuve)"; fi

# ── D. Copie de la configuration (whitelist) ───────────────────
for item in "${ITEMS[@]}"; do
  if [ -e "$SRC/$item" ]; then
    rm -rf "$DST/$item"
    cp -R "$SRC/$item" "$DST/$item"
    ok "Installé : $item"
  else
    warn "Absent du repo (ignoré) : $item"
  fi
done
# Rendre les scripts helpers exécutables (au cas où git n'aurait pas gardé le bit)
[ -d "$DST/helpers" ] && chmod +x "$DST/helpers"/*.sh 2>/dev/null || true
echo

# ── E. ECC : installation automatique guardée + idempotente ────
ECC_STATUS="non tenté"
if [ "$DO_ECC" -eq 1 ] && [ "$CLAUDE_OK" -eq 1 ]; then
  if claude plugin list 2>/dev/null | grep -q "ecc@ecc"; then
    ECC_STATUS="déjà installé"
    ok "Plugin ECC déjà installé."
  else
    info "Installation du plugin ECC (skills/agents 'ecc:')… (le clone du repo ECC peut prendre 1-2 min)"
    run_timeout 180 claude plugin marketplace add https://github.com/affaan-m/ECC.git </dev/null >/dev/null 2>&1 \
      || warn "marketplace déjà présent ou non ajouté (on continue)."
    if run_timeout 180 claude plugin install ecc@ecc --yes --scope user </dev/null >/dev/null 2>&1; then
      ECC_STATUS="installé"
      ok "Plugin ECC installé."
    else
      ECC_STATUS="action manuelle requise"
      warn "Installation auto d'ECC non aboutie (Claude Code peut-être pas encore configuré)."
    fi
  fi
elif [ "$DO_ECC" -eq 0 ]; then
  ECC_STATUS="désactivé (--no-ecc)"
else
  ECC_STATUS="action manuelle requise (claude CLI absent)"
fi
echo

# ── F. claude-flow / ruflo : MCP par défaut, scope user, idempotent ──
CF_STATUS="non tenté"
if [ "$DO_CLAUDE_FLOW" -eq 1 ] && [ "$CLAUDE_OK" -eq 1 ]; then
  if [ "$NPX_OK" -eq 0 ]; then
    CF_STATUS="ignoré (npx/npm absent)"
    warn "npx absent — impossible d'ajouter claude-flow (installe Node.js complet)."
  elif claude mcp get claude-flow >/dev/null 2>&1; then
    CF_STATUS="déjà configuré"
    ok "MCP claude-flow déjà configuré."
  else
    info "Ajout du serveur MCP claude-flow/ruflo (memory / routing / swarm / AgentDB)…"
    if run_timeout 60 claude mcp add -s user claude-flow -- npx -y ruflo@latest mcp start >/dev/null 2>&1; then
      CF_STATUS="ajouté (scope user)"
      ok "MCP claude-flow ajouté (approbation demandée au 1er lancement de Claude Code)."
    else
      CF_STATUS="échec (voir docs/dependencies.md)"
      warn "Ajout MCP claude-flow non abouti — voir docs/dependencies.md."
    fi
  fi
elif [ "$DO_CLAUDE_FLOW" -eq 0 ]; then
  CF_STATUS="désactivé (--no-claude-flow)"
else
  CF_STATUS="action manuelle requise (claude CLI absent)"
fi
echo

# ── G. Vérification post-installation ──────────────────────────
info "Vérification…"
SKILLS_N=$(find "$DST/skills" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
SKILLMD_N=$(find "$DST/skills" -maxdepth 2 -name SKILL.md 2>/dev/null | wc -l | tr -d ' ')
AGENTS_N=$(find "$DST/agents" -maxdepth 1 -mindepth 1 2>/dev/null | wc -l | tr -d ' ')
CMDS_N=$(find "$DST/commands" -maxdepth 1 -mindepth 1 2>/dev/null | wc -l | tr -d ' ')
RULES_N=$(find "$DST/rules" -type f 2>/dev/null | wc -l | tr -d ' ')
HELPERS_N=$(find "$DST/helpers" -maxdepth 1 -type f 2>/dev/null | wc -l | tr -d ' ')
chk(){ [ -e "$DST/$1" ] && echo "présent" || echo "${R}MANQUANT${N}"; }

# ── H. Résumé final ────────────────────────────────────────────
echo
echo "${B}========================================${N}"
echo "${B} Installation terminée${N}"
echo "${B}========================================${N}"
echo "  ${G}✓${N} Skills        : $SKILLS_N ($SKILLMD_N SKILL.md)"
echo "  ${G}✓${N} Agents        : $AGENTS_N"
echo "  ${G}✓${N} Commands      : $CMDS_N"
echo "  ${G}✓${N} Rules         : $RULES_N"
echo "  ${G}✓${N} Helpers       : $HELPERS_N"
echo "  ${G}✓${N} CLAUDE.md     : $(chk CLAUDE.md)"
echo "  ${G}✓${N} settings.json : $(chk settings.json)"
echo "  •   ECC           : $ECC_STATUS"
echo "  •   claude-flow   : $CF_STATUS"
echo "  •   Node          : $(node -v 2>/dev/null || echo absent)"
echo "  •   Claude CLI    : $([ "$CLAUDE_OK" -eq 1 ] && claude --version 2>/dev/null | awk '{print $1}' || echo absent)"
[ "$BACKED_UP" -eq 1 ] && echo "  •   Sauvegarde    : $BACKUP"
echo
echo "${B}Étape suivante${N} :"
echo "  1. Ouvre (ou redémarre) Claude Code."
if [ "$CF_STATUS" = "ajouté (scope user)" ]; then
  echo "  2. Au 1er lancement, approuve le serveur MCP claude-flow quand Claude Code le demande."
fi
case "$ECC_STATUS" in
  "action manuelle requise"*)
    echo "  •  Installe ECC manuellement dans un terminal Claude Code :"
    echo "        /plugin marketplace add https://github.com/affaan-m/ECC.git"
    echo "        /plugin install ecc@ecc" ;;
esac
echo
echo "${B}Vérifier que tout fonctionne${N} :"
echo "  ./doctor.sh                 # diagnostic complet de la stack"
echo
echo "ℹ️  Dépendances par skill (optionnelles) : voir docs/dependencies.md"
