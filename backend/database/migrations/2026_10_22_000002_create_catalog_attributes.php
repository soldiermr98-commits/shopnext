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
        Schema::create('catalog_attributes', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->enum('type', ['select', 'color', 'image'])->default('select');
            $table->timestamps();
        });
        Schema::create('attribute_terms', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('attribute_id')->constrained('catalog_attributes')->restrictOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->char('hex', 7)->nullable();
            $table->string('image')->nullable();
            $table->unsignedInteger('order_index')->default(0);
            $table->timestamps();
            $table->unique(['attribute_id', 'slug']);
            $table->unique(['id', 'attribute_id'], 'attribute_terms_identity_owner');
            $table->index(['attribute_id', 'order_index', 'id'], 'attribute_terms_list');
        });
        DB::statement("ALTER TABLE attribute_terms ADD CONSTRAINT attribute_terms_hex_safe CHECK (`hex` IS NULL OR `hex` REGEXP '^#[0-9A-Fa-f]{6}$')");
        Schema::create('product_attribute_terms', function (Blueprint $table): void {
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->unsignedBigInteger('term_id');
            $table->unsignedBigInteger('attribute_id');
            $table->primary(['product_id', 'term_id']);
            $table->index(['attribute_id', 'product_id']);
            $table->foreign(['term_id', 'attribute_id'], 'product_attribute_terms_owner_fk')->references(['id', 'attribute_id'])->on('attribute_terms')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_attribute_terms');
        Schema::dropIfExists('attribute_terms');
        Schema::dropIfExists('catalog_attributes');
    }
};
