#!/usr/bin/env bash
# Preserve Pint's failing exit code; surface file/rule diagnostics when ZIP logs
# cannot be retrieved. Run from backend/. No source content or secrets are emitted.
set -uo pipefail
report="$(mktemp)"
trap 'rm -f "$report"' EXIT
status=0
vendor/bin/pint --test --format=json > "$report" || status=$?
cat "$report"
if [ "$status" -ne 0 ]; then
  php -r '
    $report = json_decode(file_get_contents($argv[1]), true);
    if (! is_array($report)) {
        echo "::notice::Pint failed without a JSON report; inspect the job output.\n";
        exit;
    }
    foreach (($report["files"] ?? []) as $file) {
        $safe = ["name" => $file["name"] ?? $file["path"] ?? "unknown", "fixers" => $file["appliedFixers"] ?? $file["fixers"] ?? $file["issues"] ?? []];
        $message = json_encode($safe, JSON_UNESCAPED_SLASHES);
        echo "::notice title=Pint style diagnostics::".str_replace(["%", "\r", "\n"], ["%25", "%0D", "%0A"], $message)."\n";
    }
  ' "$report"
fi
exit "$status"
