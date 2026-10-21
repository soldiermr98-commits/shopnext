<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;

final class TrustedProxies extends TrustProxies
{
    public function handle(Request $request, Closure $next)
    {
        $this->proxies = config('security.trusted_proxies', []);
        // Never trust forwarded Host. Never trust all proxy IPs by default.
        $this->headers = Request::HEADER_X_FORWARDED_FOR | Request::HEADER_X_FORWARDED_PROTO | Request::HEADER_X_FORWARDED_PORT;

        return parent::handle($request, $next);
    }
}
