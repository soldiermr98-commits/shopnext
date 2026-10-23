<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use App\Filament\Support\AdminDate;
use App\Models\Brand;
use App\Models\Product;
use App\Models\User;
use App\Services\Products;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Pages\Page;
use Filament\Schemas\Schema;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Livewire\Attributes\Computed;
use Livewire\Attributes\Locked;
use Livewire\WithPagination;

final class ProductEditor extends Page
{
    use WithPagination;

    protected string $view = 'filament.pages.product-editor';

    protected static ?string $slug = 'products';

    #[Locked]
    public ?int $editingId = null;

    public array $data = [];

    public bool $trashed = false;

    public string $notice = '';

    public static function getNavigationLabel(): string
    {
        return 'محصول‌ها';
    }

    public function getTitle(): string
    {
        return 'مدیریت محصول‌ها';
    }

    public static function canAccess(): bool
    {
        $actor = auth('web')->user()?->fresh();

        return $actor !== null && Gate::forUser($actor)->allows('viewAny', Product::class);
    }

    public function mount(): void
    {
        $this->newProduct();
    }

    public function form(Schema $schema): Schema
    {
        $messages = ['required' => 'این فیلد الزامی است.', 'max' => 'مقدار بیش از حد مجاز است.', 'in' => 'گزینه معتبر انتخاب کنید.'];
        $fields = [
            TextInput::make('title')->label('عنوان')->required()->maxLength(255)->validationMessages($messages),
            TextInput::make('slug')->label('نامک یکتا')->required()->maxLength(255)->validationMessages($messages),
            TextInput::make('sku')->label('شناسه کالا')->required()->maxLength(100)->validationMessages($messages),
            Select::make('type')->label('نوع')->options(['simple' => 'ساده', 'variable' => 'متغیر', 'digital' => 'دیجیتال', 'bundle' => 'بسته'])->required()->helperText('محصول متغیر را ابتدا پیش‌نویس ذخیره و تنوع‌های آن را ثبت کنید.')->validationMessages($messages),
            Select::make('status')->label('انتشار')->options(['draft' => 'پیش‌نویس', 'published' => 'منتشرشده', 'scheduled' => 'زمان‌بندی‌شده'])->required()->validationMessages($messages),
            Select::make('brand_id')->label('برند')->searchable()
                ->getSearchResultsUsing(function (string $search): array {
                    $this->actor();

                    return Brand::where('name', 'like', '%'.mb_substr($search, 0, 100).'%')->orderBy('id')->limit(30)->pluck('name', 'id')->all();
                })->getOptionLabelUsing(function ($value): ?string {
                    $this->actor();

                    return $value ? Brand::whereKey($value)->value('name') : null;
                })->validationMessages($messages),
            Toggle::make('featured')->label('ویژه'),
        ];
        foreach (['price' => 'قیمت اصلی (تومان)', 'sale_price' => 'قیمت تخفیف (تومان)', 'flash_price' => 'قیمت فروش ویژه (تومان)', 'weight_grams' => 'وزن (گرم)', 'max_quantity' => 'سقف تعداد خرید', 'low_stock_threshold' => 'آستانه هشدار موجودی'] as $name => $label) {
            $fields[] = TextInput::make($name)->label($label)->inputMode('numeric')->required($name === 'price')->validationMessages($messages);
        }
        foreach (['published_at' => 'زمان انتشار', 'sale_starts_at' => 'آغاز تخفیف', 'sale_ends_at' => 'پایان تخفیف', 'flash_starts_at' => 'آغاز فروش ویژه', 'flash_ends_at' => 'پایان فروش ویژه'] as $name => $label) {
            $fields[] = AdminDate::input($name, $label);
        }
        $fields[] = TextInput::make('meta_title')->label('عنوان سئو')->maxLength(160)->validationMessages($messages);
        $fields[] = TextInput::make('meta_description')->label('توضیح سئو')->maxLength(320)->validationMessages($messages);

        return $schema->components($fields)->statePath('data');
    }

    public function newProduct(): void
    {
        $this->actor();
        $this->editingId = null;
        $this->notice = '';
        $this->resetValidation();
        $this->form->fill(['type' => 'simple', 'status' => 'draft', 'featured' => false, 'low_stock_threshold' => 5]);
    }

    public function edit(int $id): void
    {
        Gate::forUser($this->actor())->authorize('view', $record = Product::findOrFail($id));
        $this->editingId = $id;
        $this->notice = '';
        $this->resetValidation();
        $this->form->fill($record->only(Products::FIELDS));
    }

    public function save(): void
    {
        $actor = $this->actor();
        $this->notice = '';
        try {
            $record = app(Products::class)->save($actor, $this->form->getState(), $this->editingId);
        } catch (ValidationException $exception) {
            $errors = [];
            foreach ($exception->errors() as $field => $messages) {
                $errors[str_starts_with($field, 'data.') ? $field : 'data.'.$field] = $messages;
            }
            throw ValidationException::withMessages($errors);
        }
        $this->edit($record->id);
        $this->notice = 'محصول ذخیره شد.';
        unset($this->records);
    }

    public function delete(int $id): void
    {
        $this->notice = '';
        app(Products::class)->delete($this->actor(), $id);
        if ($this->editingId === $id) {
            $this->newProduct();
        }
        $this->notice = 'محصول به سطل زباله منتقل شد.';
        unset($this->records);
    }

    public function restore(int $id): void
    {
        $this->notice = '';
        app(Products::class)->restore($this->actor(), $id);
        $this->notice = 'محصول بازیابی شد.';
        unset($this->records);
    }

    public function toggleTrash(): void
    {
        $this->actor();
        $this->trashed = ! $this->trashed;
        $this->newProduct();
        $this->resetPage();
        unset($this->records);
    }

    #[Computed]
    public function records(): LengthAwarePaginator
    {
        return app(Products::class)->listing($this->actor(), $this->trashed);
    }

    protected function actor(): User
    {
        $actor = auth('web')->user()?->fresh();
        abort_unless($actor !== null, 403);
        Gate::forUser($actor)->authorize('viewAny', Product::class);

        return $actor;
    }
}
