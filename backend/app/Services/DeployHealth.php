<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Encryption\Encrypter;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

final class DeployHealth
{
    public const EXTENSIONS = ['intl', 'mbstring', 'pdo_mysql', 'openssl', 'ctype', 'json', 'tokenizer', 'xml', 'fileinfo', 'zip', 'curl', 'bcmath'];

    public function checks(): array
    {
        $checks = ['php' => [version_compare(PHP_VERSION, '8.2.0', '>='), PHP_VERSION]];
        $checks['php.integer64'] = [PHP_INT_SIZE >= 8, '64-bit integers required for canonical Toman'];
        foreach (self::EXTENSIONS as $extension) {
            $checks['extension.'.$extension] = [extension_loaded($extension), 'required'];
        }
        $driver = config('security.image_driver', 'auto');
        $checks['extension.image'] = [$driver === 'auto' ? (extension_loaded('gd') || extension_loaded('imagick')) : (in_array($driver, ['gd', 'imagick'], true) && extension_loaded($driver)), 'gd or imagick'];
        foreach (['storage' => storage_path(), 'bootstrap.cache' => base_path('bootstrap/cache'), 'private.media' => storage_path('app/private')] as $name => $path) {
            $probe = $path.'/.deploy-check-'.bin2hex(random_bytes(8));
            $ok = is_dir($path) && is_writable($path) && @file_put_contents($probe, 'probe') === 5;
            if (is_file($probe)) {
                unlink($probe);
            }
            $checks[$name] = [$ok, 'write probe'];
        }
        $key = (string) config('app.key');
        $key = str_starts_with($key, 'base64:') ? base64_decode(substr($key, 7), true) : $key;
        $checks['env.file'] = [is_file(base_path('.env')), 'private .env required'];
        $checks['env.key'] = [is_string($key) && Encrypter::supported($key, config('app.cipher')), 'supported encryption key'];
        $production = config('app.env') === 'production';
        $checks['env.debug'] = [! $production || config('app.debug') === false, 'production debug disabled'];
        $url = parse_url(config('app.url'));
        $checks['env.origin'] = [isset($url['host']) && ! isset($url['user']) && ! isset($url['pass']) && (! $production || ($url['scheme'] ?? '') === 'https') && in_array($url['path'] ?? '', ['', '/'], true), 'one canonical HTTPS origin'];
        $checks['queue.driver'] = [config('queue.default') === 'database', 'database required'];
        try {
            $connection = DB::connection();
            $connection->getPdo();
            $version = $connection->selectOne('select version() as version')->version;
            $maria = str_contains(strtolower($version), 'mariadb');
            $number = preg_replace('/^5\.5\.5-/', '', $version);
            $checks['database'] = [$connection->getDriverName() === 'mysql' && version_compare($number, $maria ? '10.6.0' : '8.0.0', '>='), ($maria ? 'MariaDB ' : 'MySQL ').$version];
            $heartbeat = app(Heartbeat::class)->status();
            $checks['cron'] = [! $heartbeat['stale'], 'completed within 3 minutes'];
            $checks['queue.worker'] = [$heartbeat['workerHealthy'], 'probe processed within 3 minutes'];
            $failed = DB::table('failed_jobs')->count();
            $overdue = DB::table('jobs')->where('queue', 'default')->where('available_at', '<', now()->timestamp - 300)->whereNull('reserved_at')->count();
            $reserved = DB::table('jobs')->where('reserved_at', '<', now()->timestamp - 120)->count();
            $checks['queue.health'] = [$failed === 0 && $overdue === 0 && $reserved === 0, "failed={$failed}; overdue={$overdue}; stuck={$reserved}"];
        } catch (\Throwable) {
            foreach (['database', 'cron', 'queue.worker', 'queue.health'] as $name) {
                $checks[$name] = [false, 'database diagnostics unavailable'];
            }
        }
        $linked = is_link(public_path('storage')) && realpath(public_path('storage')) === realpath(storage_path('app/public'));
        $checks['storage.delivery'] = [$linked || (Route::has('media.show') && is_writable(storage_path('app/private'))), $linked ? 'storage symlink' : 'validated /media fallback (no symlink required)'];

        $image = app(ImageHostHealth::class)->report();
        foreach ($image['values'] as $name => $value) {
            $checks['image.ini.'.$name] = [true, $value];
        }
        $checks['image.webp.gd'] = [true, $image['gd_webp'] ? 'supported' : 'unsupported'];
        $checks['image.webp.imagick'] = [true, $image['imagick_webp'] ? 'supported' : 'unsupported'];
        // Recommendations are warnings, not readiness failures for safe small uploads.
        foreach ($image['warnings'] as $index => $warning) {
            $checks['image.warning.'.$index] = [true, 'WARN — '.$warning];
        }

        return $checks;
    }
}
