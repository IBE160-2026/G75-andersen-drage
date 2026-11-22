#!/usr/bin/env bash
# Runs every suite inside the `test` service (AD-18). Exits non-zero if any suite fails.
set -uo pipefail
cd "$(dirname "$0")/.."

status=0
run() {
  echo "==> $1"
  shift
  if ! "$@"; then
    echo "!! FAILED: $*"
    status=1
  fi
}

run "Vitest (web)" bash -c "cd web && npx vitest run"
run "pytest (proxy)" bash -c "cd proxy && uv run --frozen pytest -q -p no:cacheprovider"
run "Playwright (e2e)" bash -c "cd e2e && npx playwright test"

exit $status
