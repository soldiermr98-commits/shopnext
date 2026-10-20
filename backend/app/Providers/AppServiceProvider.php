<?php

declare(strict_types=1);

namespace App\Providers;

use App\Support\Phone;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('customer-login', function (Request $request): array {
            $identifier = $request->input('identifier', $request->input('phone', ''));
            $identifier = is_string($identifier) ? Phone::normalize(mb_strtolower($identifier)) : 'invalid';

            return [
                Limit::perMinute(20)->by('auth-ip:'.$request->ip()),
                Limit::perMinute(5)->by('auth-id:'.hash('sha256', $identifier)),
            ];
        });
        RateLimiter::for('customer-otp', function (Request $request): array {
            $phone = $request->input('phone', '');

            return [
                Limit::perMinute(10)->by('otp-ip:'.$request->ip()),
                Limit::perMinute(3)->by('otp-id:'.hash('sha256', is_string($phone) ? Phone::normalize($phone) : 'invalid')),
            ];
        });
    }
}
