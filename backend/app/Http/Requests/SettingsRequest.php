<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Services\Settings;
use App\Support\Permissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

final class SettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && Permissions::allows($this->user(), 'settings');
    }

    public function rules(): array
    {
        return $this->isMethod('GET') ? [] : ['key' => ['required', Rule::in(Settings::KEYS)], 'newValue' => ['nullable', 'string', 'max:4096']];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if (array_diff(array_keys($this->all()), [...array_keys($this->rules()), '_token']) !== []) {
                $validator->errors()->add('request', 'Unknown input fields.');
            }
        }];
    }
}
