<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\DeployHealth;
use Illuminate\Console\Command;

final class DeployCheck extends Command
{
    protected $signature = 'deploy-check';

    protected $description = 'Fail-closed shared-host readiness diagnostics; never print credentials';

    public function handle(DeployHealth $health): int
    {
        $ok = true;
        foreach ($health->checks() as $name => [$passed, $detail]) {
            if (str_starts_with($name, 'image.warning.')) {
                $this->warn($name.': '.$detail);

                continue;
            }
            $this->line($name.': '.($passed ? 'PASS' : 'FAIL').' — '.$detail);
            $ok = $ok && $passed;
        }

        return $ok ? self::SUCCESS : self::FAILURE;
    }
}
