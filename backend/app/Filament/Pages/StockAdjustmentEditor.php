<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use App\Models\Product;
use App\Models\User;
use App\Services\CatalogInput;
use App\Services\StockAdjustment;
use App\Support\Persian;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Pages\Page;
use Filament\Schemas\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Livewire\Attributes\Locked;
use Livewire\WithPagination;

final class StockAdjustmentEditor extends Page
{
    use WithPagination;

    protected string $view = 'filament.pages.stock-adjustment-editor';

    protected static ?string $slug = 'stock-adjustment';

    public array $data = [];

    public string $notice = '';

    #[Locked]
    public string $requestKey = '';

    public static function getNavigationLabel(): string
    {
        return 'تعدیل و دفتر موجودی';
    }

    public function getTitle(): string
    {
        return 'تعدیل و دفتر موجودی';
    }

    public static function canAccess(): bool
    {
        $actor = auth('web')->user()?->fresh();

        return $actor !== null && Gate::forUser($actor)->allows('viewAny', Product::class);
    }

    public function mount(): void
    {
        $this->actor();
        $this->newRequest();
        $this->form->fill(['targets' => [], 'amount' => '', 'direction' => 'increase', 'reason' => '']);
    }

    public function newRequest(): void
    {
        $this->actor();
        $this->requestKey = (string) Str::uuid();
        $this->notice = '';
    }

    public function form(Schema $schema): Schema
    {
        $messages = ['required' => 'این فیلد الزامی است.', 'max' => 'تعداد یا طول مقدار بیش از حد مجاز است.'];

        return $schema->components([
            Select::make('targets')->label('کالا یا تنوع (حداکثر ۵۰)')->multiple()->required()->maxItems(50)->searchable()->getSearchResultsUsing(fn (string $search): array => $this->options($search))->getOptionLabelsUsing(fn (array $values): array => $this->labels($values))->validationMessages($messages),
            TextInput::make('amount')->label('تعداد صحیح ۱ تا ۱۰۰۰۰۰۰')->required()->inputMode('numeric')->validationMessages($messages),
            Select::make('direction')->label('جهت')->required()->options(['increase' => 'افزایش', 'decrease' => 'کاهش'])->validationMessages($messages),
            TextInput::make('reason')->label('دلیل تعدیل (الزامی)')->required()->maxLength(200)->validationMessages($messages),
        ])->statePath('data');
    }

    public function adjustOne(): void
    {
        $this->apply(false);
    }

    public function adjustMany(): void
    {
        $this->apply(true);
    }

    protected function apply(bool $bulk): void
    {
        $actor = $this->actor();
        $this->notice = '';
        try {
            $state = $this->form->getState();
            $targets = $this->targets($state['targets']);
            if (! $bulk && count($targets) !== 1) {
                throw ValidationException::withMessages(['targets' => 'برای تعدیل تکی دقیقاً یک ردیف انتخاب کنید.']);
            }
            $service = app(StockAdjustment::class);
            $count = $bulk
                ? $service->bulk($actor, $targets, $state['amount'], $state['direction'], $state['reason'], $this->requestKey)
                : $service->adjust($actor, $targets[0]['product_id'], $targets[0]['variant_id'], $state['amount'], $state['direction'], $state['reason'], $this->requestKey);
        } catch (ValidationException $exception) {
            $messages = [];
            foreach ($exception->errors() as $key => $errors) {
                $messages[str_starts_with($key, 'data.') ? $key : 'data.'.$key] = $errors;
            }
            throw ValidationException::withMessages($messages);
        }
        $this->notice = 'تعدیل '.Persian::digits($count).' ردیف ثبت شد. برای عملیات دیگر «درخواست جدید» را بزنید.';
    }

    public function ledger(): mixed
    {
        $this->actor();

        return DB::table('stock_adjustments as a')->join('users as u', 'u.id', '=', 'a.actor_id')->join('products as p', 'p.id', '=', 'a.product_id')->leftJoin('product_variants as v', 'v.id', '=', 'a.variant_id')->select(['a.*', 'u.name as actor_name', 'p.title', 'p.sku as product_sku', 'v.sku as variant_sku'])->orderByDesc('a.id')->paginate(30);
    }

    protected function options(string $search): array
    {
        $this->actor();
        $search = '%'.mb_substr($search, 0, 100).'%';
        $roots = Product::where('type', 'simple')->where('title', 'like', $search)->orderBy('id')->limit(25)->get(['id', 'title', 'sku'])->mapWithKeys(fn ($row): array => ['p:'.$row->id => $row->title.' / '.$row->sku])->all();
        $variants = DB::table('product_variants as v')->join('products as p', 'p.id', '=', 'v.product_id')->whereNull('p.deleted_at')->whereNull('v.deleted_at')->where('p.title', 'like', $search)->orderBy('v.id')->limit(25)->get(['v.id', 'v.sku', 'p.title'])->mapWithKeys(fn ($row): array => ['v:'.$row->id => $row->title.' / '.$row->sku])->all();

        return $roots + $variants;
    }

    protected function labels(array $values): array
    {
        $this->actor();
        $targets = $this->targets($values);
        $roots = Product::whereIn('id', array_column($targets, 'product_id'))->pluck('title', 'id');
        $variants = DB::table('product_variants')->whereIn('id', array_filter(array_column($targets, 'variant_id')))->pluck('sku', 'id');
        $labels = [];
        foreach ($targets as $target) {
            $key = $target['variant_id'] === null ? 'p:'.$target['product_id'] : 'v:'.$target['variant_id'];
            $labels[$key] = ($roots[$target['product_id']] ?? 'حذف‌شده').' / '.($target['variant_id'] === null ? $key : ($variants[$target['variant_id']] ?? 'حذف‌شده'));
        }

        return $labels;
    }

    protected function targets(array $values): array
    {
        if (count($values) > 50) {
            throw ValidationException::withMessages(['targets' => 'حداکثر ۵۰ ردیف انتخاب کنید.']);
        }
        $parsed = [];
        $variantIds = [];
        foreach ($values as $value) {
            if (! is_string($value) || ! preg_match('/^([pv]):([0-9]+)$/D', $value, $match)) {
                throw ValidationException::withMessages(['targets' => 'شناسه کالا معتبر نیست.']);
            }
            $id = CatalogInput::integer($match[2], 'targets', 1);
            $parsed[] = [$match[1], $id];
            if ($match[1] === 'v') {
                $variantIds[] = $id;
            }
        }
        $parents = DB::table('product_variants')->whereIn('id', $variantIds)->pluck('product_id', 'id');

        return array_map(fn (array $row): array => ['product_id' => $row[0] === 'p' ? $row[1] : (int) ($parents[$row[1]] ?? 0), 'variant_id' => $row[0] === 'p' ? null : $row[1]], $parsed);
    }

    protected function actor(): User
    {
        $actor = auth('web')->user()?->fresh();
        abort_unless($actor !== null, 403);
        Gate::forUser($actor)->authorize('viewAny', Product::class);

        return $actor;
    }
}
