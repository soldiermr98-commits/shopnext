<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use App\Filament\Concerns\HandlesCatalogImage;
use App\Models\AttributeTerm;
use App\Models\CatalogAttribute;
use App\Models\User;
use App\Services\Attributes;
use Filament\Forms\Components\ColorPicker;
use Filament\Forms\Components\TextInput;
use Filament\Pages\Page;
use Filament\Schemas\Schema;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Computed;
use Livewire\Attributes\Locked;
use Livewire\WithPagination;

final class AttributeTermEditor extends Page
{
    use HandlesCatalogImage;
    use WithPagination;

    protected string $view = 'filament.pages.attribute-term-editor';

    protected static ?string $slug = 'attributes/{attribute}/terms';

    protected static bool $shouldRegisterNavigation = false;

    public array $data = [];

    #[Locked]
    public int $attributeId = 0;

    #[Locked]
    public ?int $editingId = null;

    public string $notice = '';

    public function getTitle(): string
    {
        return 'مدیریت گزینه‌های ویژگی';
    }

    public static function canAccess(): bool
    {
        $actor = auth('web')->user()?->fresh();

        return $actor !== null && Gate::forUser($actor)->allows('viewAny', AttributeTerm::class);
    }

    public function mount(mixed $attribute): void
    {
        $this->actor();
        $id = filter_var($attribute, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        abort_unless($id !== false, 404);
        $this->attributeId = $id;
        $this->attributeRecord;
        $this->newTerm();
    }

    public function form(Schema $schema): Schema
    {
        $messages = ['required' => 'این فیلد الزامی است.', 'max' => 'مقدار واردشده بیش از حد مجاز است.', 'min' => 'مقدار منفی مجاز نیست.', 'integer' => 'عدد صحیح وارد کنید.', 'numeric' => 'عدد صحیح وارد کنید.'];

        return $schema->components([
            TextInput::make('name')->label('نام گزینه')->required()->maxLength(255)->validationMessages($messages),
            TextInput::make('slug')->label('نامک یکتا در ویژگی')->required()->maxLength(255)->validationMessages($messages),
            ColorPicker::make('hex')->label('رنگ هگز')->hex()->validationMessages($messages),
            TextInput::make('order_index')->label('ترتیب نمایش')->numeric()->rules(['integer'])->required()->minValue(0)->maxValue(2147483647)->default(0)->validationMessages($messages),
        ])->statePath('data');
    }

    public function newTerm(): void
    {
        $this->actor();
        $this->editingId = null;
        $this->imageUpload = null;
        $this->notice = '';
        $this->resetValidation();
        $this->form->fill(['order_index' => 0]);
    }

    public function edit(int $id): void
    {
        Gate::forUser($this->actor())->authorize('view', $record = AttributeTerm::where('attribute_id', $this->attributeId)->findOrFail($id));
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
        $record = $this->persistCatalogImage($state, 'image', fn (array $data): AttributeTerm => app(Attributes::class)->saveTerm($actor, $this->attributeId, $data, $this->editingId));
        $this->editingId = $record->id;
        $this->imageUpload = null;
        $this->form->fill($record->getAttributes());
        $this->notice = 'گزینه ذخیره شد.';
        unset($this->records);
    }

    public function delete(int $id): void
    {
        $this->notice = '';
        app(Attributes::class)->deleteTerm($this->actor(), $this->attributeId, $id);
        if ($this->editingId === $id) {
            $this->newTerm();
        }
        $this->notice = 'گزینه حذف شد.';
        unset($this->records);
    }

    #[Computed]
    public function attributeRecord(): CatalogAttribute
    {
        Gate::forUser($this->actor())->authorize('view', $record = CatalogAttribute::findOrFail($this->attributeId));

        return $record;
    }

    #[Computed]
    public function records(): LengthAwarePaginator
    {
        return app(Attributes::class)->terms($this->actor(), $this->attributeId);
    }

    protected function actor(): User
    {
        $actor = auth('web')->user()?->fresh();
        abort_unless($actor !== null, 403);
        Gate::forUser($actor)->authorize('viewAny', AttributeTerm::class);

        return $actor;
    }
}
