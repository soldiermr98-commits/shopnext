#!/usr/bin/env bash
# Preserve Pint's failing exit code; surface file/rule diagnostics when ZIP logs
# cannot be retrieved. Run from backend/. No source content or secrets are emitted.
set -uo pipefail
report="$(mktemp)"
trap 'rm -f "$report"' EXIT
status=0
vendor/bin/pint --test --format=agent > "$report" || status=$?
cat "$report"
if [ "$status" -ne 0 ]; then
  python3 - "$report" <<'PYREPORT'
import json, sys

def metadata(value):
    if isinstance(value, dict):
        return {k: metadata(v) for k, v in value.items()
                if k not in {'diff', 'code', 'content', 'before', 'after', 'source'}}
    if isinstance(value, list):
        return [metadata(v) for v in value]
    return value

try:
    report = metadata(json.load(open(sys.argv[1])))
    message = json.dumps(report, ensure_ascii=False)[:30000]
except (ValueError, OSError):
    message = 'Pint failed without a readable JSON report; inspect job output.'
message = message.replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
print('::notice title=Pint diagnostics::' + message)
PYREPORT
fi
exit "$status"
