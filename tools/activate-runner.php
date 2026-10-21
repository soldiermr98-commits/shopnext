<?php

declare(strict_types=1);

// Run locally, after extracting the package. Token contents never go to stdout.
if (PHP_SAPI !== 'cli' || $argc !== 4) {
    fwrite(STDERR, "Usage: php activate-runner.php APP_DIR PUBLIC_DIR PRIVATE_TOKEN_FILE\n");
    exit(1);
}
[$script, $app, $public, $tokenFile] = $argv;
$app = realpath($app);
$public = realpath($public);
$tokenParent = realpath(dirname($tokenFile));
if (! $app || ! $public || ! $tokenParent || basename($app) !== 'app' || dirname($app) !== dirname($public)
    || ! is_dir($app.'/storage/app/private') || file_exists($tokenFile)
    || str_starts_with($tokenParent.'/', $app.'/') || str_starts_with($tokenParent.'/', $public.'/')) {
    fwrite(STDERR, "Require sibling private app/public directories and a LOCAL token file outside both.\n");
    exit(1);
}
$token = bin2hex(random_bytes(32));
$entry = 'migrate-'.bin2hex(random_bytes(16)).'.php';
$config = $app.'/storage/app/private/migration-runner.json';
$configHandle = @fopen($config, 'x');
if (! $configHandle) {
    fwrite(STDERR, "An activation already exists; do not overwrite it.\n");
    exit(1);
}
chmod($config, 0600);
fwrite($configHandle, json_encode(['hash' => hash('sha256', $token), 'expires' => time() + 3600], JSON_THROW_ON_ERROR));
fclose($configHandle);
$tokenHandle = @fopen($tokenFile, 'x');
if (! $tokenHandle) {
    unlink($config);
    fwrite(STDERR, "Cannot create local token file.\n");
    exit(1);
}
chmod($tokenFile, 0600);
fwrite($tokenHandle, $token);
fclose($tokenHandle);
if (! copy($app.'/operations/migrate-once.php.stub', $public.'/'.$entry)) {
    unlink($config);
    unlink($tokenFile);
    fwrite(STDERR, "Cannot activate runner.\n");
    exit(1);
}
echo "Activated file: $entry. Expires in one hour. Keep the token file LOCAL; never upload it.\n";
