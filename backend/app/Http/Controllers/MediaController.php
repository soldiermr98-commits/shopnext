<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\MediaRequest;
use App\Http\Requests\ReadRequest;
use App\Models\ActivityLog;
use App\Services\SafeUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

final class MediaController
{
    public function store(MediaRequest $request, SafeUpload $uploads): JsonResponse
    {
        $name = $uploads->store($request->file('file'));

        try {
            (new ActivityLog)->forceFill([
                'user_id' => $request->user()->id, 'user_name' => $request->user()->name, 'user_role' => $request->user()->role,
                'action' => 'create', 'module' => 'media', 'subject_id' => $name, 'ip_address' => $request->ip(),
                'before' => [], 'after' => ['format' => 'png'], 'changed_fields' => ['file'],
            ])->save();
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete('media/'.$name);
            throw $exception;
        }

        return response()->json(['url' => '/media/'.$name], 201);
    }

    public function show(ReadRequest $request, string $file): BinaryFileResponse
    {
        abort_unless(preg_match('/^[a-f0-9]{48}\.png$/D', $file) && Storage::disk('local')->exists('media/'.$file), 404);

        return response()->file(Storage::disk('local')->path('media/'.$file), ['Content-Type' => 'image/png', 'X-Content-Type-Options' => 'nosniff']);
    }
}
