<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use App\Models\MediaAsset;
use App\Models\User;
use App\Services\MediaLibrary;
use App\Services\MediaUsage;
use Filament\Pages\Page;
use Illuminate\Support\Facades\Gate;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;
use Livewire\WithFileUploads;
use Livewire\WithPagination;

final class MediaLibraryEditor extends Page
{
    use WithFileUploads;
    use WithPagination;

    protected string $view = 'filament.pages.media-library-editor';

    protected static ?string $slug = 'media-library';

    public ?TemporaryUploadedFile $upload = null;

    public ?int $selected = null;

    public string $folder = '';

    public string $alt = '';

    public string $filter = '';

    public string $notice = '';

    public static function getNavigationLabel(): string
    {
        return 'کتابخانه رسانه';
    }

    public function getTitle(): string
    {
        return 'کتابخانه رسانه';
    }

    public static function canAccess(): bool
    {
        $actor = auth('web')->user()?->fresh();

        return $actor !== null && Gate::forUser($actor)->allows('viewAny', MediaAsset::class);
    }

    public function mount(): void
    {
        $this->actor();
    }

    public function select(int $id): void
    {
        $actor = $this->actor();
        $asset = MediaAsset::findOrFail($id);
        Gate::forUser($actor)->authorize('view', $asset);
        $this->selected = $id;
        $this->folder = $asset->folder;
        $this->alt = $asset->alt;
        $this->notice = '';
    }

    public function saveUpload(): void
    {
        $actor = $this->actor();
        $this->notice = '';
        $this->validate(['upload' => ['required', 'file']], ['required' => 'تصویر انتخاب کنید.', 'file' => 'تصویر معتبر انتخاب کنید.']);
        $asset = app(MediaLibrary::class)->upload($actor, $this->upload, ['folder' => $this->folder, 'alt' => $this->alt]);
        $this->upload = null;
        $this->selected = $asset->id;
        $this->resetPage();
        $this->notice = 'تصویر ذخیره شد؛ اصل امن همیشه حفظ می‌شود.';
    }

    public function saveMetadata(): void
    {
        $actor = $this->actor();
        $this->notice = '';
        abort_unless($this->selected !== null, 422);
        app(MediaLibrary::class)->update($actor, $this->selected, ['folder' => $this->folder, 'alt' => $this->alt]);
        $this->notice = 'پوشه و متن جایگزین ذخیره شد.';
    }

    public function replace(): void
    {
        $actor = $this->actor();
        $this->notice = '';
        abort_unless($this->selected !== null, 422);
        $this->validate(['upload' => ['required', 'file']], ['required' => 'تصویر انتخاب کنید.', 'file' => 'تصویر معتبر انتخاب کنید.']);
        app(MediaLibrary::class)->replace($actor, $this->selected, $this->upload);
        $this->upload = null;
        $this->notice = 'تصویر جایگزین شد؛ نشانی ارجاع‌ها ثابت ماند.';
    }

    public function deleteSelected(): void
    {
        $actor = $this->actor();
        $this->notice = '';
        abort_unless($this->selected !== null, 422);
        app(MediaLibrary::class)->delete($actor, $this->selected);
        $this->selected = null;
        $this->notice = 'رسانه حذف شد.';
    }

    public function assets(): array
    {
        $assets = app(MediaLibrary::class)->listing($this->actor(), mb_substr($this->filter, 0, 100));

        return ['page' => $assets, 'usage' => app(MediaUsage::class)->counts($assets->map(fn (MediaAsset $asset): string => $asset->url())->all())];
    }

    protected function actor(): User
    {
        $actor = auth('web')->user()?->fresh();
        abort_unless($actor !== null, 403);
        Gate::forUser($actor)->authorize('viewAny', MediaAsset::class);

        return $actor;
    }
}
