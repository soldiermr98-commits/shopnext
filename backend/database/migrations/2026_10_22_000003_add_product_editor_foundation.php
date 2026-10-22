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
        Schema::table('products', function (Blueprint $table): void {
            $table->dateTime('published_at')->nullable();
            $table->string('meta_title', 160)->nullable();
            $table->string('meta_description', 320)->nullable();
            $table->softDeletes();
            $table->index(['deleted_at', 'status', 'published_at'], 'products_publication');
        });
    }

    public function down(): void
    {
        if (DB::table('products')->whereNotNull('deleted_at')->orWhereNotNull('published_at')->orWhereNotNull('meta_title')->orWhereNotNull('meta_description')->exists()) {
            throw new RuntimeException('Product editorial state exists: use a reviewed forward migration, never discard publication or trash state.');
        }
        Schema::table('products', function (Blueprint $table): void {
            $table->dropIndex('products_publication');
            $table->dropColumn(['published_at', 'meta_title', 'meta_description', 'deleted_at']);
        });
    }
};
