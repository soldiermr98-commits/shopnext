<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\DB;

/** Live references include drafts and soft-deleted records: never stale counters. */
final class MediaUsage
{
    private const SOURCES = [
        ['categories', 'image', false], ['brands', 'logo', false],
        ['products', 'main_image', false], ['products', 'gallery_images', true],
        ['product_variants', 'image', false], ['attribute_terms', 'image', false],
        ['blog_posts', 'cover_image', false], ['banners', 'image', false],
        ['return_items', 'images', true],
    ];

    public function counts(array $paths): array
    {
        if (count($paths) > 30) {
            throw new \LogicException('Paginate media usage first.');
        }
        $counts = array_fill_keys($paths, 0);
        if ($paths === []) {
            return $counts;
        }
        foreach (self::SOURCES as [$table, $column, $json]) {
            if ($json) {
                $query = DB::table($table);
                foreach (array_values($paths) as $index => $path) {
                    $query->selectRaw('COALESCE(SUM(JSON_CONTAINS(`'.$column.'`, ?)), 0) AS p'.$index, [json_encode($path, JSON_THROW_ON_ERROR)]);
                }
                $row = (array) $query->first();
                foreach (array_values($paths) as $index => $path) {
                    $counts[$path] += (int) $row['p'.$index];
                }
            } else {
                foreach (DB::table($table)->whereIn($column, $paths)->select($column)->selectRaw('COUNT(*) AS total')->groupBy($column)->get() as $row) {
                    $counts[$row->{$column}] += (int) $row->total;
                }
            }
        }

        return $counts;
    }
}
