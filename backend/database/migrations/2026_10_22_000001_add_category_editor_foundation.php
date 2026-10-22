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
        Schema::create('catalog_locks', function (Blueprint $table): void {
            $table->string('name', 32)->primary();
        });
        DB::table('catalog_locks')->insert(['name' => 'taxonomy']);
        Schema::table('categories', function (Blueprint $table): void {
            $table->index(['order_index', 'id'], 'categories_admin_order');
            $table->string('meta_title', 160)->nullable();
            $table->string('meta_description', 320)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table): void {
            $table->dropIndex('categories_admin_order');
            $table->dropColumn(['meta_title', 'meta_description']);
        });
        Schema::dropIfExists('catalog_locks');
    }
};
