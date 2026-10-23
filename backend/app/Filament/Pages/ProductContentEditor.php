<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use App\Filament\Concerns\HandlesCatalogImage;
use App\Models\Product;
use App\Models\User;
use App\Services\CatalogInput;
use App\Services\ProductContent;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\RichEditor;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Pages\Page;
use Filament\Schemas\Schema;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Locked;

final class ProductContentEditor extends Page
{
    use HandlesCatalogImage;

    protected string $view = 'filament.pages.product-content-editor';

    protected static ?string $slug = 'products/{product}/content';

    protected static bool $shouldRegisterNavigation = false;

    #[Locked]
    public int $productId = 0;

    public array $data = [];

    public string $notice = '';

    public function getTitle(): string
    {
        return 'محتوا و گالری محصول';
    }

    public static function canAccess(): bool
    {
        $actor = auth('web')->user()?->fresh();

        return $actor !== null && Gate::forUser($actor)->allows('viewAny', Product::class);
    }

    public function mount(mixed $product): void
    {
        $this->actor();
        $id = filter_var($product, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        abort_unless($id !== false, 404);
        $this->productId = $id;
        $this->reloadContent();
    }

    public function form(Schema $schema): Schema
    {
        $messages = ['required' => 'این فیلد الزامی است.', 'max' => 'مقدار بیش از حد مجاز است.', 'in' => 'از گزینه‌های معتبر انتخاب کنید.'];
        $components = [
            Textarea::make('short_description')->label('توضیح کوتاه')->maxLength(2000)->validationMessages($messages),
            RichEditor::make('full_description')->label('توضیح کامل')->fileAttachments(false)->maxLength(50000)->validationMessages($messages),
            Repeater::make('gallery')->label('گالری؛ برای تغییر ترتیب بکشید')->schema([
                TextInput::make('path')->label('مسیر تصویر امن')->disabled()->dehydrated(),
                TextInput::make('alt')->label('متن جایگزین')->maxLength(255)->validationMessages($messages),
            ])->addable(false)->maxItems(20)->reorderableWithButtons()->reorderableWithDragAndDrop()->live()->validationMessages($messages),
            Select::make('main_image')->label('تصویر اصلی')->options(function (): array {
                $options = collect($this->data['gallery'] ?? [])->filter(fn ($row): bool => is_array($row) && is_string($row['path'] ?? null))->mapWithKeys(fn (array $row): array => [$row['path'] => ($row['alt'] ?? '') ?: basename($row['path'])])->all();

                return $options === [] ? ['/images/catalog-placeholder.svg' => 'بدون تصویر'] : $options;
            })->validationMessages($messages),
            Repeater::make('specifications')->label('مشخصات گروه‌بندی‌شده')->schema([
                TextInput::make('group')->label('گروه')->maxLength(100),
                TextInput::make('key')->label('عنوان')->required()->maxLength(100)->validationMessages($messages),
                Textarea::make('value')->label('مقدار')->required()->maxLength(1000)->validationMessages($messages),
            ])->defaultItems(0)->maxItems(100)->reorderableWithButtons()->validationMessages($messages),
            Repeater::make('faqs')->label('پرسش‌های متداول محصول')->schema([
                TextInput::make('question')->label('پرسش')->required()->maxLength(255)->validationMessages($messages),
                RichEditor::make('answer')->label('پاسخ')->fileAttachments(false)->required()->maxLength(8000)->validationMessages($messages),
            ])->defaultItems(0)->maxItems(20)->reorderableWithButtons()->validationMessages($messages),
        ];
        foreach (['related' => 'محصول‌های مرتبط', 'upsell' => 'پیشنهاد ارتقا', 'cross_sell' => 'پیشنهاد مکمل'] as $kind => $label) {
            $components[] = Select::make('relations.'.$kind)->label($label)->multiple()->searchable()->maxItems(30)
                ->getSearchResultsUsing(fn (string $search): array => $this->searchProducts($search))
                ->getOptionLabelsUsing(fn (array $values): array => $this->productLabels($values))->validationMessages($messages);
        }

        return $schema->components($components)->statePath('data');
    }

    public function reloadContent(): void
    {
        $content = app(ProductContent::class)->read($this->actor(), $this->productId);
        $record = $content['product'];
        $alts = json_decode($record->gallery_alt_texts ?? '{}', true) ?? [];
        $paths = json_decode($record->gallery_images ?? '[]', true) ?? [];
        $gallery = array_map(fn (string $path): array => ['path' => $path, 'alt' => $alts[$path] ?? ''], $paths);
        $this->form->fill([
            'short_description' => $record->short_description,
            'full_description' => $record->full_description,
            'gallery' => $gallery, 'main_image' => $record->main_image,
            'specifications' => json_decode($record->specifications ?? '[]', true) ?? [],
            'faqs' => app(ProductContent::class)->publicFaqs($record->faqs), 'relations' => $content['relations'],
        ]);
        $this->imageUpload = null;
        $this->notice = '';
        $this->resetValidation();
    }

    public function save(): void
    {
        $actor = $this->actor();
        $this->notice = '';
        $this->assertImageReady();
        $state = $this->form->getState();
        $this->persistCatalogImage($state, 'upload_path', function (array $data) use ($actor): Product {
            if (isset($data['upload_path'])) {
                $data['gallery'][] = ['path' => $data['upload_path'], 'alt' => ''];
                unset($data['upload_path']);
                if (($data['main_image'] ?? null) === '/images/catalog-placeholder.svg') {
                    unset($data['main_image']);
                }
            }

            return app(ProductContent::class)->save($actor, $this->productId, $data);
        });
        $this->reloadContent();
        $this->notice = 'محتوای محصول ذخیره شد.';
    }

    protected function searchProducts(string $search): array
    {
        $this->actor();

        return Product::query()->where('id', '<>', $this->productId)->where('title', 'like', '%'.mb_substr($search, 0, 100).'%')->orderBy('id')->limit(30)->pluck('title', 'id')->all();
    }

    protected function productLabels(array $values): array
    {
        $this->actor();
        abort_if(count($values) > 30, 422);
        $values = array_map(fn ($value): int => CatalogInput::integer($value, 'relations', 1), $values);

        return Product::withTrashed()->whereIn('id', $values)->pluck('title', 'id')->all();
    }

    protected function actor(): User
    {
        $actor = auth('web')->user()?->fresh();
        abort_unless($actor !== null, 403);
        Gate::forUser($actor)->authorize('viewAny', Product::class);

        return $actor;
    }
}
