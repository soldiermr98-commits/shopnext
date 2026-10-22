<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class CookieOnly
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_if($request->headers->has('Authorization'), 401, 'Cookie authentication required.');

        return $next($request);
    }
}
