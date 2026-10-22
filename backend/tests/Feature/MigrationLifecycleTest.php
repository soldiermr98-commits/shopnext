<?php

declare(strict_types=1);

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

it('can migrate down and up on the dedicated MySQL database', function () {
    $this->artisan('migrate:fresh', ['--force' => true])->assertExitCode(0);
    // A narrower rollback must retain the legacy parent FK support even when
    // InnoDB silently replaced its implicit index with the new composite index.
    $variants = require database_path('migrations/2026_10_22_000004_add_variant_matrix.php');
    $variants->down();
    expect(Schema::hasIndex('product_variants', ['product_id']))->toBeTrue();
    expect(Schema::hasColumn('product_variants', 'combination_key'))->toBeFalse();
    expect(fn () => DB::table('product_variants')->insert(['product_id' => 999999, 'sku' => 'ORPHAN', 'price' => 100]))->toThrow(QueryException::class);
    $variants->up();
    expect(Schema::hasTable('variant_attribute_terms'))->toBeTrue();
    $this->artisan('migrate:rollback', ['--force' => true])->assertExitCode(0);
    expect(Schema::hasTable('users'))->toBeFalse();
    expect(Schema::hasTable('order_items'))->toBeFalse();
    $this->artisan('migrate', ['--force' => true])->assertExitCode(0);
    expect(Schema::hasTable('order_items'))->toBeTrue();
});
