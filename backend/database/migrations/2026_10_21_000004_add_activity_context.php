<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activity_logs', function (Blueprint $t): void {
            $t->string('actor_role', 32)->nullable();
            $t->string('ip_address', 45)->nullable();
            $t->json('before')->nullable();
            $t->json('after')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('activity_logs', fn (Blueprint $t) => $t->dropColumn(['actor_role', 'ip_address', 'before', 'after']));
    }
};
