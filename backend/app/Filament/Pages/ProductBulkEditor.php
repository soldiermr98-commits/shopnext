<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Services\CatalogInput;
use App\Services\ProductBulk;
use App\Support\Persian;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Pages\Page;
use Filament\Schemas\Schema;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

final class ProductBulkEditor extends Page
{
    protected string $view = 'filament.pages.product-bulk-editor';

    protected static ?string $slug = 'product-bulk';

    public array $data = [];

    public string $notice = '';

    public static function getNavigationLabel(): string
    {
        return 'عملیات گروهی محصول‌ها';
    }

    public function getTitle(): string
    {
        return 'عملیات گروهی محصول‌ها';
    }

    public static function canAccess(): bool
    {
        $actor = auth('web')->user()?->fresh();

        return $actor !== null && Gate::forUser($actor)->allows('viewAny', Product::class);
    }

    public function mount(): void
    {
        $this->actor();
        $this->form->fill(['products' => [], 'categories' => [], 'direction' => 'increase']);
    }

    public function form(Schema $schema): Schema
    {
        $messages = ['required' => 'حداقل یک محصول انتخاب کنید.', 'max' => 'تعداد انتخاب‌ها بیش از حد مجاز است.', 'in' => 'گزینه معتبر انتخاب کنید.'];

        return $schema->components([
            Select::make('products')->label('محصول‌های انتخاب‌شده')->required()->multiple()->searchable()->maxItems(50)
                ->getSearchResultsUsing(function (string $search): array {
                    $this->actor();

                    return Product::where('title', 'like', '%'.mb_substr($search, 0, 100).'%')->orderBy('id')->limit(50)->pluck('title', 'id')->all();
                })->getOptionLabelsUsing(function (array $values): array {
                    $this->actor();
                    $values = $this->ids($values, 50);

                    return Product::withTrashed()->whereIn('id', $values)->pluck('title', 'id')->all();
                })->validationMessages($messages),
            TextInput::make('percent')->label('درصد صحیح تغییر قیمت')->inputMode('numeric')->helperText('افزایش ۱ تا ۱۰۰۰ درصد؛ کاهش ۱ تا ۱۰۰ درصد. برای تغییر دسته لازم نیست.'),
            Select::make('direction')->label('جهت تغییر قیمت')->options(['increase' => 'افزایش', 'decrease' => 'کاهش'])->required()->validationMessages($messages),
            Select::make('categories')->label('دسته‌های جایگزین')->multiple()->searchable()->maxItems(30)
                ->getSearchResultsUsing(function (string $search): array {
                    $this->actor();

                    return Category::where('title', 'like', '%'.mb_substr($search, 0, 100).'%')->orderBy('id')->limit(30)->pluck('title', 'id')->all();
                })->getOptionLabelsUsing(function (array $values): array {
                    $this->actor();
                    $values = $this->ids($values, 30);

                    return Category::whereIn('id', $values)->pluck('title', 'id')->all();
                })->validationMessages($messages),
        ])->statePath('data');
    }

    public function applyPrices(): void
    {
        $this->apply('prices');
    }

    public function applyCategories(): void
    {
        $this->apply('categories');
    }

    protected function apply(string $operation): void
    {
        $actor = $this->actor();
        $this->notice = '';
        try {
            $state = $this->form->getState();
            $count = $operation === 'prices'
                ? app(ProductBulk::class)->prices($actor, $state['products'], $state['percent'] ?? null, $state['direction'])
                : app(ProductBulk::class)->categories($actor, $state['products'], $state['categories'] ?? []);
        } catch (ValidationException $exception) {
            $messages = [];
            foreach ($exception->errors() as $field => $errors) {
                $messages[str_starts_with($field, 'data.') ? $field : 'data.'.$field] = $errors;
            }
            throw ValidationException::withMessages($messages);
        }
        $this->notice = $operation === 'prices' ? 'قیمت '.Persian::digits($count).' ردیف کالا یا تنوع تعدیل شد.' : 'دسته‌بندی '.Persian::digits($count).' محصول جایگزین شد.';
    }

    protected function ids(array $values, int $limit): array
    {
        abort_if(count($values) > $limit, 422);

        return array_map(fn ($value): int => CatalogInput::integer($value, 'products', 1), $values);
    }

    protected function actor(): User
    {
        $actor = auth('web')->user()?->fresh();
        abort_unless($actor !== null, 403);
        Gate::forUser($actor)->authorize('viewAny', Product::class);

        return $actor;
    }
}
