<?php

declare(strict_types=1);
use App\Http\Requests\MediaRequest;

return [
    'temporary_file_upload' => [
        'rules' => MediaRequest::FILE_RULES,
        'middleware' => 'throttle:10,1',
        'max_upload_time' => 5,
    ],
];
