<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use App\Filament\Concerns\HandlesCatalogImage;
use App\Models\Brand;
use App\Models\User;
use App\Services\Brands;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Pages\Page;
use Filament\Schemas\Schema;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Computed;
use Livewire\Attributes\Locked;
use Livewire\WithPagination;

final class BrandEditor extends Page
{
    use HandlesCatalogImage;
    use WithPagination;

    protected string $view = 'filament.pages.brand-editor';

    protected static ?string $slug = 'brands';

    public array $data = [];

    #[Locked]
    public ?int $editingId = null;

    public string $notice = '';

    public static function getNavigationLabel(): string
    {
        return 'برندها';
    }

    public function getTitle(): string
    {
        return 'مدیریت برندها';
    }

    public static function canAccess(): bool
    {
        $actor = auth('web')->user()?->fresh();

        return $actor !== null && Gate::forUser($actor)->allows('viewAny', Brand::class);
    }

    public function mount(): void
    {
        $this->newBrand();
    }

    public function form(Schema $schema): Schema
    {
        $messages = ['required' => 'این فیلد الزامی است.', 'max' => 'مقدار واردشده بیش از حد مجاز است.'];

        return $schema->components([
            TextInput::make('name')->label('نام برند')->required()->maxLength(255)->validationMessages($messages),
            TextInput::make('slug')->label('نامک یکتا')->required()->maxLength(255)->validationMessages($messages),
            TextInput::make('origin_country')->label('کشور مبدأ')->maxLength(100)->validationMessages($messages),
            Toggle::make('is_official')->label('نمایندگی رسمی')->default(false),
        ])->statePath('data');
    }

    public function newBrand(): void
    {
        $this->actor();
        $this->editingId = null;
        $this->imageUpload = null;
        $this->notice = '';
        $this->resetValidation();
        $this->form->fill(['is_official' => false]);
    }

    public function edit(int $id): void
    {
        Gate::forUser($this->actor())->authorize('view', $record = Brand::findOrFail($id));
        $this->editingId = $id;
        $this->imageUpload = null;
        $this->notice = '';
        $this->resetValidation();
        $this->form->fill($record->getAttributes());
    }

    public function save(): void
    {
        $actor = $this->actor();
        $this->notice = '';
        $this->assertImageReady();
        $state = $this->form->getState();
        $record = $this->persistCatalogImage($state, 'logo', fn (array $data): Brand => app(Brands::class)->save($actor, $data, $this->editingId));
        $this->editingId = $record->id;
        $this->imageUpload = null;
        $this->form->fill($record->getAttributes());
        $this->notice = 'برند ذخیره شد.';
        unset($this->records);
    }

    public function delete(int $id): void
    {
        $this->notice = '';
        app(Brands::class)->delete($this->actor(), $id);
        if ($this->editingId === $id) {
            $this->newBrand();
        }
        $this->notice = 'برند حذف شد.';
        unset($this->records);
    }

    #[Computed]
    public function records(): LengthAwarePaginator
    {
        return app(Brands::class)->listing($this->actor());
    }

    protected function actor(): User
    {
        $actor = auth('web')->user()?->fresh();
        abort_unless($actor !== null, 403);
        Gate::forUser($actor)->authorize('viewAny', Brand::class);

        return $actor;
    }
}
