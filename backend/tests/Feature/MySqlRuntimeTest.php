<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;

it('actually uses the selected MySQL or MariaDB server, not SQLite', function () {
    expect(app()->environment())->toBe('testing');
    expect(DB::connection()->getDriverName())->toBe('mysql');
    expect(DB::connection()->getDatabaseName())->toBe('shopnext_ci_test');
    $version = DB::selectOne('SELECT VERSION() AS version')->version;
    $series = getenv('CI_DB_SERIES') ?: '8.0.';
    $family = getenv('CI_DB_FAMILY') ?: 'mysql';
    expect($version)->toStartWith($series);
    expect(str_contains(strtolower($version), 'mariadb'))->toBe($family === 'mariadb');
});
