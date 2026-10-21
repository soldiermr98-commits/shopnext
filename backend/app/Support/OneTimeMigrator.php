<?php

declare(strict_types=1);

namespace App\Support;

use Closure;

final class OneTimeMigrator
{
    public function run(array $server, #[\SensitiveParameter] mixed $token, string $configFile, string $entryFile, Closure $migrate): int
    {
        if (($server['REQUEST_METHOD'] ?? '') !== 'POST' || ! in_array($server['HTTPS'] ?? '', ['on', '1'], true)) {
            return 403;
        }
        $config = is_file($configFile) ? json_decode(file_get_contents($configFile), true) : null;
        if (! is_array($config) || ! is_int($config['expires'] ?? null) || $config['expires'] < time() || $config['expires'] > time() + 86400) {
            return 410;
        }
        if (! is_string($token) || ! preg_match('/^[a-f0-9]{64}$/D', $token) || ! is_string($config['hash'] ?? null) || ! hash_equals($config['hash'], hash('sha256', $token))) {
            return 403;
        }
        // Atomic creation: two concurrent authorized requests cannot both migrate.
        $claim = dirname($configFile).'/runner-used-'.hash('sha256', $token);
        $handle = @fopen($claim, 'x');
        if ($handle === false) {
            return 410;
        }
        chmod($claim, 0600);
        fwrite($handle, (string) time());
        fclose($handle);
        // Consume before any operation; even a failed migration must not be replayed.
        if (! @unlink($entryFile)) {
            return 500;
        }
        @unlink($configFile);
        try {
            return $migrate() === 0 ? 200 : 500;
        } catch (\Throwable) {
            return 500;
        }
    }
}
