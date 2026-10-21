<?php

declare(strict_types=1);

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\FinancialFixtures as F;

uses(RefreshDatabase::class);
it('M01 C02 exposes real published product IDs and same active price selector without wrong-product fallback', function () {
    $id = F::product(['sale_price' => 50, 'sale_starts_at' => now()->addDay()]);
    $draft = F::product(['status' => 'draft']);
    $this->getJson('/api/products')->assertOk()->assertJsonCount(1, 'products')->assertJsonPath('products.0.id', (string) $id)->assertJsonPath('products.0.price', 100)->assertJsonPath('products.0.salePrice', null);
    $this->getJson('/api/products/'.$draft)->assertNotFound();
    $this->getJson('/api/products/nonexistent')->assertNotFound();
    $this->getJson('/api/products?limit=51')->assertUnprocessable();
});

it('C02 H10 exposes a real zero sale price and numeric nonmonetary rating without substituting regular money', function () {
    $id = F::product(['price' => 100, 'sale_price' => 0]);
    $this->getJson('/api/products/'.$id)->assertOk()->assertJsonPath('product.price', 100)->assertJsonPath('product.salePrice', 0)->assertJsonPath('product.rating', 0);
});
