<?php

declare(strict_types=1);

use App\Support\OneTimeMigrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Process;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->runnerDirectory = storage_path('framework/testing/runner-'.bin2hex(random_bytes(8)));
    File::makeDirectory($this->runnerDirectory, 0700, true);
    $this->runnerEntry = $this->runnerDirectory.'/entry.php';
    $this->runnerConfig = $this->runnerDirectory.'/migration-runner.json';
    $this->runnerToken = bin2hex(random_bytes(32));
    file_put_contents($this->runnerEntry, '<?php // fixture');
    file_put_contents($this->runnerConfig, json_encode(['hash' => hash('sha256', $this->runnerToken), 'expires' => time() + 3600]));
});

afterEach(function () {
    File::deleteDirectory($this->runnerDirectory);
});

it('rejects missing or incorrect token plaintext transport wrong methods and expired activation without executing', function () {
    $calls = 0;
    $migrate = function () use (&$calls): int {
        $calls++;

        return 0;
    };
    $runner = new OneTimeMigrator;
    foreach ([['GET', 'on', $this->runnerToken], ['POST', 'off', $this->runnerToken], ['POST', 'on', null], ['POST', 'on', str_repeat('0', 64)]] as [$method, $https, $token]) {
        expect($runner->run(['REQUEST_METHOD' => $method, 'HTTPS' => $https], $token, $this->runnerConfig, $this->runnerEntry, $migrate))->toBe(403);
    }
    file_put_contents($this->runnerConfig, json_encode(['hash' => hash('sha256', $this->runnerToken), 'expires' => time() - 1]));
    expect($runner->run(['REQUEST_METHOD' => 'POST', 'HTTPS' => 'on'], $this->runnerToken, $this->runnerConfig, $this->runnerEntry, $migrate))->toBe(410);
    expect($calls)->toBe(0);
    expect(is_file($this->runnerEntry))->toBeTrue();
});

it('executes only once and deletes itself before invoking the real migration command', function () {
    $runner = new OneTimeMigrator;
    $calls = 0;
    $migrate = function () use (&$calls): int {
        $calls++;
        expect(is_file($this->runnerEntry))->toBeFalse();

        return Artisan::call('migrate', ['--force' => true, '--no-interaction' => true]);
    };
    expect($runner->run(['REQUEST_METHOD' => 'POST', 'HTTPS' => 'on'], $this->runnerToken, $this->runnerConfig, $this->runnerEntry, $migrate))->toBe(200);
    expect($runner->run(['REQUEST_METHOD' => 'POST', 'HTTPS' => 'on'], $this->runnerToken, $this->runnerConfig, $this->runnerEntry, $migrate))->toBe(410);
    expect($calls)->toBe(1);
    expect(is_file($this->runnerConfig))->toBeFalse();
});

it('consumes activation on failure and does not disclose exception or token', function () {
    $runner = new OneTimeMigrator;
    $status = $runner->run(['REQUEST_METHOD' => 'POST', 'HTTPS' => 'on'], $this->runnerToken, $this->runnerConfig, $this->runnerEntry, function (): int {
        throw new RuntimeException('private '.$this->runnerToken);
    });
    expect($status)->toBe(500);
    expect(is_file($this->runnerEntry))->toBeFalse();
    expect(is_file($this->runnerConfig))->toBeFalse();
    expect(file_get_contents($this->runnerDirectory.'/runner-used-'.hash('sha256', $this->runnerToken)))->not->toContain($this->runnerToken);
});

it('refuses replay when another process has already claimed a still-present configuration', function () {
    file_put_contents($this->runnerDirectory.'/runner-used-'.hash('sha256', $this->runnerToken), 'claimed');
    $calls = 0;
    $status = (new OneTimeMigrator)->run(['REQUEST_METHOD' => 'POST', 'HTTPS' => 'on'], $this->runnerToken, $this->runnerConfig, $this->runnerEntry, function () use (&$calls): int {
        $calls++;

        return 0;
    });
    expect($status)->toBe(410);
    expect($calls)->toBe(0);
});

it('activates offline with hash-only private config and refuses public token placement or activation overwrite', function () {
    $app = $this->runnerDirectory.'/app';
    $public = $this->runnerDirectory.'/public';
    File::makeDirectory($app.'/storage/app/private', 0700, true);
    File::makeDirectory($app.'/operations', 0700, true);
    File::makeDirectory($public, 0700, true);
    copy(base_path('operations/migrate-once.php.stub'), $app.'/operations/migrate-once.php.stub');
    $tool = base_path('../tools/activate-runner.php');
    $bad = new Process([PHP_BINARY, $tool, $app, $public, $public.'/leaked-token']);
    $bad->run();
    expect($bad->getExitCode())->toBe(1);
    $tokenFile = $this->runnerDirectory.'/local-token';
    $activate = new Process([PHP_BINARY, $tool, $app, $public, $tokenFile]);
    $activate->mustRun();
    $token = file_get_contents($tokenFile);
    expect($token)->toMatch('/^[a-f0-9]{64}$/');
    expect($activate->getOutput())->not->toContain($token);
    $config = file_get_contents($app.'/storage/app/private/migration-runner.json');
    expect($config)->not->toContain($token);
    expect(json_decode($config, true)['hash'])->toBe(hash('sha256', $token));
    $again = new Process([PHP_BINARY, $tool, $app, $public, $this->runnerDirectory.'/other-token']);
    $again->run();
    expect($again->getExitCode())->toBe(1);
    expect(file_get_contents($app.'/storage/app/private/migration-runner.json'))->toBe($config);
});
