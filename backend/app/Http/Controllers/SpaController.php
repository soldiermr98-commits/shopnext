<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ReadRequest;
use Illuminate\Http\Response;

final class SpaController
{
    public function __invoke(ReadRequest $request): Response
    {
        $file = resource_path('spa.html');
        abort_unless(is_file($file), 503, 'Storefront build not installed.');

        return response(file_get_contents($file), 200, ['Content-Type' => 'text/html; charset=UTF-8']);
    }
}
