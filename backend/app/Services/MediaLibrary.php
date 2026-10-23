<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\MediaAsset;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

final class MediaLibrary
{
    public function listing(User $actor, string $folder = ''): LengthAwarePaginator
    {
        Gate::forUser($actor->fresh())->authorize('viewAny', MediaAsset::class);

        return MediaAsset::query()->when($folder !== '', fn ($query) => $query->where('folder', $folder))->orderByDesc('id')->paginate(30);
    }

    public function upload(User $actor, UploadedFile $file, array $input): MediaAsset
    {
        Gate::forUser($actor->fresh())->authorize('create', MediaAsset::class);
        $input = $this->metadata($input);
        $filename = app(SafeUpload::class)->store($file);
        try {
            $asset = DB::transaction(function () use ($actor, $filename, $input): MediaAsset {
                $actor = app(CatalogAccess::class)->lock($actor, MediaAsset::class);
                Gate::forUser($actor)->authorize('create', MediaAsset::class);
                $asset = MediaAsset::where('filename', $filename)->lockForUpdate()->firstOrFail();
                $asset->forceFill($input)->save();
                app(CatalogAudit::class)->write($actor, $asset, 'media.upload', [], ['id' => $asset->id, 'folder' => $asset->folder, 'alt' => $asset->alt]);

                return $asset;
            });
        } catch (\Throwable $exception) {
            $this->discardNew($filename);
            throw $exception;
        }
        app(MediaConversions::class)->schedule($asset);

        return $asset->refresh();
    }

    public function metadata(array $input): array
    {
        if (array_diff(array_keys($input), ['alt', 'folder']) !== []) {
            throw ValidationException::withMessages(['alt' => 'فیلد رسانه معتبر نیست.']);
        }

        return Validator::make(array_replace(['folder' => '', 'alt' => ''], $input), [
            'folder' => ['present', 'string', 'max:100', 'regex:#^[\pL\pN _/-]*$#uD'],
            'alt' => ['present', 'string', 'max:255'],
        ], ['string' => 'مقدار متنی معتبر وارد کنید.', 'max' => 'متن بیش از حد مجاز است.', 'regex' => 'نام پوشه معتبر نیست.'])->validate();
    }

    public function update(User $actor, int $id, array $input): MediaAsset
    {
        return DB::transaction(function () use ($actor, $id, $input): MediaAsset {
            $actor = app(CatalogAccess::class)->lock($actor, MediaAsset::class);
            $asset = MediaAsset::whereKey($id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('update', $asset);
            $before = $asset->getAttributes();
            $asset->forceFill($this->metadata($input))->save();
            app(CatalogAudit::class)->write($actor, $asset, 'media.update', $before, $asset->getAttributes());

            return $asset;
        });
    }

    public function replace(User $actor, int $id, UploadedFile $file): MediaAsset
    {
        $new = null;
        $backup = null;
        $oldPath = null;
        $obsolete = [];
        try {
            $asset = DB::transaction(function () use ($actor, $id, $file, &$new, &$backup, &$oldPath, &$obsolete): MediaAsset {
                $actor = app(CatalogAccess::class)->lock($actor, MediaAsset::class);
                $asset = MediaAsset::whereKey($id)->lockForUpdate()->firstOrFail();
                Gate::forUser($actor)->authorize('update', $asset);
                $new = app(SafeUpload::class)->store($file);
                $replacement = MediaAsset::where('filename', $new)->firstOrFail();
                $oldPath = Storage::disk('local')->path('media/'.$asset->filename);
                $backup = Storage::disk('local')->path('media/'.$new.'.backup');
                if (! copy($oldPath, $backup) || ! rename(Storage::disk('local')->path('media/'.$new), $oldPath)) {
                    throw new \RuntimeException('Unable to atomically replace media.');
                }
                $before = $asset->getAttributes();
                $obsolete = array_values($asset->variants ?? []);
                // Stable canonical URL preserves every reference; old derivatives remain until cleanup.
                $asset->forceFill(['sha256' => $replacement->sha256, 'variants' => [], 'conversion_status' => 'pending'])->save();
                $replacement->delete();
                app(CatalogAudit::class)->write($actor, $asset, 'media.replace', $before, $asset->getAttributes());

                return $asset;
            });
        } catch (\Throwable $exception) {
            if ($backup !== null && is_file($backup) && $oldPath !== null) {
                rename($backup, $oldPath);
            }
            if ($new !== null) {
                $this->discardNew($new);
            }
            throw $exception;
        }
        if ($backup !== null && is_file($backup)) {
            unlink($backup);
        }
        if ($obsolete !== []) {
            $paths = array_map(fn (string $name): string => '/media/'.$name, $obsolete);
            $usage = app(MediaUsage::class)->counts($paths);
            foreach ($obsolete as $name) {
                if ($usage['/media/'.$name] === 0) {
                    Storage::disk('local')->delete('media/'.$name);
                }
            }
        }
        app(MediaConversions::class)->schedule($asset);

        return $asset->refresh();
    }

    public function retry(User $actor, int $id): void
    {
        $asset = DB::transaction(function () use ($actor, $id): MediaAsset {
            $actor = app(CatalogAccess::class)->lock($actor, MediaAsset::class);
            $asset = MediaAsset::whereKey($id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('update', $asset);
            if ($asset->conversion_status !== 'ready') {
                $asset->forceFill(['conversion_status' => 'pending'])->save();
            }
            app(CatalogAudit::class)->write($actor, $asset, 'media.retry', [], ['id' => $asset->id]);

            return $asset;
        });
        app(MediaConversions::class)->schedule($asset);
    }

    public function delete(User $actor, int $id): void
    {
        $moved = [];
        try {
            DB::transaction(function () use ($actor, $id, &$moved): void {
                $actor = app(CatalogAccess::class)->lock($actor, MediaAsset::class);
                $asset = MediaAsset::whereKey($id)->lockForUpdate()->firstOrFail();
                Gate::forUser($actor)->authorize('delete', $asset);
                $files = array_merge([$asset->filename], array_values($asset->variants ?? []));
                $paths = array_map(fn (string $name): string => '/media/'.$name, $files);
                if (array_sum(app(MediaUsage::class)->counts($paths)) > 0) {
                    throw ValidationException::withMessages(['asset' => 'این تصویر در حال استفاده است؛ ابتدا ارجاع‌ها را حذف کنید.']);
                }
                app(CatalogAudit::class)->write($actor, $asset, 'media.delete', ['id' => $asset->id], []);
                foreach ($files as $name) {
                    $path = Storage::disk('local')->path('media/'.$name);
                    if (is_file($path)) {
                        $trash = $path.'.deleted-'.bin2hex(random_bytes(8));
                        if (! rename($path, $trash)) {
                            throw new \RuntimeException('Unable to quarantine media.');
                        }
                        $moved[$path] = $trash;
                    }
                }
                $asset->delete();
            });
        } catch (\Throwable $exception) {
            foreach ($moved as $path => $trash) {
                rename($trash, $path);
            }
            throw $exception;
        }
        foreach ($moved as $trash) {
            unlink($trash);
        }
    }

    public function discardNew(string $filename): void
    {
        $asset = MediaAsset::where('filename', $filename)->first();
        $files = array_merge([$filename], array_values($asset?->variants ?? []));
        $asset?->delete();
        Storage::disk('local')->delete(array_map(fn (string $name): string => 'media/'.$name, $files));
    }
}
