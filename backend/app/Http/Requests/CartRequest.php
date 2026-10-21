<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Financial\Money;
use Illuminate\Foundation\Http\FormRequest;

final class CartRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        if ($this->isMethod('GET') || $this->route()->getName() === 'cart.merge') {
            return [];
        }
        $strict = function (string $attribute, mixed $value, \Closure $fail): void {
            if (! is_int($value)) {
                $fail('شناسه و تعداد باید عدد صحیح باشند.');
            }
        };
        $rules = [
            'items' => ['present', 'array', 'list', 'max:100'],
            'items.*' => ['required', 'array'],
            'items.*.product_id' => ['required', 'integer', $strict, 'min:1', 'max:'.Money::MAX],
            'items.*.variant_id' => ['sometimes', 'nullable', 'integer', $strict, 'min:1', 'max:'.Money::MAX],
            'items.*.quantity' => ['required', 'integer', $strict, 'min:1', 'max:1000000'],
        ];
        if ($this->route()->getName() === 'cart.replace') {
            $rules['version'] = ['required', 'integer', $strict, 'min:0', 'max:4294967294'];
        } else {
            $rules += ['coupon' => ['sometimes', 'nullable', 'string', 'max:100'], 'shipping_method' => ['sometimes', 'nullable', 'regex:/^[a-z0-9_-]{1,64}$/D'], 'zone' => ['sometimes', 'nullable', 'regex:/^[A-Za-z0-9_-]{1,64}$/D']];
        }

        return $rules;
    }
}
