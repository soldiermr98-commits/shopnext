<?php

declare(strict_types=1);

namespace App\Services;

use App\Jobs\ConvertMedia;
use App\Models\MediaAsset;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

final class MediaConversions
{
    public function schedule(MediaAsset $asset): void
    {
        if ($asset->conversion_status !== 'pending') {
            return;
        }
        try {
            $path = Storage::disk('local')->path('media/'.$asset->filename);
            $header = app(ImageBudget::class)->inspect($path);
            $small = $header['width'] <= intdiv(min(1048576, max(1, (int) config('media.sync_max_pixels', 1048576))), $header['height']);
            $seconds = (int) ini_get('max_execution_time');
            if (! app(Heartbeat::class)->status()['workerHealthy'] && $small && ($seconds === 0 || $seconds >= 15)) {
                $this->run($asset->id, $asset->sha256);
            } else {
                ConvertMedia::dispatch($asset->id, $asset->sha256);
            }
        } catch (\Throwable) {
            // Scheduling must not roll back a committed catalog reference or discard its PNG.
            try {
                MediaAsset::whereKey($asset->id)->where('sha256', $asset->sha256)->update(['conversion_status' => 'original']);
            } catch (\Throwable) {
                Log::warning('Media scheduling deferred; canonical retained.', ['asset_id' => $asset->id]);
            }
        }
    }

    public function run(int $id, string $sha): void
    {
        DB::transaction(function () use ($id, $sha): void {
            $asset = MediaAsset::whereKey($id)->lockForUpdate()->first();
            if ($asset === null || $asset->sha256 !== $sha || $asset->conversion_status !== 'pending') {
                return;
            }
            $renderer = app(WebpRenderer::class);
            if (! $renderer->available()) {
                $asset->forceFill(['conversion_status' => 'original'])->save();

                return;
            }
            $written = [];
            try {
                foreach (app(ImageBudget::class)->variants() as $name => $edge) {
                    $bytes = $renderer->render(Storage::disk('local')->path('media/'.$asset->filename), $edge);
                    $filename = bin2hex(random_bytes(24)).'.webp';
                    if (! Storage::disk('local')->put('media/'.$filename, $bytes)) {
                        throw new \RuntimeException('Unable to store media variant.');
                    }
                    $written[$name] = $filename;
                    unset($bytes);
                }
                $asset->forceFill(['variants' => $written, 'conversion_status' => 'ready'])->save();
            } catch (\Throwable $exception) {
                Storage::disk('local')->delete(array_map(fn (string $file): string => 'media/'.$file, array_values($written)));
                // Retain canonical PNG on codec/resource errors, never expose raw decoder details.
                $asset->forceFill(['variants' => [], 'conversion_status' => 'original'])->save();
            }
        });
    }
}
