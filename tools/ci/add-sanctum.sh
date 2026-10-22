#!/usr/bin/env bash
set -euo pipefail
[[ "$GITHUB_REF" == refs/heads/arena/c101d8c3-shopnext ]]
[[ "$APP_ENV" == testing && "$DB_DATABASE" == shopnext_ci_test ]]
cd backend
php -r '$c=json_decode(file_get_contents("composer.json"),true); if (isset($c["require"]["laravel/sanctum"])) { exit(1); }'
composer require 'laravel/sanctum:^4.0' --with-all-dependencies --no-interaction --no-progress
composer validate --strict
composer check-platform-reqs
cp .env.example .env
php artisan key:generate --force --no-interaction
vendor/bin/pint --test
php artisan migrate:fresh --force --no-interaction
vendor/bin/pest --ci
composer show --locked --format=json > ../docs/ci/sanctum-resolve.json
