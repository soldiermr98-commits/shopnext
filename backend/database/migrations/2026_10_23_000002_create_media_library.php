<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media_assets', function (Blueprint $table): void {
            $table->id();
            $table->string('filename', 52)->unique();
            $table->string('folder', 100)->default('');
            $table->string('alt', 255)->default('');
            $table->string('sha256', 64);
            $table->string('conversion_status', 20)->default('pending');
            $table->json('variants')->nullable();
            $table->timestamps();
            $table->index(['folder', 'id']);
        });
    }

    public function down(): void
    {
        if (DB::table('media_assets')->exists()) {
            throw new RuntimeException('Export media metadata before rollback.');
        }
        Schema::dropIfExists('media_assets');
    }
};
