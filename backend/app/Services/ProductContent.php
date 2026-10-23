<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/** Editorial data only; metadata/stock/financial fields cannot enter this contract. */
final class ProductContent
{
    private const KINDS = ['related', 'upsell', 'cross_sell'];

    public function read(User $actor, int $id): array
    {
        Gate::forUser($actor->fresh())->authorize('viewAny', Product::class);
        $record = Product::findOrFail($id);
        Gate::forUser($actor->fresh())->authorize('view', $record);
        $relations = DB::table('product_relations')->where('source_id', $id)->orderBy('kind')->orderBy('order_index')->get();

        return ['product' => $record, 'relations' => collect(self::KINDS)->mapWithKeys(fn (string $kind): array => [$kind => $relations->where('kind', $kind)->pluck('target_id')->all()])->all()];
    }

    public function save(User $actor, int $id, array $input): Product
    {
        return DB::transaction(function () use ($actor, $id, $input): Product {
            $actor = app(CatalogAccess::class)->lock($actor, Product::class);
            $record = Product::query()->lockForUpdate()->findOrFail($id);
            Gate::forUser($actor)->authorize('update', $record);
            if ($input === [] || array_diff(array_keys($input), ['gallery', 'main_image', 'specifications', 'faqs', 'relations', 'full_description', 'short_description']) !== []) {
                $this->fail('content', 'فیلد محتوای معتبر انتخاب کنید؛ قیمت و موجودی از این فرم تغییر نمی‌کنند.');
            }
            $data = Validator::make($input, [
                'gallery' => ['sometimes', 'array', 'max:20'],
                'gallery.*' => ['array:path,alt'],
                'gallery.*.path' => ['required', 'string', 'distinct', 'regex:#^/media/[a-f0-9]{48}\.png$#D'],
                'gallery.*.alt' => ['present', 'nullable', 'string', 'max:255'],
                'main_image' => ['sometimes', 'nullable', 'string', 'max:255', 'regex:#^/(?:media/[a-f0-9]{48}\.png|images/catalog-placeholder\.svg)$#D'],
                'specifications' => ['sometimes', 'array', 'max:100'],
                'specifications.*' => ['array:group,key,value'],
                'specifications.*.group' => ['nullable', 'string', 'max:100'],
                'specifications.*.key' => ['required', 'string', 'max:100'],
                'specifications.*.value' => ['required', 'string', 'max:1000'],
                'faqs' => ['sometimes', 'array', 'max:20'],
                'faqs.*' => ['array:question,answer'],
                'faqs.*.question' => ['required', 'string', 'max:255'],
                'faqs.*.answer' => ['required', 'string', 'max:8000'],
                'relations' => ['sometimes', 'array:related,upsell,cross_sell'],
                'relations.*' => ['array', 'max:30'],
                'full_description' => ['sometimes', 'nullable', 'string', 'max:50000'],
                'short_description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            ], [
                'required' => 'این فیلد الزامی است.', 'present' => 'متن جایگزین را مشخص کنید.',
                'array' => 'ساختار محتوا معتبر نیست.', 'string' => 'مقدار متنی معتبر وارد کنید.',
                'max' => 'مقدار واردشده بیش از حد مجاز است.', 'distinct' => 'تصویر تکراری مجاز نیست.',
                'regex' => 'تصویر امن و بارگذاری‌شده انتخاب کنید.',
            ])->validate();
            $before = $record->getAttributes();
            $changes = [];
            if (array_key_exists('gallery', $data) || array_key_exists('main_image', $data)) {
                $paths = json_decode($record->gallery_images ?? '[]', true) ?? [];
                $alts = json_decode($record->gallery_alt_texts ?? '{}', true) ?? [];
                $paths = is_array($paths) ? $paths : [];
                $alts = is_array($alts) ? $alts : [];
                if (array_key_exists('gallery', $data)) {
                    $paths = [];
                    $alts = [];
                    foreach ($data['gallery'] as $row) {
                        if (! Storage::disk('local')->exists('media/'.basename($row['path']))) {
                            $this->fail('gallery', 'تصویر بارگذاری‌شده در دسترس نیست.');
                        }
                        $paths[] = $row['path'];
                        $alts[$row['path']] = trim(strip_tags($row['alt'] ?? ''));
                    }
                }
                $main = $data['main_image'] ?? (in_array($record->main_image, $paths, true) ? $record->main_image : ($paths[0] ?? '/images/catalog-placeholder.svg'));
                if (($paths !== [] && ! in_array($main, $paths, true)) || ($paths === [] && $main !== '/images/catalog-placeholder.svg')) {
                    $this->fail('main_image', 'تصویر اصلی باید یکی از تصاویر گالری باشد.');
                }
                if ($main !== '/images/catalog-placeholder.svg' && ! Storage::disk('local')->exists('media/'.basename($main))) {
                    $this->fail('main_image', 'تصویر اصلی بارگذاری‌شده در دسترس نیست.');
                }
                $changes = ['gallery_images' => json_encode(array_values($paths), JSON_THROW_ON_ERROR), 'gallery_alt_texts' => json_encode((object) $alts, JSON_THROW_ON_ERROR), 'main_image' => $main];
            }
            foreach (['full_description', 'short_description'] as $field) {
                if (array_key_exists($field, $data)) {
                    $changes[$field] = $field === 'short_description' && $data[$field] !== null ? strip_tags($data[$field]) : $data[$field];
                }
            }
            if (array_key_exists('specifications', $data)) {
                $specs = [];
                foreach ($data['specifications'] as $row) {
                    $specs[] = ['group' => trim(strip_tags($row['group'] ?? '')), 'key' => $this->text($row['key'], 'specifications'), 'value' => $this->text($row['value'], 'specifications')];
                }
                $changes['specifications'] = json_encode($specs, JSON_THROW_ON_ERROR);
            }
            if (array_key_exists('faqs', $data)) {
                $faqs = [];
                foreach ($data['faqs'] as $row) {
                    $answer = app(RichText::class)->clean($row['answer']);
                    $this->text($answer, 'faqs');
                    $faqs[] = ['question' => $this->text($row['question'], 'faqs'), 'answer' => $answer];
                }
                $changes['faqs'] = json_encode($faqs, JSON_THROW_ON_ERROR);
            }
            if (array_key_exists('relations', $data)) {
                $before['relations'] = DB::table('product_relations')->where('source_id', $id)->orderBy('kind')->orderBy('order_index')->get()->map(fn ($row): array => (array) $row)->all();
                $rows = [];
                foreach (self::KINDS as $kind) {
                    $ids = array_map(fn ($value): int => CatalogInput::integer($value, 'relations', 1), $data['relations'][$kind] ?? []);
                    if (in_array($id, $ids, true) || count(array_unique($ids)) !== count($ids) || Product::whereIn('id', $ids)->count() !== count($ids)) {
                        $this->fail('relations', 'محصول‌های مرتبط باید معتبر، غیرتکراری و متفاوت با محصول جاری باشند.');
                    }
                    foreach (array_values($ids) as $index => $target) {
                        $rows[] = ['source_id' => $id, 'target_id' => $target, 'kind' => $kind, 'order_index' => $index];
                    }
                }
                DB::table('product_relations')->where('source_id', $id)->delete();
                if ($rows !== []) {
                    DB::table('product_relations')->insert($rows);
                }
            }
            if (isset($changes['full_description']) && strlen($changes['full_description']) > 100000) {
                $this->fail('full_description', 'حجم متن توضیحات بیش از حد مجاز است.');
            }
            $record->forceFill($changes)->saveQuietly();
            $after = $record->getAttributes();
            if (array_key_exists('relations', $data)) {
                $after['relations'] = DB::table('product_relations')->where('source_id', $id)->orderBy('kind')->orderBy('order_index')->get()->map(fn ($row): array => (array) $row)->all();
            }
            app(CatalogAudit::class)->write($actor, $record, 'content.update', $before, $after);

            return $record;
        });
    }

    /** Re-sanitize on public reads, including manually imported content. */
    public function publicFaqs(?string $json): array
    {
        $rows = json_decode($json ?? '[]', true);
        $faqs = [];
        foreach (array_slice(is_array($rows) ? $rows : [], 0, 20) as $row) {
            if (is_array($row) && is_string($row['question'] ?? null) && is_string($row['answer'] ?? null)) {
                $faqs[] = ['question' => strip_tags(mb_substr($row['question'], 0, 255)), 'answer' => app(RichText::class)->clean(mb_substr($row['answer'], 0, 8000))];
            }
        }

        return $faqs;
    }

    private function text(string $value, string $field): string
    {
        $value = trim(strip_tags($value));
        if ($value === '') {
            $this->fail($field, 'متن خالی یا صرفاً برچسب HTML مجاز نیست.');
        }

        return $value;
    }

    private function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
