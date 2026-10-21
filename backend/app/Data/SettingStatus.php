<?php

declare(strict_types=1);

namespace App\Data;

final readonly class SettingStatus implements \JsonSerializable
{
    public function __construct(public string $key, public bool $isSet) {}

    public function jsonSerialize(): array
    {
        return ['key' => $this->key, 'isSet' => $this->isSet, 'masked' => $this->isSet ? '••••••••' : null];
    }
}
