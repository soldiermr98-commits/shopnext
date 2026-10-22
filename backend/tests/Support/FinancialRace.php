<?php

declare(strict_types=1);

namespace Tests\Support;

use Illuminate\Support\Facades\DB;

final class FinancialRace
{
    public static function run(string $scenario, array $inputs): array
    {
        if (! function_exists('proc_open')) {
            throw new \RuntimeException('REAL PARALLEL TEST UNAVAILABLE: proc_open disabled; no simulation fallback.');
        }
        if (DB::transactionLevel() !== 0) {
            throw new \LogicException('Race fixtures must be COMMITTED, not hidden in RefreshDatabase.');
        }
        $dir = storage_path('framework/testing/race-'.bin2hex(random_bytes(12)));
        mkdir($dir, 0700, true);
        $processes = [];
        $config = config('database.connections.mysql');
        $env = array_replace(getenv(), ['APP_ENV' => 'testing', 'APP_KEY' => config('app.key'), 'DB_CONNECTION' => 'mysql', 'DB_HOST' => $config['host'], 'DB_PORT' => (string) $config['port'], 'DB_DATABASE' => $config['database'], 'DB_USERNAME' => $config['username'], 'DB_PASSWORD' => $config['password'] ?? '']);
        try {
            // A real DB start gate holds all buyers until EVERY separate process has
            // started its production operation. No mock/simulated business locking.
            DB::beginTransaction();
            DB::table('users')->whereIn('id', array_column($inputs, 'gate_owner'))->orderBy('id')->lockForUpdate()->get();
            foreach ($inputs as $i => $input) {
                $path = $dir.'/'.$i;
                file_put_contents($path, json_encode($input, JSON_THROW_ON_ERROR));
                $pipes = [];
                $p = proc_open([PHP_BINARY, base_path('tests/Support/financial-worker.php'), $path], [0 => ['file', '/dev/null', 'r'], 1 => ['file', $path.'.out', 'w'], 2 => ['file', $path.'.err', 'w']], $pipes, base_path(), $env);
                if (! is_resource($p)) {
                    throw new \RuntimeException('Unable to spawn real PHP worker.');
                }
                $processes[] = $p;
            }
            self::waitFor($dir, count($inputs), '.ready');
            touch($dir.'/release');
            self::waitFor($dir, count($inputs), '.started');
            $released = microtime(true);
            DB::commit();
            self::waitFor($dir, count($inputs), '.result');
            $results = [];
            foreach ($processes as $i => $p) {
                $exitCode = proc_close($p);
                unset($processes[$i]);
                $result = json_decode(file_get_contents($dir.'/'.$i.'.result'), true, 512, JSON_THROW_ON_ERROR);
                if ($exitCode !== 0 || $result['status'] === 'unexpected') {
                    throw new \RuntimeException('Real worker unexpected failure: '.($result['exception'] ?? 'exit').' SQLSTATE='.($result['sql_state'] ?? 'n/a').' driver='.($result['driver_code'] ?? 'n/a'));
                }
                $results[] = $result;
            }
            $fingerprint = hash('sha256', DB::selectOne('SELECT DATABASE() AS name')->name);
            if (count(array_unique(array_column($results, 'pid'))) !== count($inputs) || count(array_unique(array_column($results, 'connection_id'))) !== count($inputs) || array_unique(array_column($results, 'database_fingerprint')) !== [$fingerprint] || max(array_column($results, 'started')) >= min(array_column($results, 'finished'))) {
                throw new \RuntimeException('Separate process/connection/same database/overlapping operation proof failed.');
            }
            $evidencePath = storage_path('framework/testing/financial-concurrency-evidence.json');
            $evidence = is_file($evidencePath) ? json_decode(file_get_contents($evidencePath), true, 512, JSON_THROW_ON_ERROR) : [];
            $evidence[$scenario] = ['gate_released' => $released, 'server' => DB::selectOne('SELECT VERSION() AS v')->v, 'workers' => $results];
            file_put_contents($evidencePath, json_encode($evidence, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
            echo 'REAL_FINANCIAL_RACE '.$scenario.' workers='.count($results).' separate-PIDs/connections overlapping; '.json_encode(array_count_values(array_column($results, 'status')), JSON_THROW_ON_ERROR).PHP_EOL;

            return $results;
        } finally {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            foreach ($processes as $p) {
                if (is_resource($p)) {
                    proc_terminate($p);
                    proc_close($p);
                }
            }
            foreach (glob($dir.'/*') as $file) {
                unlink($file);
            }
            rmdir($dir);
        }
    }

    private static function waitFor(string $dir, int $count, string $suffix): void
    {
        $deadline = microtime(true) + 45;
        do {
            clearstatcache();
            if (count(glob($dir.'/*'.$suffix)) === $count) {
                return;
            }
            usleep(1000);
        } while (microtime(true) < $deadline);
        throw new \RuntimeException('REAL PARALLEL TEST timed out at '.$suffix.'; no sequential fallback.');
    }
}
