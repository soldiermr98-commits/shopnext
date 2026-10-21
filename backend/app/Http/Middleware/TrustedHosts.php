<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class TrustedHosts
{
    public function handle(Request $request, Closure $next): Response
    {
        $hosts = array_filter([parse_url(config('app.url'), PHP_URL_HOST), ...config('security.trusted_hosts', [])]);
        Request::setTrustedHosts(array_map(fn (string $host): string => '^'.preg_quote($host, '/').'$', $hosts));
        $request->getHost(); // Enforce even on endpoints that do not generate URLs.

        return $next($request);
    }
}
