<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class MediaAsset extends Model
{
    protected function casts(): array
    {
        return ['variants' => 'array'];
    }

    public function url(): string
    {
        return '/media/'.$this->filename;
    }
}
