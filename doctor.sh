#!/usr/bin/env bash
#
# doctor.sh — Diagnostic de la stack Claude Config.
#
#   ./doctor.sh
#
# Vérifie que l'installation est réellement FONCTIONNELLE (pas seulement copiée) :
# outils système, config partageable, hooks, plugin ECC, MCP claude-flow/ruflo.
# Ne modifie rien. Code de sortie : 0 si aucun échec critique, 1 sinon.

set -uo pipefail

if [ -t 1 ]; then
  B=$'\033[1m'; G=$'\033[0;32m'; Y=$'\033[0;33m'; R=$'\033[0;31m'; C=$'\033[0;36m'; N=$'\033[0m'
else
  B=""; G=""; Y=""; R=""; C=""; N=""
fi

DST="$HOME/.claude"
FAIL=0; WARN=0
pass(){ echo "  ${G}✓${N} $*"; }
soft(){ echo "  ${Y}!${N} $*"; WARN=$((WARN+1)); }
hard(){ echo "  ${R}✗${N} $*"; FAIL=$((FAIL+1)); }
have(){ command -v "$1" >/dev/null 2>&1; }

EXPECTED_SKILLS=65

echo
echo "${B}========================================${N}"
echo "${B} Claude Config — Doctor${N}"
echo "${B}========================================${N}"

# ── 1. Outils système ──────────────────────────────────────────
echo "${C}Outils système${N}"
have node   && pass "node $(node -v)"                      || hard "node absent (REQUIS — hooks)"
have npm    && pass "npm $(npm -v)"                        || soft "npm absent (claude-flow / skills optionnels)"
have npx    && pass "npx présent"                          || soft "npx absent (claude-flow)"
have git    && pass "git $(git --version | awk '{print $3}')" || hard "git absent (REQUIS)"
have claude && pass "claude $(claude --version 2>/dev/null | awk '{print $1}')" || soft "claude (Claude Code) absent"

# ── 2. Config partageable ──────────────────────────────────────
echo "${C}Configuration (~/.claude)${N}"
count(){ find "$1" $2 2>/dev/null | wc -l | tr -d ' '; }
S=$(count "$DST/skills" "-maxdepth 1 -mindepth 1 -type d")
SM=$(count "$DST/skills" "-maxdepth 2 -name SKILL.md")
[ "$S" -ge "$EXPECTED_SKILLS" ] && pass "skills : $S (attendu ≥ $EXPECTED_SKILLS, $SM SKILL.md)" \
  || hard "skills : $S (< $EXPECTED_SKILLS attendu)"
[ "$S" -eq "$SM" ] || soft "skills sans SKILL.md : $((S - SM))"
A=$(count "$DST/agents"   "-maxdepth 1 -mindepth 1"); [ "$A" -gt 0 ] && pass "agents : $A"     || hard "agents absents"
CM=$(count "$DST/commands" "-maxdepth 1 -mindepth 1"); [ "$CM" -gt 0 ] && pass "commands : $CM" || hard "commands absents"
RU=$(count "$DST/rules"    "-type f"); [ "$RU" -gt 0 ] && pass "rules : $RU"                    || hard "rules absentes"
HE=$(count "$DST/helpers"  "-maxdepth 1 -type f"); [ "$HE" -gt 0 ] && pass "helpers : $HE"      || hard "helpers absents"
[ -f "$DST/CLAUDE.md" ]     && pass "CLAUDE.md présent"     || hard "CLAUDE.md manquant"
[ -f "$DST/settings.json" ] && pass "settings.json présent" || hard "settings.json manquant"

# ── 3. Hooks actifs ────────────────────────────────────────────
echo "${C}Hooks${N}"
if [ -f "$DST/settings.json" ] && grep -q '"hooks"' "$DST/settings.json"; then
  pass "hooks déclarés dans settings.json"
  [ -f "$DST/helpers/hook-handler.cjs" ] && pass "helpers/hook-handler.cjs présent" \
    || hard "hook-handler.cjs manquant (hooks cassés)"
  if have node && [ -f "$DST/helpers/hook-handler.cjs" ]; then
    node --check "$DST/helpers/hook-handler.cjs" >/dev/null 2>&1 \
      && pass "hook-handler.cjs : syntaxe valide" || soft "hook-handler.cjs : node --check a échoué"
  fi
else
  hard "aucun bloc \"hooks\" dans settings.json"
fi

# ── 4. Plugin ECC ──────────────────────────────────────────────
echo "${C}Plugin ECC${N}"
if have claude; then
  ECC_LINE=$(claude plugin list 2>/dev/null | grep -A3 "ecc@ecc" || true)
  if [ -n "$ECC_LINE" ]; then
    if echo "$ECC_LINE" | grep -qi "enabled"; then pass "ecc@ecc installé et enabled"
    else soft "ecc@ecc installé mais pas enabled (claude plugin enable ecc@ecc)"; fi
  else
    hard "ecc@ecc non installé (claude plugin install ecc@ecc)"
  fi
else
  soft "claude absent — impossible de vérifier ECC"
fi

# ── 5. MCP claude-flow / ruflo / AgentDB ───────────────────────
echo "${C}claude-flow / Ruflo / AgentDB / MCP${N}"
if have claude; then
  if claude mcp get claude-flow >/dev/null 2>&1; then
    pass "MCP claude-flow configuré"
    claude mcp list 2>/dev/null | grep -qE "claude-flow.*(Connected|Pending)" \
      && pass "claude-flow joignable (memory/routing/swarm/AgentDB via ruflo)" \
      || soft "claude-flow configuré mais pas encore approuvé/connecté (ouvre Claude Code pour approuver)"
  else
    soft "MCP claude-flow non configuré → features avancées en mode dégradé (./install.sh)"
  fi
else
  soft "claude absent — impossible de vérifier les MCP"
fi
if have npx; then pass "ruflo installable à la volée (npx -y ruflo@latest)"; else soft "npx absent — ruflo indisponible"; fi

# ── Résumé ─────────────────────────────────────────────────────
echo
echo "${B}========================================${N}"
if [ "$FAIL" -eq 0 ] && [ "$WARN" -eq 0 ]; then
  echo "${G}${B} ✅ Tout est OK — stack complète et fonctionnelle${N}"
elif [ "$FAIL" -eq 0 ]; then
  echo "${Y}${B} ⚠ Fonctionnel avec $WARN avertissement(s) (features optionnelles)${N}"
else
  echo "${R}${B} ✗ $FAIL problème(s) critique(s), $WARN avertissement(s)${N}"
fi
echo "${B}========================================${N}"
echo
[ "$FAIL" -eq 0 ]
