<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\SettingsRequest;
use App\Services\Settings;
use Illuminate\Http\JsonResponse;

final class SettingsController
{
    public function index(SettingsRequest $request, Settings $settings): JsonResponse
    {
        return response()->json(['settings' => $settings->statuses()]);
    }

    public function update(SettingsRequest $request, Settings $settings): JsonResponse
    {
        $settings->write($request->validated('key'), $request->validated('newValue'));

        return response()->json(['settings' => $settings->statuses()]);
    }
}
