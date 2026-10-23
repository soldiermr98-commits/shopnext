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
            $table->json('gallery_alt_texts')->nullable();
            $table->json('faqs')->nullable();
        });
        Schema::create('product_relations', function (Blueprint $table): void {
            $table->foreignId('source_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('target_id')->constrained('products')->restrictOnDelete();
            $table->enum('kind', ['related', 'upsell', 'cross_sell']);
            $table->unsignedSmallInteger('order_index');
            $table->primary(['source_id', 'kind', 'target_id']);
            $table->unique(['source_id', 'kind', 'order_index']);
        });
        DB::statement('ALTER TABLE product_relations ADD CONSTRAINT product_relations_not_self CHECK (source_id <> target_id)');
    }

    public function down(): void
    {
        if (DB::table('product_relations')->exists() || DB::table('products')->whereNotNull('gallery_alt_texts')->orWhereNotNull('faqs')->exists()) {
            throw new RuntimeException('Product editorial content exists: use a reviewed forward migration.');
        }
        Schema::dropIfExists('product_relations');
        Schema::table('products', fn (Blueprint $table) => $table->dropColumn(['gallery_alt_texts', 'faqs']));
    }
};
