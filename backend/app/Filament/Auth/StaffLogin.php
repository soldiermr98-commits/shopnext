<?php

declare(strict_types=1);

namespace App\Filament\Auth;

use Filament\Auth\Pages\Login;
use Filament\Schemas\Components\Component;

final class StaffLogin extends Login
{
    protected function getRememberFormComponent(): Component
    {
        return parent::getRememberFormComponent()->hidden()->dehydrated(false);
    }
}
