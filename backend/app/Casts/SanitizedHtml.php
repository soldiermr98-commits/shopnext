<?php

declare(strict_types=1);

namespace App\Casts;

use App\Services\RichText;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

final class SanitizedHtml implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        return app(RichText::class)->clean($value);
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        return app(RichText::class)->clean($value);
    }
}
