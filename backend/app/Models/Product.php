<?php

declare(strict_types=1);

namespace App\Models;

use App\Casts\SanitizedHtml;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use SoftDeletes;

    protected $table = 'products';

    public function brandRecord(): BelongsTo
    {
        return $this->belongsTo(Brand::class, 'brand_id');
    }

    protected function casts(): array
    {
        return ['description' => SanitizedHtml::class, 'full_description' => SanitizedHtml::class, 'price' => 'integer', 'sale_price' => 'integer', 'flash_price' => 'integer', 'stock' => 'integer'];
    }
}
