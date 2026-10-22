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
        if (! in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true)) {
            throw new RuntimeException('This schema requires MySQL/MariaDB, not SQLite.');
        }
        Schema::create('categories', function (Blueprint $t): void {
            $t->id();
            $t->string('title');
            $t->string('slug')->unique();
            $t->foreignId('parent_id')->nullable()->constrained('categories')->restrictOnDelete();
            $t->string('image')->nullable();
            $t->unsignedInteger('order_index')->default(0);
            $t->boolean('featured')->default(false);
            $t->timestamps();
        });
        Schema::create('brands', function (Blueprint $t): void {
            $t->id();
            $t->string('name');
            $t->string('slug')->unique();
            $t->string('logo')->nullable();
            $t->timestamps();
        });
        Schema::create('products', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('brand_id')->nullable()->constrained()->restrictOnDelete();
            $t->string('title');
            $t->string('slug')->unique();
            $t->string('sku')->unique();
            $t->enum('type', ['simple', 'variable', 'digital', 'bundle'])->default('simple');
            $t->unsignedBigInteger('price'); // Integer Toman, not Rial or floating point.
            $t->unsignedBigInteger('sale_price')->nullable();
            $t->unsignedInteger('stock')->default(0);
            $t->unsignedInteger('low_stock_threshold')->default(5);
            $t->string('main_image')->default('/images/catalog-placeholder.svg');
            $t->json('gallery_images')->nullable();
            $t->json('attributes')->nullable();
            $t->json('specifications')->nullable();
            $t->json('tags')->nullable();
            $t->text('short_description')->nullable();
            $t->longText('full_description')->nullable();
            $t->enum('status', ['draft', 'published', 'scheduled'])->default('draft')->index();
            $t->boolean('featured')->default(false);
            $t->timestamps();
            $t->index(['status', 'created_at']);
        });
        Schema::create('category_product', function (Blueprint $t): void {
            $t->foreignId('category_id')->constrained()->cascadeOnDelete();
            $t->foreignId('product_id')->constrained()->cascadeOnDelete();
            $t->primary(['category_id', 'product_id']);
        });
        Schema::create('product_variants', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('product_id')->constrained()->restrictOnDelete();
            $t->string('sku')->unique();
            $t->string('color_name')->nullable();
            $t->string('color_hex', 7)->nullable();
            $t->string('size')->nullable();
            $t->unsignedBigInteger('price');
            $t->unsignedBigInteger('sale_price')->nullable();
            $t->unsignedInteger('stock')->default(0);
            $t->string('image')->nullable();
            $t->timestamps();
        });
        Schema::create('addresses', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('title');
            $t->string('recipient_name');
            $t->string('recipient_phone', 11);
            $t->string('province');
            $t->string('city');
            $t->string('postal_code', 10);
            $t->text('street_address');
            $t->string('unit')->nullable();
            $t->boolean('is_default')->default(false);
            $t->timestamps();
        });
        Schema::create('coupons', function (Blueprint $t): void {
            $t->id();
            $t->string('code', 100)->unique();
            $t->enum('type', ['fixed', 'percentage']);
            $t->unsignedBigInteger('value');
            $t->unsignedBigInteger('min_order_amount')->default(0);
            $t->unsignedBigInteger('max_discount_amount')->nullable();
            $t->unsignedInteger('usage_limit')->nullable();
            $t->unsignedInteger('used_count')->default(0);
            $t->timestamp('expires_at')->nullable()->index();
            $t->boolean('is_active')->default(false);
            $t->timestamps();
        });
        Schema::create('orders', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('user_id')->constrained()->restrictOnDelete();
            $t->string('order_number')->unique();
            $t->string('tracking_code')->unique();
            $t->string('customer_name');
            $t->string('customer_phone', 11);
            $t->json('shipping_address'); // Immutable address snapshot, not a live address FK.
            $t->enum('status', ['pending', 'awaiting_payment', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'failed'])->default('pending')->index();
            $t->foreignId('coupon_id')->nullable()->constrained()->restrictOnDelete();
            $t->string('coupon_code')->nullable();
            foreach (['subtotal', 'items_discount', 'coupon_discount', 'shipping_fee', 'vat_amount', 'total_paid'] as $column) {
                $t->unsignedBigInteger($column)->default(0);
            }
            $t->boolean('is_paid')->default(false);
            $t->timestamps();
            $t->index(['user_id', 'created_at']);
        });
        Schema::create('order_items', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('order_id')->constrained()->restrictOnDelete();
            $t->foreignId('product_id')->constrained()->restrictOnDelete();
            $t->foreignId('product_variant_id')->nullable()->constrained()->restrictOnDelete();
            $t->string('title');
            $t->string('sku');
            $t->unsignedInteger('quantity');
            $t->unsignedBigInteger('unit_price');
            $t->json('snapshot')->nullable();
            $t->timestamps();
        });
        Schema::create('transactions', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('order_id')->constrained()->restrictOnDelete();
            $t->string('gateway', 50);
            $t->string('authority')->nullable();
            $t->unsignedBigInteger('amount');
            $t->enum('unit', ['TOMAN', 'RIAL'])->default('TOMAN');
            $t->enum('status', ['pending', 'verified', 'failed', 'refunded'])->default('pending')->index();
            $t->timestamps();
            $t->unique(['gateway', 'authority']);
        });
        Schema::create('return_requests', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('order_id')->constrained()->restrictOnDelete();
            $t->foreignId('user_id')->constrained()->restrictOnDelete();
            $t->json('items');
            $t->unsignedBigInteger('total_refund_amount')->default(0);
            $t->enum('status', ['pending', 'approved', 'rejected', 'completed'])->default('pending')->index();
            $t->timestamps();
        });
        Schema::create('settings', function (Blueprint $t): void {
            $t->id();
            $t->string('key')->unique();
            $t->text('value'); // Encrypt via cast before use; no plaintext seed values.
            $t->timestamps();
        });
        Schema::create('activity_logs', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->string('action');
            $t->string('module');
            $t->string('subject_id')->nullable();
            $t->json('changed_fields')->nullable(); // Field names only, never request bodies.
            $t->timestamps();
            $t->index(['user_id', 'created_at']);
        });
        Schema::create('blog_posts', function (Blueprint $t): void {
            $t->id();
            $t->string('title');
            $t->string('slug')->unique();
            $t->string('cover_image')->nullable();
            $t->text('excerpt')->nullable();
            $t->longText('content');
            $t->enum('status', ['draft', 'published'])->default('draft');
            $t->timestamps();
        });
        Schema::create('banners', function (Blueprint $t): void {
            $t->id();
            $t->string('title');
            $t->string('image');
            $t->string('link');
            $t->boolean('active')->default(false);
            $t->unsignedInteger('order_index')->default(0);
            $t->timestamps();
        });
        Schema::create('scheduler_heartbeats', function (Blueprint $t): void {
            $t->string('name')->primary();
            $t->timestamp('started_at')->nullable();
            $t->timestamp('completed_at')->nullable();
            $t->timestamp('worker_completed_at')->nullable();
            $t->boolean('worker_failed')->default(false);
        });
        foreach (['products', 'product_variants'] as $table) {
            DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$table}_sale_bounds CHECK (sale_price IS NULL OR sale_price <= price)");
            DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$table}_safe_money CHECK (price <= 9007199254740991 AND (sale_price IS NULL OR sale_price <= 9007199254740991))");
        }
        DB::statement('ALTER TABLE order_items ADD CONSTRAINT order_items_positive_quantity CHECK (quantity > 0)');
        DB::statement("ALTER TABLE coupons ADD CONSTRAINT coupons_percentage_bounds CHECK (type <> 'percentage' OR value <= 100)");
    }

    public function down(): void
    {
        foreach (['scheduler_heartbeats', 'banners', 'blog_posts', 'activity_logs', 'settings', 'return_requests', 'transactions', 'order_items', 'orders', 'coupons', 'addresses', 'product_variants', 'category_product', 'products', 'brands', 'categories'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
