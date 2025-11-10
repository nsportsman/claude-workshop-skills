#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: install-skill.sh <skill-name>

Copies the requested skill (and any supporting hooks/settings/MCP files)
into your local Claude workspace (defaults to ~/.claude). Set CLAUDE_HOME
to override the destination.

Available skills:
  - chrome-devtools
  - diagram
  - github
  - review
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

SKILL="$1"
CLAUDE_HOME="${CLAUDE_HOME:-$HOME/.claude}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SKILL_SRC="${REPO_ROOT}/skills/${SKILL}"
SKILL_DEST="${CLAUDE_HOME}/skills/${SKILL}"

if [[ ! -d "${SKILL_SRC}" ]]; then
  echo "Unknown skill '${SKILL}'. Run with no arguments to see available skills." >&2
  exit 1
fi

declare -a EXTRAS=()
ALLOW_HINT=""

case "${SKILL}" in
  chrome-devtools)
    EXTRAS=(
      "hooks/hooks.chrome-devtools.ts"
      "settings/settings.chrome-devtools.json"
      "mcp/mcp.chrome-devtools.json"
    )
    ALLOW_HINT='Add "Skill(chrome-devtools)" to settings.json if it is not already present.'
    ;;
  github)
    EXTRAS=(
      "hooks/hooks.github.ts"
      "settings/settings.github.json"
    )
    ALLOW_HINT='Ensure "Skill(github)" appears in settings.json.'
    ;;
  diagram)
    ALLOW_HINT='Optionally add "Skill(diagram)" to settings.json to whitelist prompt usage.'
    ;;
  review)
    ALLOW_HINT='Ensure "Skill(review)" remains in settings.json so Claude can load reviewer personas.'
    ;;
esac

echo "Installing '${SKILL}' into ${CLAUDE_HOME}"
mkdir -p "${CLAUDE_HOME}/skills"
rsync -a "${SKILL_SRC}/" "${SKILL_DEST}/"

for path in "${EXTRAS[@]}"; do
  SRC_PATH="${REPO_ROOT}/${path}"
  DEST_PATH="${CLAUDE_HOME}/${path}"
  mkdir -p "$(dirname "${DEST_PATH}")"
  rsync -a "${SRC_PATH}" "${DEST_PATH}"
done

if [[ -n "${ALLOW_HINT}" ]]; then
  echo ""
  echo "Next steps:"
  echo "  - ${ALLOW_HINT}"
fi

if [[ "${SKILL}" == "chrome-devtools" ]]; then
  echo "  - Ensure 'bun' is installed so the Chrome DevTools MCP server and hooks run correctly."
  echo "  - Review skills/chrome-devtools/README.md for workflow examples."
fi

echo ""
echo "All files copied. Restart Claude (or reload the workspace) to pick up the new skill."

