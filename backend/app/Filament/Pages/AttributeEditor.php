<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use App\Models\CatalogAttribute;
use App\Models\User;
use App\Services\Attributes;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Pages\Page;
use Filament\Schemas\Schema;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Computed;
use Livewire\Attributes\Locked;
use Livewire\WithPagination;

final class AttributeEditor extends Page
{
    use WithPagination;

    protected string $view = 'filament.pages.attribute-editor';

    protected static ?string $slug = 'attributes';

    public array $data = [];

    #[Locked]
    public ?int $editingId = null;

    public string $notice = '';

    public static function getNavigationLabel(): string
    {
        return 'ویژگی‌ها';
    }

    public function getTitle(): string
    {
        return 'مدیریت ویژگی‌ها';
    }

    public static function canAccess(): bool
    {
        $actor = auth('web')->user()?->fresh();

        return $actor !== null && Gate::forUser($actor)->allows('viewAny', CatalogAttribute::class);
    }

    public function mount(): void
    {
        $this->newAttribute();
    }

    public function form(Schema $schema): Schema
    {
        $messages = ['required' => 'این فیلد الزامی است.', 'max' => 'مقدار واردشده بیش از حد مجاز است.'];

        return $schema->components([
            TextInput::make('name')->label('نام ویژگی')->required()->maxLength(255)->validationMessages($messages),
            TextInput::make('slug')->label('نامک یکتا')->required()->maxLength(255)->validationMessages($messages),
            Select::make('type')->label('نوع نمایش')->options(['select' => 'انتخاب متنی', 'color' => 'رنگ', 'image' => 'تصویر'])->required()->default('select')->validationMessages($messages),
        ])->statePath('data');
    }

    public function newAttribute(): void
    {
        $this->actor();
        $this->editingId = null;
        $this->notice = '';
        $this->resetValidation();
        $this->form->fill(['type' => 'select']);
    }

    public function edit(int $id): void
    {
        Gate::forUser($this->actor())->authorize('view', $record = CatalogAttribute::findOrFail($id));
        $this->editingId = $id;
        $this->notice = '';
        $this->resetValidation();
        $this->form->fill($record->getAttributes());
    }

    public function save(): void
    {
        $actor = $this->actor();
        $this->notice = '';
        $record = app(Attributes::class)->save($actor, $this->form->getState(), $this->editingId);
        $this->editingId = $record->id;
        $this->form->fill($record->getAttributes());
        $this->notice = 'ویژگی ذخیره شد.';
        unset($this->records);
    }

    public function delete(int $id): void
    {
        $this->notice = '';
        app(Attributes::class)->delete($this->actor(), $id);
        if ($this->editingId === $id) {
            $this->newAttribute();
        }
        $this->notice = 'ویژگی حذف شد.';
        unset($this->records);
    }

    #[Computed]
    public function records(): LengthAwarePaginator
    {
        return app(Attributes::class)->listing($this->actor());
    }

    private function actor(): User
    {
        $actor = auth('web')->user()?->fresh();
        abort_unless($actor !== null, 403);
        Gate::forUser($actor)->authorize('viewAny', CatalogAttribute::class);

        return $actor;
    }
}
