"""Inspect real no-dev ZIP and exercise extracted public/private layout on CI only.
Loopback HTTP simulates server HTTPS for runner authorization; real TLS is MANUAL.
"""
import base64
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
import zipfile

assert os.environ.get('DB_DATABASE') == 'shopnext_ci_test', 'Dedicated CI database only'
with tempfile.TemporaryDirectory() as temp:
    root = Path(temp)
    with zipfile.ZipFile(sys.argv[1]) as archive:
        assert archive.testzip() is None
        names = archive.namelist()
        assert 'app/vendor/autoload.php' in names
        assert 'app/resources/spa.html' in names
        assert 'public/index.php' in names and 'public/index.html' not in names
        assert not any(n == 'app/.env' or '/node_modules/' in n or '/tests/' in n or n.startswith('legacy/') for n in names)
        assert [n for n in names if n.startswith('public/') and n.endswith('.php')] == ['public/index.php']
        archive.extractall(root)
    installed = json.loads((root / 'app/vendor/composer/installed.json').read_text())
    assert installed['dev'] is False
    assert not any(p['name'].startswith(('pestphp/', 'phpunit/', 'fakerphp/')) for p in installed['packages'])
    (root / 'app/.env').write_text((root / 'app/.env.example').read_text())
    # Test-only migration proves the real runner applies pending migrations.
    (root / 'app/database/migrations/2099_01_01_000000_package_probe.php').write_text('''<?php
    use Illuminate\\Database\\Migrations\\Migration;
    use Illuminate\\Support\\Facades\\Schema;
    use Illuminate\\Database\\Schema\\Blueprint;
    return new class extends Migration {
        public function up(): void { Schema::create('deploy_runner_probes', fn(Blueprint $t) => $t->id()); }
        public function down(): void { Schema::dropIfExists('deploy_runner_probes'); }
    };''')
    with socket.socket() as reserve:
        reserve.bind(('127.0.0.1', 0))
        port = reserve.getsockname()[1]
    env = dict(os.environ, APP_ENV='production', APP_DEBUG='false', APP_KEY='base64:' + base64.b64encode(os.urandom(32)).decode(), APP_URL=f'http://localhost:{port}', ADMIN_INITIAL_PASSWORD='')
    router = root / 'router.php'
    router.write_text('''<?php
    $_SERVER['HTTPS'] = 'on'; // CI simulation ONLY, never included in upload zip.
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $file = __DIR__.'/public'.$path;
    if (is_file($file) && $path !== '/index.php') {
        if (str_ends_with($file, '.php')) { require $file; return true; }
        return false;
    }
    require __DIR__.'/public/index.php';
    ''')
    server = subprocess.Popen(['php', '-S', f'127.0.0.1:{port}', '-t', str(root / 'public'), str(router)], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
    try:
        assert 'Development Server' in server.stderr.readline()
        origin = f'http://localhost:{port}'
        def request(path, method='GET', token=None):
            headers = {'Accept': 'application/json'}
            if token is not None:
                headers['X-Migration-Token'] = token
            try:
                with urllib.request.urlopen(urllib.request.Request(origin + path, method=method, headers=headers), timeout=30) as response:
                    return response.status, response.read(), response.headers
            except urllib.error.HTTPError as error:
                return error.code, error.read(), error.headers
        status, html, headers = request('/')
        assert status == 200, f'SPA status {status}'
        assert b'<div id="root">' in html and "script-src 'self';" in headers['Content-Security-Policy']
        for asset in re.findall(r'(?:src|href)="(/(?:assets|fonts)/[^"]+)"', html.decode()):
            assert request(asset)[0] == 200, f'Missing local asset {asset}'
        assert request('/account')[0] == 200
        assert request('/api/auth/me')[0] == 401
        assert request('/api/unknown')[0] == 404
        assert request('/assets/missing.js')[0] == 404
        assert request('/admin/login')[0] == 200
        token_file = root / 'LOCAL-ONLY-token'
        activation = subprocess.run(['php', str(root / 'activate-runner.php'), str(root / 'app'), str(root / 'public'), str(token_file)], check=True, capture_output=True, text=True)
        entry = re.search(r'migrate-[a-f0-9]{32}\.php', activation.stdout).group()
        assert request('/' + entry, 'POST')[0] == 403
        assert request('/' + entry, 'POST', token_file.read_text())[0] == 200
        assert not (root / 'public' / entry).exists()
        assert request('/' + entry, 'POST', token_file.read_text())[0] == 404
        probe = "require 'vendor/autoload.php'; $app=require 'bootstrap/app.php'; $app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap(); exit(Illuminate\\Support\\Facades\\Schema::hasTable('deploy_runner_probes') ? 0 : 1);"
        subprocess.run(['php', '-r', probe], cwd=root / 'app', env=env, check=True, capture_output=True)
        print('PASS: no-dev zip, local SPA assets, private/public HTTP layout, API separation, Filament, authenticated pending migration, self-delete and replay denial. TLS simulated; actual host remains UNVERIFIED.')
    finally:
        # Bounded safe diagnostics: exception class names, never messages/arguments.
        for log in (root / 'app/storage/logs').glob('*.log'):
            classes = re.findall(r'\[object\] \(([A-Za-z\\]+)\(', log.read_text(errors='replace'))
            if classes:
                print('Private runtime exception classes:', ', '.join(sorted(set(classes))))
        server.terminate()
        try:
            server.communicate(timeout=10)
        except subprocess.TimeoutExpired:
            server.kill()
            server.communicate()
