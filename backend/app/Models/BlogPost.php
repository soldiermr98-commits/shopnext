<?php

declare(strict_types=1);

namespace App\Models;

use App\Casts\SanitizedHtml;
use Illuminate\Database\Eloquent\Model;

class BlogPost extends Model
{
    protected $table = 'blog_posts';

    protected function casts(): array
    {
        return ['content' => SanitizedHtml::class];
    }
}
