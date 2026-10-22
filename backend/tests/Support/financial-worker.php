<?php

declare(strict_types=1);

use App\Financial\Checkout;
use App\Financial\OrderLifecycle;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (! $app->environment('testing') || ! str_contains((string) config('database.connections.mysql.database'), '_test')) {
    exit(70);
}
$input = json_decode(file_get_contents($argv[1]), true, 512, JSON_THROW_ON_ERROR);
$base = $argv[1];
$identity = ['pid' => getmypid(), 'connection_id' => DB::selectOne('SELECT CONNECTION_ID() AS id')->id, 'database_fingerprint' => hash('sha256', DB::selectOne('SELECT DATABASE() AS name')->name)];
file_put_contents($base.'.ready', json_encode($identity, JSON_THROW_ON_ERROR));
$deadline = microtime(true) + 60;
while (! is_file(dirname($base).'/release')) {
    if (microtime(true) > $deadline) {
        exit(71);
    }
    usleep(1000);
}
$started = microtime(true);
file_put_contents($base.'.started', (string) $started);
try {
    $actor = User::findOrFail($input['actor']);
    $order = $input['kind'] === 'checkout'
        ? app(Checkout::class)->create($actor, $input['version'], $input['address'], 'post', $input['payment'], $input['coupon'] ?? null, $input['key'])
        : app(OrderLifecycle::class)->act($actor, $input['order'], $input['action']);
    $result = ['status' => 'success', 'order_id' => $order->id];
} catch (ValidationException|HttpException $e) {
    $result = ['status' => 'rejected', 'exception' => $e::class];
} catch (Throwable $e) {
    // Never write raw SQL, env, exception messages or arguments to a public CI artifact.
    $result = ['status' => 'unexpected', 'exception' => $e::class, 'sql_state' => $e instanceof QueryException ? ($e->errorInfo[0] ?? null) : null, 'driver_code' => $e instanceof QueryException ? ($e->errorInfo[1] ?? null) : null];
}
file_put_contents($base.'.result', json_encode([...$identity, ...$result, 'started' => $started, 'finished' => microtime(true)], JSON_THROW_ON_ERROR));
exit($result['status'] === 'unexpected' ? 72 : 0);
