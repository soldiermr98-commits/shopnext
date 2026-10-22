<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use App\Models\AttributeTerm;
use App\Models\CatalogAttribute;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\CatalogInput;
use App\Services\Variants;
use App\Support\Persian;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Pages\Page;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Components\Utilities\Set;
use Filament\Schemas\Schema;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Livewire\Attributes\Locked;

final class VariantMatrixEditor extends Page
{
    protected string $view = 'filament.pages.variant-matrix-editor';

    protected static ?string $slug = 'products/{product}/matrix';

    protected static bool $shouldRegisterNavigation = false;

    #[Locked]
    public int $productId = 0;

    public array $data = [];

    public string $notice = '';

    public function getTitle(): string
    {
        return 'تولید ماتریس تنوع';
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
        $record = Product::findOrFail($id);
        Gate::forUser($this->actor())->authorize('view', $record);
        abort_unless($record->type === 'variable', 404);
        $this->productId = $id;
        $this->form->fill(['price' => $record->price, 'dimensions' => [['attribute_id' => null, 'term_ids' => []]]]);
    }

    public function form(Schema $schema): Schema
    {
        $messages = ['required' => 'این فیلد الزامی است.', 'min' => 'حداقل یک گزینه انتخاب کنید.', 'max' => 'تعداد یا طول بیش از حد مجاز است.', 'in' => 'گزینه معتبر انتخاب کنید.'];

        return $schema->components([
            TextInput::make('price')->label('قیمت اولیه تنوع‌های جدید (تومان)')->required()->inputMode('numeric')->validationMessages($messages),
            TextInput::make('prefix')->label('پیشوند شناسه (اختیاری)')->maxLength(70)->helperText('در صورت خالی بودن از شناسه مادر استفاده می‌شود؛ حداکثر ۷۰ نویسه.')->validationMessages($messages),
            Repeater::make('dimensions')->label('ویژگی‌ها و گزینه‌ها')->schema([
                Select::make('attribute_id')->label('ویژگی')->required()->searchable()->live()
                    ->afterStateUpdated(fn (Set $set) => $set('term_ids', []))
                    ->getSearchResultsUsing(function (string $search): array {
                        $this->actor();

                        return CatalogAttribute::where('name', 'like', '%'.mb_substr($search, 0, 100).'%')->orderBy('id')->limit(30)->pluck('name', 'id')->all();
                    })->getOptionLabelUsing(function ($value): ?string {
                        $this->actor();

                        return $value ? CatalogAttribute::whereKey(CatalogInput::integer($value, 'dimensions', 1))->value('name') : null;
                    })->validationMessages($messages),
                Select::make('term_ids')->label('گزینه‌های همین ویژگی')->required()->multiple()->searchable()->maxItems(20)
                    ->getSearchResultsUsing(function (Get $get, string $search): array {
                        $this->actor();
                        if (! $get('attribute_id')) {
                            return [];
                        }

                        return AttributeTerm::where('attribute_id', CatalogInput::integer($get('attribute_id'), 'dimensions', 1))->where('name', 'like', '%'.mb_substr($search, 0, 100).'%')->orderBy('id')->limit(20)->pluck('name', 'id')->all();
                    })->getOptionLabelsUsing(function (Get $get, array $values): array {
                        $this->actor();
                        abort_if(count($values) > 20, 422);
                        $values = array_map(fn ($value): int => CatalogInput::integer($value, 'dimensions', 1), $values);

                        return $get('attribute_id') ? AttributeTerm::where('attribute_id', CatalogInput::integer($get('attribute_id'), 'dimensions', 1))->whereIn('id', $values)->pluck('name', 'id')->all() : [];
                    })->validationMessages($messages),
            ])->minItems(1)->maxItems(4)->validationMessages($messages),
        ])->statePath('data');
    }

    public function generate(): void
    {
        $actor = $this->actor();
        $this->notice = '';
        try {
            $state = $this->form->getState();
            $dimensions = [];
            foreach ($state['dimensions'] as $row) {
                $id = CatalogInput::integer($row['attribute_id'], 'dimensions', 1);
                if (array_key_exists($id, $dimensions)) {
                    throw ValidationException::withMessages(['dimensions' => 'هر ویژگی فقط یک بار انتخاب می‌شود.']);
                }
                $dimensions[$id] = $row['term_ids'];
            }
            $prefix = trim($state['prefix'] ?? '');
            $count = app(Variants::class)->generate($actor, $this->productId, $dimensions, $state['price'], $prefix === '' ? null : $prefix);
        } catch (ValidationException $exception) {
            $messages = [];
            foreach ($exception->errors() as $field => $errors) {
                $messages[str_starts_with($field, 'data.') ? $field : 'data.'.$field] = $errors;
            }
            throw ValidationException::withMessages($messages);
        }
        $this->notice = Persian::digits($count).' تنوع جدید ساخته شد؛ تنوع‌های موجود و موجودی آن‌ها تغییر نکردند.';
    }

    protected function actor(): User
    {
        $actor = auth('web')->user()?->fresh();
        abort_unless($actor !== null, 403);
        Gate::forUser($actor)->authorize('viewAny', ProductVariant::class);

        return $actor;
    }
}
