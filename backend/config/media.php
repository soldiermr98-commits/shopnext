<?php

declare(strict_types=1);

return [
    // Absolute processing ceilings; existing form/receipt limits may be stricter.
    'max_file_bytes' => (int) env('MEDIA_MAX_FILE_BYTES', 8 * 1024 * 1024),
    'max_pixels' => (int) env('MEDIA_MAX_PIXELS', 24000000),
    'processing_memory_bytes' => (int) env('MEDIA_PROCESSING_MEMORY_BYTES', 256 * 1024 * 1024),
    'memory_reserve_bytes' => 32 * 1024 * 1024,
    'variants' => ['thumb' => 320, 'webp' => 1600],
];
