<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Support\Permissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class OrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        $u = $this->user();

        return $u && $u->is_active && ! $u->must_change_password && ($u->role === 'customer' || Permissions::allows($u, 'orders'));
    }

    public function rules(): array
    {
        $integer = function ($a, $v, $f): void {
            if (! is_int($v)) {
                $f('مقدار باید عدد صحیح باشد.');
            }
        };

        return match ($this->route()->getName()) {
            'orders.checkout', 'orders.quote' => [
                'version' => ['required', 'integer', $integer, 'between:0,4294967294'],
                'address_id' => ['required', 'integer', $integer, 'min:1', 'max:9007199254740991'],
                'shipping_method' => ['required', 'regex:/^[a-z0-9_-]{1,64}$/D'],
                'payment_method' => ['required', Rule::in(['wallet', 'cod', 'card_to_card'])],
                'coupon' => ['nullable', 'string', 'max:100'], 'idempotency_key' => ['required', 'regex:/^[A-Za-z0-9_-]{16,64}$/D'],
            ],
            'orders.index' => ['page' => ['sometimes', 'integer', 'between:1,10000'], 'per_page' => ['sometimes', 'integer', 'between:1,50']],
            'orders.receipt.store' => ['file' => MediaRequest::FILE_RULES],
            'orders.action' => ['action' => ['required', Rule::in(['paid', 'processing', 'shipped', 'delivered', 'cancel', 'refund', 'reject_receipt', 'fail'])], 'reason' => ['nullable', 'string', 'min:1', 'max:200']],
            'orders.cancel' => ['reason' => ['nullable', 'string', 'min:1', 'max:200']],
            default => [],
        };
    }

    public function messages(): array
    {
        return ['required' => 'تکمیل :attribute الزامی است.', 'integer' => 'عدد صحیح وارد کنید.', 'between' => 'مقدار خارج از محدوده مجاز است.', 'in' => 'گزینه انتخاب‌شده معتبر نیست.', 'regex' => 'قالب مقدار معتبر نیست.', 'max' => 'مقدار از سقف مجاز بیشتر است.', 'min' => 'مقدار کمتر از حد مجاز است.'];
    }
}
