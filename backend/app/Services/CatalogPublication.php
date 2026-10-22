<?php

declare(strict_types=1);

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/** Effective publication is clock-based; no cron status rewrite or fake mutation. */
final class CatalogPublication
{
    public static function query(): Builder
    {
        return DB::table('products')->whereNull('deleted_at')->where(function (Builder $query): void {
            $query->where('status', 'published')->orWhere(function (Builder $scheduled): void {
                $scheduled->where('status', 'scheduled')->whereNotNull('published_at')->where('published_at', '<=', CarbonImmutable::now('UTC')->format('Y-m-d H:i:s'));
            });
        });
    }

    public static function visible(object $record, ?CarbonImmutable $now = null): bool
    {
        $now ??= CarbonImmutable::now('UTC');

        return $record->deleted_at === null && ($record->status === 'published' || ($record->status === 'scheduled' && $record->published_at !== null && CarbonImmutable::parse($record->published_at, 'UTC')->lessThanOrEqualTo($now)));
    }
}
