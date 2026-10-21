#!/usr/bin/env bash
set -euo pipefail
# Run on a trusted build machine. Never package a host's live working directory.
root="$(cd "$(dirname "$0")/.." && pwd)"
output="${1:-$root/build/shopnext-l1.zip}"
mkdir -p "$(dirname "$output")"
output="$(cd "$(dirname "$output")" && pwd)/$(basename "$output")"
for cmd in php composer bun node zip tar python3 git; do command -v "$cmd" >/dev/null || { echo "Missing build tool: $cmd" >&2; exit 1; }; done
php -r 'exit(version_compare(PHP_VERSION, "8.2.0", ">=") ? 0 : 1);'
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/app" "$work/public"
# Only tracked application files. Never copy .env, uploads, sessions, logs or caches.
git -C "$root" archive HEAD backend | tar -x -C "$work"
cp -a "$work/backend/." "$work/app/"
rm -rf "$work/backend" "$work/app/tests" "$work/app/storage" "$work/app/bootstrap/cache" "$work/app/public"
mkdir -p "$work/app/bootstrap/cache" "$work/app/storage/"{app/private,app/public,framework/cache/data,framework/sessions,framework/views,logs}
git -C "$root" archive HEAD backend/public | tar -x -C "$work"
cp -a "$work/backend/public/." "$work/public/"
rm -rf "$work/backend"
printf 'shopnext\n' > "$work/public/.shopnext-public"
export APP_ENV=production APP_DEBUG=false
# Do not inherit private application/database/provider configuration from a developer shell.
# Laravel is booted without an .env solely to discover packages and publish assets.
(
  cd "$work/app"
  env -u APP_KEY composer install --no-dev --prefer-dist --no-interaction --no-progress --classmap-authoritative
  composer check-platform-reqs --no-dev
  php artisan filament:assets --no-interaction
)
(cd "$root" && bun install --frozen-lockfile && npm run build)
cp -a "$root/client/dist/." "$work/public/"
mv "$work/public/index.html" "$work/app/resources/spa.html"
# Keep Laravel's front controller; SPA HTML is private and cannot bypass CSP.
python3 - "$work/public/index.php" <<'PYINDEX'
from pathlib import Path
import sys
p = Path(sys.argv[1]); s = p.read_text()
s = s.replace("__DIR__.'/../storage/", "__DIR__.'/../app/storage/")
s = s.replace("__DIR__.'/../vendor/", "__DIR__.'/../app/vendor/")
s = s.replace("__DIR__.'/../bootstrap/", "__DIR__.'/../app/bootstrap/")
s = s.replace("define('LARAVEL_START'", "define('SHOPNEXT_PUBLIC_PATH', __DIR__);\n\ndefine('LARAVEL_START'")
p.write_text(s)
PYINDEX
# Compiled caches must be generated on the host, not copied from the builder.
rm -f "$work/app/bootstrap/cache/config.php" "$work/app/bootstrap/cache/routes-"*.php
cp "$root/tools/activate-runner.php" "$root/tools/invoke-runner.php" "$work/"
printf '%s\n' "$(git -C "$root" rev-parse HEAD)" > "$work/REVISION"
rm -f "$output"
(cd "$work" && zip -qr "$output" app public REVISION activate-runner.php invoke-runner.php)
echo "Upload package built: $output (no live .env, no active migration runner)"
