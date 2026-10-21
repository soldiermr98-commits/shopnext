<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\MediaRequest;
use App\Http\Requests\ReadRequest;
use App\Services\SafeUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

final class MediaController
{
    public function store(MediaRequest $request, SafeUpload $uploads): JsonResponse
    {
        $name = $uploads->store($request->file('file'));

        return response()->json(['url' => '/media/'.$name], 201);
    }

    public function show(ReadRequest $request, string $file): BinaryFileResponse
    {
        abort_unless(preg_match('/^[a-f0-9]{48}\.png$/D', $file) && Storage::disk('local')->exists('media/'.$file), 404);

        return response()->file(Storage::disk('local')->path('media/'.$file), ['Content-Type' => 'image/png', 'X-Content-Type-Options' => 'nosniff']);
    }
}
