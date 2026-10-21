<?php

declare(strict_types=1);

// Run locally, after extracting the package. Token contents never go to stdout.
if (PHP_SAPI !== 'cli' || $argc !== 4) {
    fwrite(STDERR, "Usage: php activate-runner.php APP_DIR PUBLIC_DIR PRIVATE_TOKEN_FILE\n");
    exit(1);
}
[$script, $app, $public, $tokenFile] = $argv;
if (! is_dir($app.'/storage/app/private') || ! is_dir($public) || file_exists($tokenFile)) {
    fwrite(STDERR, "Invalid layout or existing token file.\n");
    exit(1);
}
$token = bin2hex(random_bytes(32));
$entry = 'migrate-'.bin2hex(random_bytes(16)).'.php';
$config = $app.'/storage/app/private/migration-runner.json';
file_put_contents($config, json_encode(['hash' => hash('sha256', $token), 'expires' => time() + 3600], JSON_THROW_ON_ERROR));
chmod($config, 0600);
file_put_contents($tokenFile, $token);
chmod($tokenFile, 0600);
copy($app.'/operations/migrate-once.php.stub', $public.'/'.$entry);
echo "Activated file: $entry. Expires in one hour. Keep the token file LOCAL; never upload it.\n";
