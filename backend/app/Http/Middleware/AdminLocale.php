<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Scope Persian to the panel and its persisted Livewire requests, not the API. */
final class AdminLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $previous = app()->getLocale();
        app()->setLocale('fa');
        try {
            return $next($request);
        } finally {
            app()->setLocale($previous);
        }
    }
}
