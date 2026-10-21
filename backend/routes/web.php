<?php

declare(strict_types=1);

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SpaController;
use App\Http\Middleware\CookieOnly;
use Illuminate\Support\Facades\Route;

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

// No bearer fallback; even guest mutations retain the web CSRF/session stack.
Route::middleware([CookieOnly::class, 'throttle:financial-cart'])->group(function (): void {
    Route::get('api/cart', [CartController::class, 'index'])->name('cart.index');
    Route::put('api/cart', [CartController::class, 'replace'])->name('cart.replace');
    Route::post('api/quote', [CartController::class, 'quote'])->name('cart.quote');
    Route::post('api/cart/merge', [CartController::class, 'merge'])->middleware('auth:sanctum')->name('cart.merge');
});

Route::middleware([CookieOnly::class, 'auth:sanctum', 'throttle:financial-orders'])->group(function (): void {
    Route::get('api/checkout/options', [OrderController::class, 'options'])->name('orders.options');
    Route::post('api/checkout/quote', [OrderController::class, 'quote'])->name('orders.quote');
    Route::post('api/checkout', [OrderController::class, 'checkout'])->name('orders.checkout');
    Route::get('api/orders', [OrderController::class, 'index'])->name('orders.index');
    Route::get('api/orders/track/{code}', [OrderController::class, 'track'])->where('code', '[a-f0-9]{48}')->name('orders.track');
    Route::get('api/orders/{order}', [OrderController::class, 'show'])->whereNumber('order')->name('orders.show');
    Route::post('api/orders/{order}/cancel', [OrderController::class, 'cancel'])->whereNumber('order')->name('orders.cancel');
    Route::post('api/orders/{order}/actions', [OrderController::class, 'action'])->whereNumber('order')->name('orders.action');
    Route::post('api/orders/{order}/receipt', [OrderController::class, 'receipt'])->whereNumber('order')->name('orders.receipt.store');
    Route::get('api/orders/{order}/receipt', [OrderController::class, 'receiptFile'])->whereNumber('order')->name('orders.receipt.show');
});

Route::prefix('api/admin')->middleware([CookieOnly::class, 'auth:sanctum', 'throttle:30,1'])->group(function (): void {
    Route::get('settings', [SettingsController::class, 'index']);
    Route::put('settings', [SettingsController::class, 'update']);
});

Route::post('api/admin/media', [MediaController::class, 'store'])->middleware([CookieOnly::class, 'auth:sanctum', 'throttle:10,1']);
Route::get('media/{file}', [MediaController::class, 'show'])->where('file', '[a-f0-9]{48}\.png')->name('media.show');
Route::get('/{path?}', SpaController::class)->where('path', '(?!(?:api|admin|sanctum|livewire|media|assets|fonts|storage|css|js|images|up)(?:/|$))[^.]*');
