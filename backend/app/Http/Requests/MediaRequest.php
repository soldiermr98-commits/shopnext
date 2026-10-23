<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Support\Permissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

final class MediaRequest extends FormRequest
{
    public const FILE_RULES = ['required', 'file', 'image', 'max:2048', 'mimes:jpg,jpeg,png,webp', 'extensions:jpg,jpeg,png,webp', 'dimensions:max_width=2048,max_height=2048'];

    public function authorize(): bool
    {
        return $this->user() !== null && Permissions::allows($this->user(), 'products');
    }

    public function rules(): array
    {
        return ['file' => self::FILE_RULES];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'تصویر انتخاب کنید.', 'file.file' => 'فایل معتبر انتخاب کنید.',
            'file.image' => 'تصویر سالم انتخاب کنید.', 'file.max' => 'حجم تصویر بیش از ۲ مگابایت است.',
            'file.mimes' => 'تصویر PNG، JPEG یا WebP انتخاب کنید.', 'file.extensions' => 'پسوند تصویر معتبر نیست.',
            'file.dimensions' => 'ابعاد تصویر بیش از ۲۰۴۸ پیکسل است.',
        ];
    }

    public function after(): array
    {
        return [function (Validator $v): void {
            if (array_diff(array_keys($this->all()), ['file', '_token']) !== []) {
                $v->errors()->add('request', 'Unknown input fields.');
            }
        }];
    }
}
