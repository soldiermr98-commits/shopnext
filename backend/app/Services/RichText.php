<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Validation\ValidationException;
use Symfony\Component\HtmlSanitizer\HtmlSanitizer;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig;

final class RichText
{
    public function clean(?string $html): ?string
    {
        if ($html === null) {
            return null;
        }
        if (strlen($html) > 100000) {
            throw ValidationException::withMessages(['content' => 'Content is too large.']);
        }
        $config = (new HtmlSanitizerConfig)->allowSafeElements()->allowLinkSchemes(['https', 'http', 'mailto'])->allowRelativeLinks()->allowMediaHosts([])->allowRelativeMedias(false)->dropElement('svg')->dropElement('math')->dropElement('iframe')->forceAttribute('a', 'rel', 'noopener noreferrer')->withMaxInputLength(100000);

        return (new HtmlSanitizer($config))->sanitize($html);
    }
}
