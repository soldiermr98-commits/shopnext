<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CatalogAttribute extends Model
{
    protected $table = 'catalog_attributes';

    public function terms(): HasMany
    {
        return $this->hasMany(AttributeTerm::class, 'attribute_id');
    }
}
