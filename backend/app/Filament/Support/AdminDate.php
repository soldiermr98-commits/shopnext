<?php

declare(strict_types=1);

namespace App\Filament\Support;

use App\Support\Persian;
use Ariaieboy\Jalali\Jalali;
use Carbon\Carbon;
use Filament\Forms\Components\DateTimePicker;
use Filament\Infolists\Components\TextEntry;
use Filament\Tables\Columns\TextColumn;

final class AdminDate
{
    public const TIMEZONE = 'Asia/Tehran';

    public static function input(string $name, string $label): DateTimePicker
    {
        return DateTimePicker::make($name)->label($label)->native(false)->jalali()
            ->locale('fa')->timezone(self::TIMEZONE)->format('Y-m-d H:i:s')
            ->helperText('زمان تهران؛ ذخیره‌سازی به میلادی UTC انجام می‌شود.')
            ->validationMessages(['required' => 'لطفاً تاریخ را انتخاب کنید.', 'date' => 'تاریخ معتبر نیست.']);
    }

    public static function display(mixed $utc): string
    {
        if ($utc === null || $utc === '') {
            return '—';
        }

        return Persian::digits(Jalali::fromCarbon(Carbon::parse($utc, 'UTC')->setTimezone(self::TIMEZONE))->format('Y/m/d H:i:s'));
    }

    public static function column(string $name, string $label): TextColumn
    {
        return TextColumn::make($name)->label($label)->formatStateUsing(fn (mixed $state): string => self::display($state));
    }

    public static function entry(string $name, string $label): TextEntry
    {
        return TextEntry::make($name)->label($label)->formatStateUsing(fn (mixed $state): string => self::display($state));
    }
}
