<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class CategoryProduct extends Pivot
{
    protected $table = 'category_product';
}
