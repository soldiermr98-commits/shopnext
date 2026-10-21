<?php

declare(strict_types=1);

$origins = explode(',', env('CORS_ORIGINS', rtrim(env('APP_URL', 'http://localhost'), '/')));

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'OPTIONS'],
    'allowed_origins' => array_values(array_filter(array_map('trim', $origins), static fn (string $origin): bool => (bool) preg_match('~^https?://[a-z0-9.-]+(?::[0-9]+)?$~i', $origin))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Accept', 'Content-Type', 'X-XSRF-TOKEN', 'X-Requested-With'],
    'exposed_headers' => [], 'max_age' => 600, 'supports_credentials' => true,
];
