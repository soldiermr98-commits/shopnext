<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const ADDED = [
        'users' => ['avatar', 'national_code', 'is_gold_member', 'club_points', 'wallet_balance', 'legacy_id'],
        'categories' => ['icon', 'description', 'legacy_id'],
        'brands' => ['origin_country', 'is_official', 'legacy_id'],
        'products' => ['brand', 'discount_percent', 'rating', 'reviews_count', 'video_url', 'legacy_id'],
        'orders' => ['postal_barnameh', 'customer_national_code', 'items_count', 'shipping_method_name', 'shipping_method_id', 'delivery_date_slot', 'payment_method', 'payment_method_name', 'payment_gateway', 'payment_rrn', 'payment_card_mask', 'invoice_serial', 'tax_ref_id', 'notes', 'requires_official_tax_invoice', 'legacy_id'],
        'blog_posts' => ['author', 'read_time', 'category', 'tags', 'legacy_id'],
        'banners' => ['subtitle', 'legacy_id'],
        'activity_logs' => ['user_name', 'user_role', 'details', 'ip_address', 'legacy_id'],
        'transactions' => ['order_number', 'rrn', 'ref_id', 'card_mask', 'raw_response', 'legacy_id'],
        'return_requests' => ['order_number', 'action_type', 'pickup_method', 'pickup_date_slot', 'refund_destination', 'bank_card_mask', 'pickup_address', 'bank_iban', 'legacy_id'],
        'addresses' => ['legacy_id'],
        'product_variants' => ['legacy_id'],
        'coupons' => ['legacy_id'],
    ];

    private const CHECKS = [
        'users' => ['users_wallet_safe'],
        'products' => ['products_discount_bounds', 'products_rating_bounds'],
        'orders' => ['orders_money_safe'],
        'coupons' => ['coupons_money_safe'],
        'transactions' => ['transactions_canonical_toman', 'transactions_amount_safe'],
        'order_items' => ['order_items_price_safe'],
        'return_requests' => ['returns_amount_safe'],
    ];

    public function up(): void
    {
        Schema::table('users', function (Blueprint $t): void {
            $t->string('avatar')->nullable();
            $t->string('national_code', 10)->nullable();
            $t->boolean('is_gold_member')->default(false);
            $t->unsignedInteger('club_points')->default(0);
            $t->unsignedBigInteger('wallet_balance')->default(0);
            $t->string('legacy_id', 191)->nullable()->unique();
        });
        Schema::table('categories', function (Blueprint $t): void {
            $t->string('icon')->nullable();
            $t->text('description')->nullable();
            $t->string('legacy_id', 191)->nullable()->unique();
        });
        Schema::table('brands', function (Blueprint $t): void {
            $t->string('origin_country')->nullable();
            $t->boolean('is_official')->default(false);
            $t->string('legacy_id', 191)->nullable()->unique();
        });
        Schema::table('products', function (Blueprint $t): void {
            $t->string('brand')->nullable();
            $t->unsignedTinyInteger('discount_percent')->nullable();
            $t->decimal('rating', 3, 2)->default(0);
            $t->unsignedInteger('reviews_count')->default(0);
            $t->string('video_url', 2048)->nullable();
            $t->string('legacy_id', 191)->nullable()->unique();
        });
        Schema::table('orders', function (Blueprint $t): void {
            $t->string('postal_barnameh')->nullable();
            $t->string('customer_national_code', 10)->nullable();
            $t->unsignedInteger('items_count')->default(0);
            $t->string('shipping_method_name')->nullable();
            $t->string('shipping_method_id')->nullable();
            $t->string('delivery_date_slot')->nullable();
            $t->string('payment_method')->nullable();
            $t->string('payment_method_name')->nullable();
            $t->string('payment_gateway')->nullable();
            $t->string('payment_rrn')->nullable();
            $t->string('payment_card_mask')->nullable();
            $t->string('invoice_serial')->nullable();
            $t->string('tax_ref_id')->nullable();
            $t->text('notes')->nullable();
            $t->boolean('requires_official_tax_invoice')->default(false);
            $t->string('legacy_id', 191)->nullable()->unique();
        });
        Schema::table('blog_posts', function (Blueprint $t): void {
            $t->string('author')->nullable();
            $t->string('read_time')->nullable();
            $t->string('category')->nullable();
            $t->json('tags')->nullable();
            $t->string('legacy_id', 191)->nullable()->unique();
        });
        Schema::table('banners', function (Blueprint $t): void {
            $t->string('subtitle')->nullable();
            $t->string('legacy_id', 191)->nullable()->unique();
        });
        Schema::table('activity_logs', function (Blueprint $t): void {
            $t->string('user_name')->nullable();
            $t->string('user_role', 50)->nullable();
            $t->text('details')->nullable();
            $t->string('ip_address', 45)->nullable();
            $t->string('legacy_id', 191)->nullable()->unique();
        });
        Schema::table('transactions', function (Blueprint $t): void {
            $t->string('order_number')->nullable();
            $t->string('rrn')->nullable();
            $t->string('ref_id')->nullable();
            $t->string('card_mask')->nullable();
            $t->mediumText('raw_response')->nullable();
            $t->string('legacy_id', 191)->nullable()->unique();
        });
        Schema::table('return_requests', function (Blueprint $t): void {
            $t->string('order_number')->nullable();
            $t->string('action_type')->nullable();
            $t->string('pickup_method')->nullable();
            $t->string('pickup_date_slot')->nullable();
            $t->string('refund_destination')->nullable();
            $t->string('bank_card_mask')->nullable();
            $t->text('pickup_address')->nullable();
            $t->text('bank_iban')->nullable();
            $t->string('legacy_id', 191)->nullable()->unique();
        });
        Schema::table('addresses', function (Blueprint $t): void {
            $t->string('legacy_id', 191)->nullable()->unique();
        });
        Schema::table('product_variants', function (Blueprint $t): void {
            $t->string('legacy_id', 191)->nullable()->unique();
        });
        Schema::table('coupons', function (Blueprint $t): void {
            $t->string('legacy_id', 191)->nullable()->unique();
        });
        Schema::table('product_variants', function (Blueprint $t): void {
            $t->unique(['id', 'product_id']);
        });
        Schema::table('order_items', function (Blueprint $t): void {
            $t->unique(['id', 'order_id']);
            $t->foreign(['product_variant_id', 'product_id'], 'item_variant_product_fk')->references(['id', 'product_id'])->on('product_variants')->restrictOnDelete();
        });
        Schema::table('orders', function (Blueprint $t): void {
            $t->unique(['id', 'user_id']);
        });
        Schema::table('return_requests', function (Blueprint $t): void {
            $t->unique(['id', 'order_id']);
            $t->foreign(['order_id', 'user_id'], 'return_order_owner_fk')->references(['id', 'user_id'])->on('orders')->restrictOnDelete();
            $t->enum('status', ['pending', 'completed', 'pending_review', 'courier_assigned', 'received_at_warehouse', 'approved', 'rejected', 'refunded'])->default('pending_review')->change();
        });
        Schema::create('return_items', function (Blueprint $t): void {
            $t->id();
            $t->unsignedBigInteger('return_request_id');
            $t->unsignedBigInteger('order_item_id');
            $t->unsignedBigInteger('order_id');
            $t->unsignedInteger('quantity');
            $t->string('reason');
            $t->text('customer_notes')->nullable();
            $t->json('images')->nullable();
            $t->json('snapshot');
            $t->timestamps();
            $t->foreign(['return_request_id', 'order_id'], 'return_line_request_fk')->references(['id', 'order_id'])->on('return_requests')->restrictOnDelete();
            $t->foreign(['order_item_id', 'order_id'], 'return_line_order_item_fk')->references(['id', 'order_id'])->on('order_items')->restrictOnDelete();
            $t->unique(['return_request_id', 'order_item_id']);
        });
        DB::statement('ALTER TABLE return_items ADD CONSTRAINT return_items_quantity CHECK (quantity > 0)');
        DB::statement('ALTER TABLE users ADD CONSTRAINT users_wallet_safe CHECK (wallet_balance <= 9007199254740991)');
        DB::statement('ALTER TABLE products ADD CONSTRAINT products_discount_bounds CHECK (discount_percent IS NULL OR discount_percent <= 100)');
        DB::statement('ALTER TABLE products ADD CONSTRAINT products_rating_bounds CHECK (rating >= 0 AND rating <= 5)');
        DB::statement('ALTER TABLE orders ADD CONSTRAINT orders_money_safe CHECK (subtotal <= 9007199254740991 AND items_discount <= 9007199254740991 AND coupon_discount <= 9007199254740991 AND shipping_fee <= 9007199254740991 AND vat_amount <= 9007199254740991 AND total_paid <= 9007199254740991)');
        DB::statement('ALTER TABLE coupons ADD CONSTRAINT coupons_money_safe CHECK (value <= 9007199254740991 AND min_order_amount <= 9007199254740991 AND (max_discount_amount IS NULL OR max_discount_amount <= 9007199254740991))');
        DB::statement("ALTER TABLE transactions ADD CONSTRAINT transactions_canonical_toman CHECK (unit = 'TOMAN')");
        DB::statement('ALTER TABLE transactions ADD CONSTRAINT transactions_amount_safe CHECK (amount <= 9007199254740991)');
        DB::statement('ALTER TABLE order_items ADD CONSTRAINT order_items_price_safe CHECK (unit_price <= 9007199254740991)');
        DB::statement('ALTER TABLE return_requests ADD CONSTRAINT returns_amount_safe CHECK (total_refund_amount <= 9007199254740991)');
    }

    public function down(): void
    {
        Schema::dropIfExists('return_items');
        foreach (self::CHECKS as $table => $names) {
            foreach ($names as $name) {
                // MySQL and MariaDB use different CHECK-drop grammar, not different invariants.
                $drop = str_contains(strtolower(DB::selectOne('SELECT VERSION() AS v')->v), 'mariadb') ? 'DROP CONSTRAINT' : 'DROP CHECK';
                DB::statement("ALTER TABLE {$table} {$drop} {$name}");
            }
        }
        Schema::table('return_requests', function (Blueprint $t): void {
            $t->dropForeign('return_order_owner_fk');
            $t->dropUnique(['id', 'order_id']);
            // Rollback of historical status values requires operator review, not silent rewriting.
            $t->enum('status', ['pending', 'completed', 'pending_review', 'courier_assigned', 'received_at_warehouse', 'approved', 'rejected', 'refunded'])->default('pending')->change();
        });
        Schema::table('order_items', function (Blueprint $t): void {
            $t->dropForeign('item_variant_product_fk');
            $t->dropUnique(['id', 'order_id']);
        });
        Schema::table('product_variants', fn (Blueprint $t) => $t->dropUnique(['id', 'product_id']));
        Schema::table('orders', fn (Blueprint $t) => $t->dropUnique(['id', 'user_id']));
        foreach (self::ADDED as $table => $columns) {
            Schema::table($table, fn (Blueprint $t) => $t->dropColumn($columns));
        }
    }
};
