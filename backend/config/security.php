<?php

declare(strict_types=1);

return [
    'image_driver' => env('IMAGE_DRIVER', 'auto'),
    'trusted_hosts' => array_filter(array_map('trim', explode(',', env('TRUSTED_HOSTS', '')))),
    'trusted_proxies' => array_filter(array_map('trim', explode(',', env('TRUSTED_PROXIES', '')))),
    'admin_phone' => env('ADMIN_PHONE'),
    'admin_email' => env('ADMIN_EMAIL'),
    'admin_name' => env('ADMIN_NAME', 'Administrator'),
    'admin_initial_password' => env('ADMIN_INITIAL_PASSWORD'),
];
