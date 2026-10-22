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
        Schema::table('product_variants', function (Blueprint $table): void {
            $table->char('combination_key', 64)->nullable();
            $table->softDeletes();
            $table->unique(['product_id', 'combination_key'], 'variant_combination_unique');
            $table->index(['product_id', 'deleted_at', 'id'], 'variant_active_list');
        });
        Schema::create('variant_attribute_terms', function (Blueprint $table): void {
            $table->unsignedBigInteger('variant_id');
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('attribute_id');
            $table->unsignedBigInteger('term_id');
            $table->primary(['variant_id', 'attribute_id']);
            $table->foreign(['variant_id', 'product_id'], 'variant_options_product_fk')->references(['id', 'product_id'])->on('product_variants')->restrictOnDelete();
            $table->foreign(['term_id', 'attribute_id'], 'variant_options_term_fk')->references(['id', 'attribute_id'])->on('attribute_terms')->restrictOnDelete();
            $table->foreign(['product_id', 'term_id'], 'variant_options_membership_fk')->references(['product_id', 'term_id'])->on('product_attribute_terms')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        if (DB::table('variant_attribute_terms')->exists() || DB::table('product_variants')->whereNotNull('deleted_at')->orWhereNotNull('combination_key')->exists()) {
            throw new RuntimeException('Variant matrix or trash state exists: use a reviewed forward migration.');
        }
        Schema::dropIfExists('variant_attribute_terms');
        Schema::table('product_variants', function (Blueprint $table): void {
            $table->dropUnique('variant_combination_unique');
            $table->dropIndex('variant_active_list');
            $table->dropColumn(['combination_key', 'deleted_at']);
        });
    }
};
