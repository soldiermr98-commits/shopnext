<?php

declare(strict_types=1);

namespace App\Models;

use App\Casts\SanitizedHtml;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $table = 'categories';

    protected function casts(): array
    {
        return ['description' => SanitizedHtml::class];
    }
}
