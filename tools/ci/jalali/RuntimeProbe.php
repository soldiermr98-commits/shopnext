<?php

declare(strict_types=1);

use Filament\Forms\Components\DateTimePicker;
use Filament\Schemas\Concerns\InteractsWithSchemas;
use Filament\Schemas\Contracts\HasSchemas;
use Filament\Schemas\Schema;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Livewire\Component;
use Livewire\Livewire;
use Tests\Support\FinancialFixtures;

// Copied into tests/Feature only in the one disposable candidate job. Never a
// production route, resource, service or dependency. Direct SQL is fixture I/O.
class JalaliRuntimeProbe extends Component implements HasSchemas
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
            DateTimePicker::make('at')->native(false)->jalali()->timezone('Asia/Tehran')->format('Y-m-d H:i:s')->required(),
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

it('renders the candidate picker on locked Filament then saves actual selected states as Gregorian UTC and re-displays', function () {
    expect(Composer\InstalledVersions::getPrettyVersion('filament/forms'))->toBe('v5.10.3');
    $fixtures = json_decode(file_get_contents(storage_path('framework/testing/jalali-candidate-selections.json')), true, 512, JSON_THROW_ON_ERROR);
    foreach ($fixtures as $fixture) {
        $id = FinancialFixtures::product();
        $form = Livewire::test(JalaliRuntimeProbe::class, ['productId' => $id]);
        // A view override which is silently ignored by Filament is NOT compatible.
        $form->assertSee('jalaliDateTimePickerFormComponent', false);
        $form->set('data.at', $fixture['selected'])->call('saveFixture')->assertHasNoErrors();
        expect(DB::table('products')->where('id', $id)->value('sale_starts_at'))->toBe($fixture['utc']);
        $form->assertSet('data.at', $fixture['selected']);
        Livewire::test(JalaliRuntimeProbe::class, ['productId' => $id])->assertSet('data.at', $fixture['selected'])->assertSee('jalaliDateTimePickerFormComponent', false);
    }
});
