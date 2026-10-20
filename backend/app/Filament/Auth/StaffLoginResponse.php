<?php

declare(strict_types=1);

namespace App\Filament\Auth;

use App\Filament\Pages\StaffDashboard;
use Filament\Auth\Http\Responses\Contracts\LoginResponse;
use Filament\Facades\Filament;
use Illuminate\Http\RedirectResponse;

final class StaffLoginResponse implements LoginResponse
{
    public function toResponse($request): RedirectResponse
    {
        return redirect()->to(Filament::auth()->user()->must_change_password ? StaffProfile::getUrl() : StaffDashboard::getUrl());
    }
}
