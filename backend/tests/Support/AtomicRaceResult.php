<?php

declare(strict_types=1);

namespace Tests\Support;

final class AtomicRaceResult
{
    public static function publish(string $path, array $result): void
    {
        // Same-directory rename makes the completion marker visible only after
        // the entire JSON document is written and the file handle is closed.
        $json = json_encode($result, JSON_THROW_ON_ERROR);
        $pending = $path.'.pending';
        try {
            if (file_put_contents($pending, $json) !== strlen($json) || ! rename($pending, $path)) {
                throw new \RuntimeException('Unable to publish complete race result.');
            }
        } finally {
            if (is_file($pending)) {
                unlink($pending);
            }
        }
    }
}
