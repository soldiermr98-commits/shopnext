<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Services\MediaConversions;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

final class ConvertMedia implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public int $timeout = 45;

    public function __construct(public int $assetId, public string $sha256) {}

    public function handle(MediaConversions $conversions): void
    {
        $conversions->run($this->assetId, $this->sha256);
    }
}
