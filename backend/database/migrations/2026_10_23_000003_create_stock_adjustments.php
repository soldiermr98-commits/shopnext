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
        Schema::create('stock_operations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $table->string('request_key', 64);
            $table->string('intent_hash', 64);
            $table->unsignedInteger('row_count');
            $table->timestamp('created_at');
            $table->unique(['actor_id', 'request_key']);
        });
        Schema::create('stock_adjustments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('operation_id')->constrained('stock_operations')->restrictOnDelete();
            $table->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->unsignedBigInteger('variant_id')->nullable();
            $table->bigInteger('delta');
            $table->unsignedInteger('before_stock');
            $table->unsignedInteger('after_stock');
            $table->string('reason', 200);
            $table->timestamp('created_at');
            $table->foreign(['variant_id', 'product_id'])->references(['id', 'product_id'])->on('product_variants')->restrictOnDelete();
            $table->index(['product_id', 'id']);
        });
        DB::statement('ALTER TABLE stock_adjustments ADD CONSTRAINT stock_adjustment_nonzero CHECK (delta <> 0 AND after_stock = before_stock + delta)');
        foreach (['stock_operations', 'stock_adjustments'] as $table) {
            foreach (['UPDATE', 'DELETE'] as $event) {
                DB::unprepared('CREATE TRIGGER '.$table.'_no_'.strtolower($event).' BEFORE '.$event.' ON '.$table." FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stock adjustment ledger is append only'");
            }
        }
    }

    public function down(): void
    {
        if (DB::table('stock_operations')->exists()) {
            throw new RuntimeException('Export stock adjustment ledger before rollback.');
        }
        foreach (['stock_adjustments', 'stock_operations'] as $table) {
            foreach (['update', 'delete'] as $event) {
                DB::unprepared('DROP TRIGGER IF EXISTS '.$table.'_no_'.$event);
            }
            Schema::dropIfExists($table);
        }
    }
};
