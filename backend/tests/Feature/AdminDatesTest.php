<?php

declare(strict_types=1);

use App\Filament\Support\AdminDate;
use App\Support\Persian;
use Filament\Schemas\Concerns\InteractsWithSchemas;
use Filament\Schemas\Contracts\HasSchemas;
use Filament\Schemas\Schema;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Livewire\Component;
use Livewire\Livewire;
use Tests\Support\FinancialFixtures;

// Test-only harness: not a production action or route. Direct SQL is fixture I/O.
class AdminDateHarness extends Component implements HasSchemas
{
    use InteractsWithSchemas;

    public array $data = [];

    public int $productId;

    public function mount(int $productId): void
    {
        $this->productId = $productId;
        $this->reloadFixture();
    }

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            AdminDate::input('at', 'زمان آزمون')->required(),
        ])->statePath('data');
    }

    public function saveFixture(): void
    {
        $state = $this->form->getState();
        DB::table('products')->where('id', $this->productId)->update(['sale_starts_at' => $state['at']]);
        $this->reloadFixture();
    }

    public function reloadFixture(): void
    {
        $this->form->fill(['at' => DB::table('products')->where('id', $this->productId)->value('sale_starts_at')]);
    }

    public function render(): mixed
    {
        return <<<'BLADE'
        <div>{{ $this->form }}</div>
        BLADE;
    }
}

uses(RefreshDatabase::class);

it('L3a renders the retained Jalali picker saves selected state as Gregorian UTC and reloads at Tehran midnight', function () {
    expect(Composer\InstalledVersions::getPrettyVersion('filament/forms'))->toBe('v5.10.3');
    $fixtures = json_decode(file_get_contents(base_path('../tools/ci/jalali/cases.json')), true, 512, JSON_THROW_ON_ERROR);
    foreach ($fixtures as $fixture) {
        $id = FinancialFixtures::product();
        $form = Livewire::test(AdminDateHarness::class, ['productId' => $id]);
        // A view override which is silently ignored by Filament is NOT compatible.
        $form->assertSee('jalaliDateTimePickerFormComponent', false);
        $form->set('data.at', $fixture['selected'])->call('saveFixture')->assertHasNoErrors();
        expect(DB::table('products')->where('id', $id)->value('sale_starts_at'))->toBe($fixture['utc']);
        $form->assertSet('data.at', $fixture['selected']);
        expect(AdminDate::display($fixture['utc']))->toBe(Persian::digits($fixture['display']));
        Livewire::test(AdminDateHarness::class, ['productId' => $id])->assertSet('data.at', $fixture['selected'])->assertSee('jalaliDateTimePickerFormComponent', false);
    }
});

it('L3a formats table and infolist dates in Persian without database queries or mutating timestamps', function () {
    $utc = Carbon\Carbon::parse('2026-03-21 20:30:00', 'UTC');
    DB::enableQueryLog();
    DB::flushQueryLog();
    for ($i = 0; $i < 1000; $i++) {
        expect(AdminDate::display($utc))->toBe('۱۴۰۵/۰۱/۰۲ ۰۰:۰۰:۰۰');
    }
    expect(DB::getQueryLog())->toHaveCount(0);
    DB::disableQueryLog();
    expect($utc->getTimezone()->getName())->toBe('UTC');
    expect($utc->format('Y-m-d H:i:s'))->toBe('2026-03-21 20:30:00');
    expect(AdminDate::display(null))->toBe('—');
    expect(AdminDate::column('created_at', 'تاریخ')->getLabel())->toBe('تاریخ');
    expect(AdminDate::entry('created_at', 'تاریخ')->getLabel())->toBe('تاریخ');
});
