#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RULES="$ROOT/.codex/rules/default.rules"

if ! command -v codex >/dev/null 2>&1; then
  echo "Codex CLI não encontrado; teste de execpolicy ignorado."
  exit 0
fi

check() {
  local expected="$1"
  shift
  local output
  output="$(codex execpolicy check --pretty --rules "$RULES" -- "$@")"
  echo "$output"
  echo "$output" | grep -q "\"decision\": \"$expected\""
}

check forbidden rm -rf /
check forbidden git reset --hard
check prompt git push origin feature
check prompt terraform apply

echo "Execpolicy OK"
