#!/usr/bin/env bash
# Capture diagnostic output and preserve the original command's exact exit code.
set -uo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
label="$1"
shift
report="$(mktemp -d)"
trap 'rm -rf "$report"' EXIT
status=0
"$@" > "$report/$label.log" 2>&1 || status=$?
python3 "$root/tools/ci/publish-report.py" "$report/$label.log"
exit "$status"
