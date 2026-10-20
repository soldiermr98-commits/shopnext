<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Support\Phone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class AuthRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        foreach (['identifier', 'phone', 'email'] as $key) {
            if (is_string($this->input($key))) {
                $value = trim($this->input($key));
                $this->merge([$key => str_contains($value, '@') ? mb_strtolower($value) : Phone::normalize($value)]);
            }
        }
    }

    public function rules(): array
    {
        $password = ['required', 'string', 'min:14', 'max:72', function (string $attribute, mixed $value, \Closure $fail): void {
            if (is_string($value) && strlen($value) > 72) {
                $fail('Password exceeds the supported byte limit.');
            }
        }];

        return match ($this->route()->getName()) {
            'auth.login' => ['identifier' => ['required', 'string', 'max:254'], 'password' => ['required', 'string', 'max:72']],
            'auth.register' => ['name' => ['required', 'string', 'max:200'], 'phone' => ['required', 'regex:/^09[0-9]{9}$/', 'unique:users,phone'], 'email' => ['nullable', 'email', 'max:254', 'unique:users,email'], 'password' => $password],
            'auth.otp.send' => ['phone' => ['required', 'regex:/^09[0-9]{9}$/']],
            'auth.otp.verify' => ['phone' => ['required', 'regex:/^09[0-9]{9}$/'], 'code' => ['required', 'string', 'regex:/^[0-9]{5,8}$/']],
            'auth.password' => ['oldPassword' => ['required', 'string', 'max:72'], 'newPassword' => $password],
            default => [],
        };
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
