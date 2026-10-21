<?php

declare(strict_types=1);

use App\Models\BlogPost;
use App\Models\User;
use App\Services\RichText;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

it('adds strict self-hosted storefront headers including on errors and isolates Filament CSP allowances', function () {
    $response = $this->withServerVariables(['HTTPS' => 'on'])->get('/api/does-not-exist');
    $response->assertNotFound()->assertHeader('X-Content-Type-Options', 'nosniff')->assertHeader('X-Frame-Options', 'DENY')->assertHeader('Strict-Transport-Security', 'max-age=31536000');
    $policy = $response->headers->get('Content-Security-Policy');
    expect($policy)->toContain("script-src 'self';", "frame-ancestors 'none'", "object-src 'none'")->not->toContain('https:', 'unsafe-eval');
    $this->get('/admin/login')->assertOk()->assertHeader('Cache-Control', 'no-store, private');
    expect($this->get('/admin/login')->headers->get('Content-Security-Policy'))->toContain("'unsafe-eval'")->not->toContain('https:');
});

it('allows only configured CORS origins with explicit credentials and rejects wildcard origins', function () {
    config(['cors.allowed_origins' => ['https://shop.example']]);
    $this->withHeaders(['Origin' => 'https://shop.example', 'Access-Control-Request-Method' => 'POST', 'Access-Control-Request-Headers' => 'X-XSRF-TOKEN,Content-Type'])
        ->options('/api/auth/login')->assertNoContent()->assertHeader('Access-Control-Allow-Origin', 'https://shop.example')->assertHeader('Access-Control-Allow-Credentials', 'true');
    $this->withHeader('Origin', 'https://evil.example')->options('/api/auth/login')->assertHeaderMissing('Access-Control-Allow-Origin');
    expect(config('cors.allowed_origins'))->not->toContain('*');
});

it('rejects unknown hosts and ignores forwarded hosts and schemes from untrusted proxies', function () {
    $this->withServerVariables(['HTTP_HOST' => 'evil.example'])->get('/up')->assertStatus(400);
    $response = $this->withServerVariables(['HTTP_HOST' => 'localhost', 'REMOTE_ADDR' => '192.0.2.123', 'HTTPS' => 'off'])->withHeaders(['X-Forwarded-Host' => 'evil.example', 'X-Forwarded-Proto' => 'https'])->get('/up');
    $response->assertOk()->assertHeaderMissing('Strict-Transport-Security');
    config(['security.trusted_proxies' => ['192.0.2.123']]);
    $this->get('/up')->assertOk()->assertHeader('Strict-Transport-Security', 'max-age=31536000');
});

it('rejects SVG executable mislabeled oversized and overdimensioned uploads', function () {
    Storage::fake('local');
    $this->postJson('/api/admin/media')->assertUnauthorized();
    $this->actingAs(User::factory()->create())->postJson('/api/admin/media')->assertForbidden();
    $this->actingAs(User::factory()->create(['role' => 'admin']));
    $files = [
        UploadedFile::fake()->createWithContent('payload.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
        UploadedFile::fake()->createWithContent('shell.php', '<?php phpinfo();'),
        UploadedFile::fake()->createWithContent('fake.png', '<?php phpinfo();'),
        UploadedFile::fake()->image('image.png')->size(2049),
        UploadedFile::fake()->image('wide.png', 2049, 1),
    ];
    foreach ($files as $file) {
        $this->postJson('/api/admin/media', ['file' => $file])->assertUnprocessable();
    }
    expect(Storage::disk('local')->allFiles())->toBeEmpty();
});

it('reencodes raster uploads with random names into non-executable private storage and serves a safe fallback', function () {
    Storage::fake('local');
    $this->actingAs(User::factory()->create(['role' => 'admin']));
    $file = UploadedFile::fake()->image('untrusted.php.png', 2, 2);
    file_put_contents($file->getRealPath(), '<?php echo "injected-payload";', FILE_APPEND);
    $first = $this->postJson('/api/admin/media', ['file' => $file])->assertCreated()->json('url');
    $second = $this->postJson('/api/admin/media', ['file' => UploadedFile::fake()->image('untrusted.php.png', 2, 2)])->assertCreated()->json('url');
    expect($first)->toMatch('~^/media/[a-f0-9]{48}\.png$~')->not->toBe($second);
    $bytes = Storage::disk('local')->get(ltrim($first, '/'));
    expect($bytes)->not->toContain('injected-payload', '<?php');
    expect(getimagesizefromstring($bytes)['mime'])->toBe('image/png');
    $this->get($first)->assertOk()->assertHeader('Content-Type', 'image/png')->assertHeader('X-Content-Type-Options', 'nosniff');
    $this->get('/media/shell.php')->assertNotFound();
});

it('sanitizes rich text on model writes and reads including legacy raw HTML without adding business endpoints', function () {
    $html = '<p>Safe <strong>text</strong></p><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">bad</a><svg onload=alert(1)></svg><iframe src="https://evil.example"></iframe>';
    $clean = app(RichText::class)->clean($html);
    expect($clean)->toContain('<strong>text</strong>')->not->toContain('<script', 'onerror', 'onload', 'javascript:', '<svg', '<iframe');
    $model = (new BlogPost)->forceFill(['content' => $html]);
    expect($model->getAttributes()['content'])->toBe($clean);
    $model->setRawAttributes(['content' => $html]);
    expect($model->content)->toBe($clean);
});

it('serves a private built SPA document on the same origin without swallowing API admin or asset errors', function () {
    $path = resource_path('spa.html');
    $old = is_file($path) ? file_get_contents($path) : null;
    try {
        file_put_contents($path, '<!doctype html><div id="root">acceptance-shell</div>');
        $this->get('/')->assertOk()->assertSee('acceptance-shell');
        $this->get('/account')->assertOk()->assertSee('acceptance-shell');
        foreach (['/api/unknown', '/assets/missing.js', '/admin/unknown', '/.env'] as $url) {
            $this->get($url)->assertNotFound()->assertDontSee('acceptance-shell');
        }
    } finally {
        $old === null ? unlink($path) : file_put_contents($path, $old);
    }
    expect(config('session.secure'))->toBeTrue();
    expect(config('session.http_only'))->toBeTrue();
    expect(config('session.same_site'))->toBe('strict');
    expect(config('session.domain'))->toBeNull();
});
