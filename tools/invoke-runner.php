<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli' || $argc !== 3 || ! str_starts_with($argv[1], 'https://')) {
    fwrite(STDERR, "Usage: php invoke-runner.php HTTPS_RUNNER_URL PRIVATE_TOKEN_FILE\n");
    exit(1);
}
$token = trim(file_get_contents($argv[2]));
$curl = curl_init($argv[1]);
curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_HTTPHEADER => ['X-Migration-Token: '.$token], CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => false, CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 120]);
$response = curl_exec($curl);
$status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
curl_close($curl);
echo $status === 200 ? "Migration completed; verify the runner URL is now 404 and run acceptance checks.\n" : "Runner failed or unavailable. Do not retry the same token; inspect private deployment state.\n";
exit($status === 200 ? 0 : 1);
