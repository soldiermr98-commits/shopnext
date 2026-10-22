<x-filament-widgets::widget>
    <x-filament::section>
        @php($status = $this->status())
        <p>Cron last ran {{ $status['minutes'] === null ? 'never' : $status['minutes'].' minutes ago' }}.</p>
        @if ($status['stale'] || ! $status['workerHealthy'])
            <p role="alert">Warning: cron or database queue heartbeat is stale or unhealthy.</p>
        @else
            <p>Database queue heartbeat is healthy.</p>
        @endif
    </x-filament::section>
</x-filament-widgets::widget>
