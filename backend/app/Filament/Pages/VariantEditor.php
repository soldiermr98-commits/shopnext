<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use App\Filament\Concerns\HandlesCatalogImage;
use App\Filament\Support\AdminDate;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\Variants;
use Filament\Forms\Components\TextInput;
use Filament\Pages\Page;
use Filament\Schemas\Schema;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Computed;
use Livewire\Attributes\Locked;
use Livewire\WithPagination;

final class VariantEditor extends Page
{
    use HandlesCatalogImage;
    use WithPagination;

    protected string $view = 'filament.pages.variant-editor';

    protected static ?string $slug = 'products/{product}/variants';

    protected static bool $shouldRegisterNavigation = false;

    #[Locked]
    public int $productId = 0;

    #[Locked]
    public ?int $editingId = null;

    public array $data = [];

    public bool $trashed = false;

    public string $notice = '';

    public function getTitle(): string
    {
        return 'تنوع‌های محصول';
    }

    public static function canAccess(): bool
    {
        $actor = auth('web')->user()?->fresh();

        return $actor !== null && Gate::forUser($actor)->allows('viewAny', ProductVariant::class);
    }

    public function mount(mixed $product): void
    {
        $this->actor();
        $id = filter_var($product, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        abort_unless($id !== false, 404);
        $parent = Product::findOrFail($id);
        Gate::forUser($this->actor())->authorize('view', $parent);
        abort_unless($parent->type === 'variable', 404);
        $this->productId = $id;
        $this->newVariant();
    }

    public function form(Schema $schema): Schema
    {
        $messages = ['required' => 'این فیلد الزامی است.', 'max' => 'مقدار بیش از حد مجاز است.'];
        $fields = [TextInput::make('sku')->label('شناسه یکتای تنوع')->required()->maxLength(100)->validationMessages($messages)];
        foreach (['price' => 'قیمت (تومان)', 'sale_price' => 'قیمت تخفیف', 'flash_price' => 'قیمت فروش ویژه', 'weight_grams' => 'وزن (گرم)', 'max_quantity' => 'سقف تعداد خرید'] as $name => $label) {
            $fields[] = TextInput::make($name)->label($label)->inputMode('numeric')->required($name === 'price')->validationMessages($messages);
        }
        foreach (['sale_starts_at' => 'آغاز تخفیف', 'sale_ends_at' => 'پایان تخفیف', 'flash_starts_at' => 'آغاز فروش ویژه', 'flash_ends_at' => 'پایان فروش ویژه'] as $name => $label) {
            $fields[] = AdminDate::input($name, $label);
        }

        return $schema->components($fields)->statePath('data');
    }

    public function newVariant(): void
    {
        $this->actor();
        $this->editingId = null;
        $this->imageUpload = null;
        $this->notice = '';
        $this->resetValidation();
        $this->form->fill([]);
    }

    public function edit(int $id): void
    {
        Gate::forUser($this->actor())->authorize('view', $record = ProductVariant::where('product_id', $this->productId)->findOrFail($id));
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
        $record = $this->persistCatalogImage($state, 'image', fn (array $data): ProductVariant => app(Variants::class)->save($actor, $this->productId, $data, $this->editingId));
        $this->edit($record->id);
        $this->notice = 'تنوع ذخیره شد.';
        unset($this->records);
    }

    public function delete(int $id): void
    {
        $this->notice = '';
        app(Variants::class)->delete($this->actor(), $this->productId, $id);
        if ($this->editingId === $id) {
            $this->newVariant();
        }
        $this->notice = 'تنوع به سطل زباله منتقل شد.';
        unset($this->records);
    }

    public function restore(int $id): void
    {
        $this->notice = '';
        app(Variants::class)->restore($this->actor(), $this->productId, $id);
        $this->notice = 'تنوع بازیابی شد.';
        unset($this->records);
    }

    public function toggleTrash(): void
    {
        $this->actor();
        $this->trashed = ! $this->trashed;
        $this->newVariant();
        $this->resetPage();
        unset($this->records);
    }

    #[Computed]
    public function records(): LengthAwarePaginator
    {
        return app(Variants::class)->listing($this->actor(), $this->productId, $this->trashed);
    }

    protected function actor(): User
    {
        $actor = auth('web')->user()?->fresh();
        abort_unless($actor !== null, 403);
        Gate::forUser($actor)->authorize('viewAny', ProductVariant::class);

        return $actor;
    }
}
