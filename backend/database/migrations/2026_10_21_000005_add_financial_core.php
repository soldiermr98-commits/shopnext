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
        foreach (['products', 'product_variants'] as $table) {
            Schema::table($table, function (Blueprint $t): void {
                $t->timestamp('sale_starts_at')->nullable();
                $t->timestamp('sale_ends_at')->nullable();
                $t->unsignedBigInteger('flash_price')->nullable();
                $t->timestamp('flash_starts_at')->nullable();
                $t->timestamp('flash_ends_at')->nullable();
                $t->unsignedInteger('weight_grams')->nullable();
                $t->unsignedInteger('max_quantity')->nullable();
            });
            DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$table}_flash_safe CHECK (flash_price IS NULL OR flash_price <= price)");
        }
        Schema::table('addresses', fn (Blueprint $t) => $t->string('zone_code', 64)->nullable());
        Schema::table('coupons', function (Blueprint $t): void {
            $t->timestamp('starts_at')->nullable();
            $t->unsignedInteger('per_user_limit')->nullable();
            $t->boolean('allow_stacking')->default(false);
            foreach (['include_products', 'exclude_products', 'include_categories', 'exclude_categories'] as $column) {
                $t->json($column)->nullable();
            }
        });
        DB::statement('ALTER TABLE coupons ADD CONSTRAINT coupons_capacity CHECK (usage_limit IS NULL OR used_count <= usage_limit)');
        Schema::table('orders', function (Blueprint $t): void {
            $t->string('idempotency_key', 64)->nullable();
            $t->char('intent_hash', 64)->nullable();
            $t->unique(['user_id', 'idempotency_key']);
            $t->enum('payment_state', ['unpaid', 'pending_verification', 'paid', 'failed', 'refunded'])->default('unpaid')->index();
            $t->unsignedBigInteger('payable_total')->default(0);
            $t->timestamp('expires_at')->nullable()->index();
            $t->timestamp('stock_released_at')->nullable();
            $t->timestamp('paid_at')->nullable();
            $t->timestamp('refunded_at')->nullable();
            $t->json('pricing_snapshot')->nullable();
            $t->string('receipt_path')->nullable();
        });
        Schema::table('order_items', function (Blueprint $t): void {
            $t->unsignedBigInteger('line_total')->default(0);
            $t->unsignedBigInteger('tax_amount')->default(0);
        });
        Schema::create('coupon_usages', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('coupon_id')->constrained()->restrictOnDelete();
            $t->foreignId('user_id')->constrained()->restrictOnDelete();
            $t->foreignId('order_id')->unique()->constrained()->restrictOnDelete();
            $t->enum('state', ['reserved', 'redeemed', 'released'])->default('reserved');
            $t->timestamps();
            $t->index(['coupon_id', 'user_id', 'state']);
        });
        Schema::create('wallet_entries', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('user_id')->constrained()->restrictOnDelete();
            $t->foreignId('order_id')->nullable()->constrained()->restrictOnDelete();
            $t->bigInteger('delta');
            $t->enum('kind', ['opening', 'credit', 'payment', 'refund']);
            $t->string('idempotency_key', 191)->unique();
            $t->string('reason', 200);
            $t->timestamp('created_at');
            $t->unique(['order_id', 'kind']);
            $t->index(['user_id', 'id']);
        });
        DB::statement('ALTER TABLE wallet_entries ADD CONSTRAINT wallet_delta_safe CHECK (delta <> 0 AND delta BETWEEN -9007199254740991 AND 9007199254740991)');
        // Explicit opening ledger, never silently discard an existing L1 balance.
        DB::statement("INSERT INTO wallet_entries (user_id, delta, kind, idempotency_key, reason, created_at) SELECT id, wallet_balance, 'opening', CONCAT('opening:', id), 'L1 opening balance', CURRENT_TIMESTAMP FROM users WHERE wallet_balance > 0");
        foreach (['UPDATE', 'DELETE'] as $event) {
            DB::unprepared('CREATE TRIGGER wallet_no_'.strtolower($event)." BEFORE {$event} ON wallet_entries FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Wallet ledger is append only'");
        }
        // This legacy column is an immutable opening snapshot, NOT the live balance.
        DB::unprepared("CREATE TRIGGER wallet_snapshot_update BEFORE UPDATE ON users FOR EACH ROW BEGIN IF NEW.wallet_balance <> OLD.wallet_balance THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Use wallet ledger'; END IF; END");
        DB::unprepared("CREATE TRIGGER wallet_snapshot_insert BEFORE INSERT ON users FOR EACH ROW BEGIN IF NEW.wallet_balance <> 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Use wallet ledger'; END IF; END");
        Schema::create('carts', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('user_id')->nullable()->unique()->constrained()->cascadeOnDelete();
            $t->char('token_hash', 64)->nullable()->unique();
            $t->unsignedInteger('version')->default(0);
            $t->timestamps();
        });
        Schema::create('cart_items', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('cart_id')->constrained()->cascadeOnDelete();
            $t->foreignId('product_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('product_variant_id')->nullable();
            $t->unsignedBigInteger('variant_key')->default(0);
            $t->unsignedInteger('quantity');
            $t->foreign(['product_variant_id', 'product_id'])->references(['id', 'product_id'])->on('product_variants')->cascadeOnDelete();
            $t->unique(['cart_id', 'product_id', 'variant_key']);
        });
        DB::statement('ALTER TABLE cart_items ADD CONSTRAINT cart_positive_quantity CHECK (quantity > 0)');
        DB::statement('ALTER TABLE cart_items ADD CONSTRAINT cart_variant_identity CHECK ((product_variant_id IS NULL AND variant_key = 0) OR (product_variant_id IS NOT NULL AND variant_key = product_variant_id))');
    }

    public function down(): void
    {
        if (DB::table('wallet_entries')->where('kind', '<>', 'opening')->exists() || DB::table('orders')->whereNotNull('idempotency_key')->exists()) {
            throw new RuntimeException('Financial data exists: use a reviewed forward migration, never destructive rollback.');
        }
        Schema::dropIfExists('cart_items');
        Schema::dropIfExists('carts');
        foreach (['wallet_no_update', 'wallet_no_delete', 'wallet_snapshot_update', 'wallet_snapshot_insert'] as $trigger) {
            DB::unprepared("DROP TRIGGER IF EXISTS {$trigger}");
        }
        Schema::dropIfExists('wallet_entries');
        Schema::dropIfExists('coupon_usages');
        Schema::table('order_items', fn (Blueprint $t) => $t->dropColumn(['line_total', 'tax_amount']));
        Schema::table('orders', function (Blueprint $t): void {
            $t->dropUnique(['user_id', 'idempotency_key']);
            $t->dropColumn(['idempotency_key', 'intent_hash', 'payment_state', 'payable_total', 'expires_at', 'stock_released_at', 'paid_at', 'refunded_at', 'pricing_snapshot', 'receipt_path']);
        });
        $drop = str_contains(strtolower(DB::selectOne('SELECT VERSION() AS v')->v), 'mariadb') ? 'DROP CONSTRAINT' : 'DROP CHECK';
        DB::statement("ALTER TABLE coupons {$drop} coupons_capacity");
        Schema::table('coupons', fn (Blueprint $t) => $t->dropColumn(['starts_at', 'per_user_limit', 'allow_stacking', 'include_products', 'exclude_products', 'include_categories', 'exclude_categories']));
        Schema::table('addresses', fn (Blueprint $t) => $t->dropColumn('zone_code'));
        foreach (['products', 'product_variants'] as $table) {
            DB::statement("ALTER TABLE {$table} {$drop} {$table}_flash_safe");
            Schema::table($table, fn (Blueprint $t) => $t->dropColumn(['sale_starts_at', 'sale_ends_at', 'flash_price', 'flash_starts_at', 'flash_ends_at', 'weight_grams', 'max_quantity']));
        }
    }
};
