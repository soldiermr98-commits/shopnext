<?php

declare(strict_types=1);

namespace App\Policies;

final class ActivityLogPolicy extends FoundationPolicy
{
    protected string $resource = 'logs';
}
