<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProductVariant extends Model
{
    use SoftDeletes;

    protected $table = 'product_variants';

    public function terms(): BelongsToMany
    {
        return $this->belongsToMany(AttributeTerm::class, 'variant_attribute_terms', 'variant_id', 'term_id');
    }

    protected function casts(): array
    {
        return ['price' => 'integer', 'sale_price' => 'integer', 'flash_price' => 'integer', 'stock' => 'integer'];
    }
}
