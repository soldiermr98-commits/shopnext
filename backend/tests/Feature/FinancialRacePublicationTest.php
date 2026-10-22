<?php

declare(strict_types=1);

use Tests\Support\AtomicRaceResult;

it('publishes complete race JSON and removes its non-completion staging file', function () {
    $path = sys_get_temp_dir().'/race-publication-'.bin2hex(random_bytes(12)).'.result';
    try {
        $result = ['status' => 'success', 'payload' => str_repeat('داده', 100000)];
        AtomicRaceResult::publish($path, $result);
        expect(json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR))->toBe($result);
        expect(is_file($path.'.pending'))->toBeFalse();
        AtomicRaceResult::publish($path, ['status' => 'rejected']);
        expect(json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR))->toBe(['status' => 'rejected']);
    } finally {
        @unlink($path);
        @unlink($path.'.pending');
    }
});

it('does not publish a completion marker for unencodable worker results', function () {
    $path = sys_get_temp_dir().'/race-publication-'.bin2hex(random_bytes(12)).'.result';
    expect(fn () => AtomicRaceResult::publish($path, ['invalid' => "\xB1\x31"]))->toThrow(JsonException::class);
    expect(is_file($path))->toBeFalse();
    expect(is_file($path.'.pending'))->toBeFalse();
});
