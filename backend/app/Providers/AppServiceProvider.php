<?php

declare(strict_types=1);

namespace App\Providers;

use App\Filament\Auth\StaffLoginResponse;
use App\Models\ActivityLog;
use App\Models\Address;
use App\Models\Banner;
use App\Models\BlogPost;
use App\Models\Brand;
use App\Models\Category;
use App\Models\CategoryProduct;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ReturnItem;
use App\Models\ReturnRequest;
use App\Models\SchedulerHeartbeat;
use App\Models\Setting;
use App\Models\Transaction;
use App\Models\User;
use App\Observers\AdminActivity;
use App\Policies\ActivityLogPolicy;
use App\Policies\AddressPolicy;
use App\Policies\FoundationPolicy;
use App\Policies\OrderPolicy;
use App\Policies\ProductPolicy;
use App\Policies\ProductVariantPolicy;
use App\Policies\SettingPolicy;
use App\Policies\UserPolicy;
use App\Support\Permissions;
use App\Support\Phone;
use Filament\Auth\Http\Responses\Contracts\LoginResponse;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(LoginResponse::class, StaffLoginResponse::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        foreach ([User::class, Address::class, Category::class, Brand::class, Product::class, ProductVariant::class, Order::class, OrderItem::class, Coupon::class, BlogPost::class, Banner::class, Setting::class, Transaction::class, ReturnRequest::class, ReturnItem::class, CategoryProduct::class] as $model) {
            $model::observe(AdminActivity::class);
        }
        Gate::define('dashboard', fn (User $user): bool => Permissions::allows($user, 'dashboard'));
        Gate::policy(User::class, UserPolicy::class);
        Gate::policy(Address::class, AddressPolicy::class);
        Gate::policy(Category::class, FoundationPolicy::class);
        Gate::policy(Brand::class, FoundationPolicy::class);
        Gate::policy(Product::class, ProductPolicy::class);
        Gate::policy(ProductVariant::class, ProductVariantPolicy::class);
        Gate::policy(Order::class, OrderPolicy::class);
        Gate::policy(OrderItem::class, FoundationPolicy::class);
        Gate::policy(Coupon::class, FoundationPolicy::class);
        Gate::policy(BlogPost::class, FoundationPolicy::class);
        Gate::policy(Banner::class, FoundationPolicy::class);
        Gate::policy(ActivityLog::class, ActivityLogPolicy::class);
        Gate::policy(Setting::class, SettingPolicy::class);
        Gate::policy(Transaction::class, FoundationPolicy::class);
        Gate::policy(ReturnRequest::class, FoundationPolicy::class);
        Gate::policy(ReturnItem::class, FoundationPolicy::class);
        Gate::policy(SchedulerHeartbeat::class, FoundationPolicy::class);
        Gate::policy(CategoryProduct::class, FoundationPolicy::class);
        Sanctum::getAccessTokenFromRequestUsing(static fn (Request $request): ?string => null);
        RateLimiter::for('financial-cart', fn (Request $request): array => [
            Limit::perMinute(60)->by('cart-ip:'.$request->ip()),
            Limit::perMinute(120)->by('cart-user:'.($request->user()?->id ?? $request->ip())),
        ]);
        RateLimiter::for('customer-login', function (Request $request): array {
            $identifier = $request->input('identifier', $request->input('phone', ''));
            $identifier = is_string($identifier) ? Phone::normalize(mb_strtolower($identifier)) : 'invalid';

            return [
                Limit::perMinute(20)->by('auth-ip:'.$request->ip()),
                Limit::perMinute(5)->by('auth-id:'.hash('sha256', $identifier)),
            ];
        });
        RateLimiter::for('customer-password', fn (Request $request): array => [
            Limit::perMinute(10)->by('password-ip:'.$request->ip()),
            Limit::perMinute(5)->by('password-user:'.($request->user()?->getAuthIdentifier() ?? 'guest')),
        ]);
        RateLimiter::for('customer-otp', function (Request $request): array {
            $phone = $request->input('phone', '');

            return [
                Limit::perMinute(10)->by('otp-ip:'.$request->ip()),
                Limit::perMinute(3)->by('otp-id:'.hash('sha256', is_string($phone) ? Phone::normalize($phone) : 'invalid')),
            ];
        });
    }
}
