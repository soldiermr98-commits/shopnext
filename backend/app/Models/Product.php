<?php

declare(strict_types=1);

namespace App\Models;

use App\Casts\SanitizedHtml;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $table = 'products';

    protected function casts(): array
    {
        return ['description' => SanitizedHtml::class];
    }
}
