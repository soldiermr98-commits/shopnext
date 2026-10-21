<?php

declare(strict_types=1);

use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\StrictCors;
use App\Http\Middleware\TrustedHosts;
use App\Http\Middleware\TrustedProxies;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->replace(HandleCors::class, StrictCors::class);
        $middleware->replace(TrustProxies::class, TrustedProxies::class);
        $middleware->prepend([TrustedHosts::class, SecurityHeaders::class]);
        $middleware->statefulApi();
        $middleware->trimStrings(except: ['oldPassword', 'newPassword', 'newValue']);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->respond(fn (Response $response) => SecurityHeaders::apply($response, request()));
        $exceptions->dontFlash(['newValue', 'oldPassword', 'newPassword', 'currentPassword', 'passwordConfirmation']);
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => $request->is('api/*') || $request->expectsJson());
    })->create();

// Upload layout: private app/ and public/ (or public_html/) are siblings.
// Public index explicitly supplies its directory; CLI uses the packaged marker.
$public = defined('SHOPNEXT_PUBLIC_PATH') ? SHOPNEXT_PUBLIC_PATH : (getenv('SHOPNEXT_PUBLIC_PATH') ?: (is_file(base_path('../public/.shopnext-public')) ? base_path('../public') : null));
if ($public) {
    $app->usePublicPath($public);
}

return $app;
