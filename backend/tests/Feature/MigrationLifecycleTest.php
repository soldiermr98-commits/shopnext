<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Schema;

it('can migrate down and up on the dedicated MySQL database', function () {
    $this->artisan('migrate:fresh', ['--force' => true])->assertExitCode(0);
    $this->artisan('migrate:rollback', ['--force' => true])->assertExitCode(0);
    expect(Schema::hasTable('users'))->toBeFalse();
    expect(Schema::hasTable('order_items'))->toBeFalse();
    $this->artisan('migrate', ['--force' => true])->assertExitCode(0);
    expect(Schema::hasTable('order_items'))->toBeTrue();
});
