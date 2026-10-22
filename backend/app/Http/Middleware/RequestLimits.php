<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class RequestLimits
{
    public function handle(Request $request, Closure $next): Response
    {
        // Independent of a shared host's possibly unlimited post_max_size.
        abort_if((int) $request->server('CONTENT_LENGTH', 0) > 3 * 1024 * 1024 || strlen($request->getContent()) > 3 * 1024 * 1024, 413, 'Request body too large.');

        return $next($request);
    }
}
