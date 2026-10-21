<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Middleware\HandleCors;

final class StrictCors extends HandleCors
{
    public function handle($request, Closure $next)
    {
        $response = parent::handle($request, $next);
        // Fruitcake optimizes single-origin lists by always sending that origin.
        // Keep the explicit whitelist invariant even for disallowed preflights.
        if ($request->headers->has('Origin') && ! in_array($request->headers->get('Origin'), config('cors.allowed_origins', []), true)) {
            foreach (['Access-Control-Allow-Origin', 'Access-Control-Allow-Credentials', 'Access-Control-Allow-Headers', 'Access-Control-Allow-Methods'] as $header) {
                $response->headers->remove($header);
            }
        }

        return $response;
    }
}
