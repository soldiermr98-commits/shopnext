<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use App\Filament\Support\AdminDate;
use App\Models\User;
use App\Services\AdminAccess;
use App\Services\OrderAdminReads;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Pages\Page;
use Filament\Schemas\Schema;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Locked;
use Livewire\WithPagination;

final class OrdersEditor extends Page
{
    use WithPagination;

    protected string $view = 'filament.pages.orders-editor';

    protected static ?string $slug = 'orders';

    public array $data = [];

    #[Locked]
    public array $filters = [];

    #[Locked]
    public ?int $selected = null;

    public static function getNavigationLabel(): string
    {
        return 'سفارش‌ها';
    }

    public function getTitle(): string
    {
        return 'سفارش‌ها';
    }

    public static function canAccess(): bool
    {
        $actor = auth('web')->user()?->fresh();

        return $actor !== null && Gate::forUser($actor)->allows('admin.orders.view');
    }

    public function mount(): void
    {
        $this->actor();
        $this->form->fill();
    }

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('search')->label('شماره سفارش، تلفن، نام یا کد پیگیری')->maxLength(100),
            Select::make('status')->label('وضعیت')->options(['pending' => 'در انتظار', 'awaiting_payment' => 'در انتظار پرداخت', 'processing' => 'در حال پردازش', 'shipped' => 'ارسال‌شده', 'delivered' => 'تحویل‌شده', 'cancelled' => 'لغوشده', 'failed' => 'ناموفق', 'refunded' => 'بازپرداخت‌شده']),
            Select::make('payment_state')->label('وضعیت پرداخت')->options(['unpaid' => 'پرداخت‌نشده', 'pending_verification' => 'بررسی رسید', 'paid' => 'پرداخت‌شده', 'failed' => 'ناموفق', 'refunded' => 'بازپرداخت‌شده']),
            Select::make('payment_method')->label('روش پرداخت')->options(['cod' => 'پرداخت در محل', 'wallet' => 'کیف پول', 'card_to_card' => 'کارت به کارت']),
            TextInput::make('shipping_method_id')->label('شناسه روش ارسال')->maxLength(64),
            AdminDate::input('from', 'از زمان تهران'), AdminDate::input('until', 'تا زمان تهران'),
        ])->statePath('data');
    }

    public function applyFilters(): void
    {
        $actor = $this->actor();
        $filters = $this->form->getState();
        // Validate before committing filter state; invalid input never becomes a raw query.
        app(OrderAdminReads::class)->listing($actor, $filters);
        $this->filters = $filters;
        $this->resetPage();
    }

    public function select(int $id): void
    {
        app(OrderAdminReads::class)->detail($this->actor(), $id);
        $this->selected = $id;
    }

    public function closeDetail(): void
    {
        $this->actor();
        $this->selected = null;
    }

    public function orders(): mixed
    {
        return app(OrderAdminReads::class)->listing($this->actor(), $this->filters);
    }

    public function detail(): ?array
    {
        $actor = $this->actor();

        return $this->selected === null ? null : app(OrderAdminReads::class)->detail($actor, $this->selected);
    }

    protected function actor(): User
    {
        $actor = auth('web')->user();
        abort_unless($actor !== null, 403);

        return app(AdminAccess::class)->authorize($actor, 'orders.view');
    }
}
