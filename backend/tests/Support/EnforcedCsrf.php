<?php

declare(strict_types=1);

namespace Tests\Support;

use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;

final class EnforcedCsrf extends ValidateCsrfToken
{
    protected function runningUnitTests(): bool
    {
        return false;
    }
}
