<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;

it('actually uses the dedicated MySQL database, not SQLite', function () {
    expect(app()->environment())->toBe('testing');
    expect(DB::connection()->getDriverName())->toBe('mysql');
    expect(DB::connection()->getDatabaseName())->toBe('shopnext_ci_test');
    expect(DB::selectOne('SELECT VERSION() AS version')->version)->toStartWith('8.0.');
});
