<?php

declare(strict_types=1);

use App\Http\Controllers\AuthController;
use App\Http\Controllers\SettingsController;
use App\Http\Middleware\CookieOnly;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Stateful routes always use the web CSRF/session stack, even without Origin headers.
Route::prefix('api/auth')->middleware(CookieOnly::class)->group(function (): void {
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:customer-login')->name('auth.login');
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:customer-login')->name('auth.register');
    Route::post('otp/send', [AuthController::class, 'otp'])->middleware('throttle:customer-otp')->name('auth.otp.send');
    Route::post('otp/verify', [AuthController::class, 'otp'])->middleware('throttle:customer-otp')->name('auth.otp.verify');
    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('me', [AuthController::class, 'me'])->name('auth.me');
        Route::post('logout', [AuthController::class, 'logout'])->name('auth.logout');
        Route::post('change-password', [AuthController::class, 'password'])->middleware('throttle:customer-password')->name('auth.password');
    });
});

Route::prefix('api/admin')->middleware([CookieOnly::class, 'auth:sanctum', 'throttle:30,1'])->group(function (): void {
    Route::get('settings', [SettingsController::class, 'index']);
    Route::put('settings', [SettingsController::class, 'update']);
});
