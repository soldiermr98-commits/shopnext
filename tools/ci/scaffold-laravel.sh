#!/usr/bin/env bash
# One-time, real Composer bootstrap in CI. No application/domain implementation.
set -euo pipefail
[[ "$GITHUB_REF" == refs/heads/arena/c101d8c3-shopnext ]]
[[ ! -f backend/composer.json ]]
[[ "$APP_ENV" == testing && "$DB_DATABASE" == shopnext_ci_test ]]
composer create-project laravel/laravel /tmp/shopnext-laravel '^12.0' --no-install --no-interaction
cp -a /tmp/shopnext-laravel/. backend/
cd backend
composer config platform.php 8.2.0
composer config allow-plugins.pestphp/pest-plugin true
composer require --dev 'pestphp/pest:^3.0' 'pestphp/pest-plugin-laravel:^3.0' --with-all-dependencies --no-interaction --no-progress
# Let the actual solver select Filament on PHP 8.2/Laravel 12; do not preselect a major.
composer require filament/filament --with-all-dependencies --no-interaction --no-progress
python3 - <<'PY'
from pathlib import Path
import xml.etree.ElementTree as ET
p=Path('phpunit.xml');t=ET.parse(p)
for e in list(t.getroot().find('php')):
 if e.attrib.get('name','').startswith('DB_'): t.getroot().find('php').remove(e)
t.write(p,encoding='unicode')
Path('tests/Pest.php').write_text("<?php\n\ndeclare(strict_types=1);\n\npest()->extend(Tests\\TestCase::class)->in('Feature');\n")
Path('tests/Feature/MySqlRuntimeTest.php').write_text('''<?php

declare(strict_types=1);

use Illuminate\\Support\\Facades\\DB;

it('actually uses the dedicated MySQL database, not SQLite', function () {
    expect(app()->environment())->toBe('testing');
    expect(DB::connection()->getDriverName())->toBe('mysql');
    expect(DB::connection()->getDatabaseName())->toBe('shopnext_ci_test');
    expect(DB::selectOne('SELECT VERSION() AS version')->version)->toStartWith('8.0.');
});
''')
for directory in ['app','bootstrap','config','database','routes','tests']:
 for p in Path(directory).rglob('*.php'):
  s=p.read_text()
  if s.startswith('<?php') and 'declare(strict_types=1)' not in s:
   p.write_text(s.replace('<?php','<?php\n\ndeclare(strict_types=1);',1))
PY
cp .env.example .env
php artisan key:generate --force --no-interaction
composer validate --strict
composer check-platform-reqs
php artisan migrate:fresh --force --no-interaction
vendor/bin/pint
vendor/bin/pint --test
vendor/bin/pest --ci
mkdir -p ../docs/ci
composer show --locked --format=json > ../docs/ci/composer-resolve.json
composer show filament/filament
composer show laravel/framework
