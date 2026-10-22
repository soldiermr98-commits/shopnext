<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use App\Models\Category;
use App\Models\User;
use App\Services\Categories;
use App\Services\SafeUpload;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Pages\Page;
use Filament\Schemas\Schema;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Livewire\Attributes\Computed;
use Livewire\Attributes\Locked;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;
use Livewire\WithFileUploads;
use Livewire\WithPagination;
use Throwable;

final class CategoryEditor extends Page
{
    use WithFileUploads;
    use WithPagination;

    protected string $view = 'filament.pages.category-editor';

    protected static ?string $slug = 'categories';

    public array $data = [];

    #[Locked]
    public ?int $editingId = null;

    #[Locked]
    public ?int $parentId = null;

    public ?TemporaryUploadedFile $imageUpload = null;

    public string $notice = '';

    public static function getNavigationLabel(): string
    {
        return 'دسته‌بندی‌ها';
    }

    public function getTitle(): string
    {
        return 'درخت دسته‌بندی‌ها';
    }

    public static function canAccess(): bool
    {
        $actor = auth('web')->user()?->fresh();

        return $actor !== null && Gate::forUser($actor)->allows('viewAny', Category::class);
    }

    public function mount(): void
    {
        $this->newCategory();
    }

    public function form(Schema $schema): Schema
    {
        $messages = ['required' => 'این فیلد الزامی است.', 'max' => 'مقدار واردشده بیش از حد مجاز است.'];

        return $schema->components([
            TextInput::make('title')->label('عنوان')->required()->maxLength(255)->validationMessages($messages),
            TextInput::make('slug')->label('نامک یکتا')->required()->maxLength(255)->validationMessages($messages),
            Select::make('parent_id')->label('دسته والد')->searchable()
                ->getSearchResultsUsing(fn (string $search): array => $this->parentOptions($search))
                ->getOptionLabelUsing(fn ($value): ?string => $this->parentLabel($value)),
            Textarea::make('description')->label('توضیحات')->maxLength(50000)->validationMessages($messages),
            TextInput::make('meta_title')->label('عنوان سئو')->maxLength(160)->validationMessages($messages),
            Textarea::make('meta_description')->label('شرح سئو')->maxLength(320)->validationMessages($messages),
            Toggle::make('featured')->label('دسته ویژه')->default(false),
        ])->statePath('data');
    }

    public function newCategory(): void
    {
        $this->actor();
        $this->editingId = null;
        $this->imageUpload = null;
        $this->notice = '';
        $this->resetValidation();
        $this->form->fill(['parent_id' => $this->parentId, 'featured' => false]);
    }

    public function edit(int $id): void
    {
        Gate::forUser($this->actor())->authorize('view', $record = Category::findOrFail($id));
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
        $state = $this->form->getState();
        $newImage = null;
        try {
            if ($this->imageUpload !== null) {
                $newImage = app(SafeUpload::class)->store($this->imageUpload);
                $state['image'] = '/media/'.$newImage;
            }
            $record = app(Categories::class)->save($actor, $state, $this->editingId);
        } catch (Throwable $exception) {
            if ($newImage !== null) {
                Storage::disk('local')->delete('media/'.$newImage);
            }
            if ($exception instanceof ValidationException) {
                $messages = [];
                foreach ($exception->errors() as $key => $errors) {
                    $messages[$key === 'file' ? 'imageUpload' : 'data.'.$key] = match ($key) {
                        'file' => ['تصویر PNG، JPEG یا WebP حداکثر ۲ مگابایت و ۲۰۴۸ پیکسل انتخاب کنید.'],
                        'content' => ['متن توضیحات بیش از حد مجاز است.'],
                        default => $errors,
                    };
                }
                throw ValidationException::withMessages($messages);
            }
            throw $exception;
        }
        $this->editingId = $record->id;
        $this->imageUpload = null;
        $this->form->fill($record->getAttributes());
        $this->notice = 'دسته‌بندی ذخیره شد.';
        unset($this->records);
    }

    public function delete(int $id): void
    {
        $this->notice = '';
        app(Categories::class)->delete($this->actor(), $id);
        if ($this->editingId === $id) {
            $this->newCategory();
        }
        $this->notice = 'دسته‌بندی حذف شد.';
        unset($this->records);
    }

    public function openChildren(?int $id): void
    {
        $this->actor();
        if ($id !== null) {
            Category::findOrFail($id);
        }
        $this->parentId = $id;
        $this->resetPage();
        $this->newCategory();
        unset($this->records);
    }

    public function move(int $id, int $direction): void
    {
        $actor = $this->actor();
        $this->notice = '';
        $record = Category::findOrFail($id);
        $ids = Category::query()->where('parent_id', $record->parent_id)->orderBy('order_index')->orderBy('id')->limit(501)->pluck('id')->all();
        $position = array_search($id, $ids, true);
        $target = $position === false ? -1 : $position + $direction;
        if (! in_array($direction, [-1, 1], true) || $position === false || $target < 0 || $target >= count($ids) || count($ids) > 500) {
            throw ValidationException::withMessages(['category' => 'جابجایی در این جهت ممکن نیست؛ هر سطح حداکثر ۵۰۰ دسته برای مرتب‌سازی دارد.']);
        }
        [$ids[$position], $ids[$target]] = [$ids[$target], $ids[$position]];
        app(Categories::class)->reorder($actor, $record->parent_id, $ids);
        $this->notice = 'ترتیب دسته‌بندی‌ها ذخیره شد.';
        unset($this->records);
    }

    #[Computed]
    public function records(): LengthAwarePaginator
    {
        return app(Categories::class)->children($this->actor(), $this->parentId);
    }

    private function parentOptions(string $search): array
    {
        $this->actor();

        return Category::query()->where('id', '!=', $this->editingId ?? 0)->where('title', 'like', '%'.$search.'%')->orderBy('id')->limit(50)->pluck('title', 'id')->all();
    }

    private function parentLabel(mixed $id): ?string
    {
        $this->actor();

        return $id === null || $id === '' ? null : Category::query()->whereKey($id)->value('title');
    }

    private function actor(): User
    {
        $actor = auth('web')->user()?->fresh();
        abort_unless($actor !== null, 403);
        Gate::forUser($actor)->authorize('viewAny', Category::class);

        return $actor;
    }
}
