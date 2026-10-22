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
        Schema::table('orders', function (Blueprint $t): void {
            $t->timestamp('cod_review_at')->nullable()->index();
            $t->timestamp('cod_flagged_at')->nullable();
            $t->bigInteger('rounding_adjustment')->default(0);
        });
        Schema::create('order_events', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('order_id')->constrained()->restrictOnDelete();
            $t->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $t->string('actor_name');
            $t->string('actor_role', 50);
            $t->string('action', 40);
            $t->string('from_status', 40)->nullable();
            $t->string('to_status', 40);
            $t->string('from_payment_state', 40)->nullable();
            $t->string('to_payment_state', 40);
            $t->string('reason', 200)->nullable();
            $t->timestamp('created_at');
            $t->index(['order_id', 'id']);
        });
        DB::statement('ALTER TABLE orders ADD CONSTRAINT orders_payable_safe CHECK (payable_total <= 9007199254740991 AND rounding_adjustment BETWEEN -1000 AND 1000)');
        DB::statement('ALTER TABLE order_items ADD CONSTRAINT order_items_totals_safe CHECK (line_total <= 9007199254740991 AND tax_amount <= 9007199254740991)');
        foreach (['UPDATE', 'DELETE'] as $event) {
            DB::unprepared('CREATE TRIGGER order_events_no_'.strtolower($event)." BEFORE {$event} ON order_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Order timeline is append only'");
            DB::unprepared('CREATE TRIGGER order_items_snapshot_'.strtolower($event)." BEFORE {$event} ON order_items FOR EACH ROW BEGIN IF EXISTS (SELECT 1 FROM orders WHERE id = OLD.order_id AND idempotency_key IS NOT NULL) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Financial item snapshot is immutable'; END IF; END");
        }
        $fields = ['user_id', 'idempotency_key', 'intent_hash', 'order_number', 'tracking_code', 'customer_name', 'customer_phone', 'shipping_address', 'coupon_id', 'coupon_code', 'subtotal', 'items_discount', 'coupon_discount', 'shipping_fee', 'vat_amount', 'payable_total', 'rounding_adjustment', 'pricing_snapshot', 'payment_method', 'shipping_method_id', 'shipping_method_name', 'items_count', 'expires_at', 'cod_review_at', 'created_at'];
        $unchanged = implode(' AND ', array_map(fn ($f) => "(BINARY NEW.{$f} <=> BINARY OLD.{$f})", $fields));
        DB::unprepared("CREATE TRIGGER orders_snapshot_update BEFORE UPDATE ON orders FOR EACH ROW BEGIN IF OLD.idempotency_key IS NOT NULL AND NOT ({$unchanged}) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Financial order snapshot is immutable'; END IF; END");
    }

    public function down(): void
    {
        if (DB::table('order_events')->exists() || DB::table('orders')->whereNotNull('idempotency_key')->exists()) {
            throw new RuntimeException('Order history exists; use a reviewed forward repair.');
        }
        foreach (['orders_snapshot_update', 'order_items_snapshot_update', 'order_items_snapshot_delete', 'order_events_no_update', 'order_events_no_delete'] as $trigger) {
            DB::unprepared("DROP TRIGGER IF EXISTS {$trigger}");
        }
        Schema::dropIfExists('order_events');
        $drop = str_contains(strtolower(DB::selectOne('SELECT VERSION() AS v')->v), 'mariadb') ? 'DROP CONSTRAINT' : 'DROP CHECK';
        DB::statement("ALTER TABLE orders {$drop} orders_payable_safe");
        DB::statement("ALTER TABLE order_items {$drop} order_items_totals_safe");
        Schema::table('orders', fn (Blueprint $t) => $t->dropColumn(['cod_review_at', 'cod_flagged_at', 'rounding_adjustment']));
    }
};
