<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttributeTerm extends Model
{
    protected $table = 'attribute_terms';

    public function attribute(): BelongsTo
    {
        return $this->belongsTo(CatalogAttribute::class, 'attribute_id');
    }
}
