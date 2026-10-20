// ===== UTILITY FUNCTIONS =====
// Persian localization, numeral conversion, Toman formatting and Jalali calendar algorithms

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const ENGLISH_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * Converts English digits (0-9) to Persian numerals (۰-۹)
 */
export function toPersianDigits(input: number | string | undefined | null): string {
  if (input === undefined || input === null) return '';
  const str = input.toString();
  return str.replace(/[0-9]/g, (w) => PERSIAN_DIGITS[+w]);
}

/**
 * Converts Persian/Arabic numerals to standard ASCII English digits
 */
export function persianToEnglishDigits(input: string): string {
  if (!input) return '';
  return input
    .replace(/[۰-۹]/g, (d) => ENGLISH_DIGITS[PERSIAN_DIGITS.indexOf(d)])
    .replace(/[٠-٩]/g, (d) => (d.charCodeAt(0) - 1632).toString());
}

/**
 * Formats a monetary integer as Toman with thousand separators and optional "تومان" suffix
 * e.g. 2400000 => "۲,۴۰۰,۰۰۰ تومان"
 */
export function formatToman(amount: number | string | undefined | null, showSuffix = true): string {
  if (amount === undefined || amount === null) return showSuffix ? '۰ تومان' : '۰';
  const numericVal = typeof amount === 'string' ? parseInt(persianToEnglishDigits(amount), 10) || 0 : amount;
  const formattedWithCommas = Math.round(numericVal).toLocaleString('en-US');
  const persianNum = toPersianDigits(formattedWithCommas);
  return showSuffix ? `${persianNum} تومان` : persianNum;
}

/**
 * Robust Gregorian to Jalali (Solar Hijri) Date Conversion Algorithm
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy: number;
  if (gy > 1600) {
    jy = 979;
    gy -= 1600;
  } else {
    jy = 0;
    gy -= 621;
  }
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

const JALALI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

const WEEKDAY_NAMES = [
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
  'شنبه',
];

/**
 * Returns formatted Jalali date string e.g. "۲۵ اردیبهشت ۱۴۰۳"
 */
export function toJalaliDate(dateInput: string | Date | number): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const [jy, jm, jd] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return `${toPersianDigits(jd)} ${JALALI_MONTH_NAMES[jm - 1]} ${toPersianDigits(jy)}`;
  } catch {
    return '';
  }
}

/**
 * Returns full Jalali date and time e.g. "سه‌شنبه ۲۵ اردیبهشت ۱۴۰۳ - ساعت ۱۴:۳۵"
 */
export function formatJalaliDateTime(dateInput: string | Date | number): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const [jy, jm, jd] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const weekday = WEEKDAY_NAMES[d.getDay()];
    const hours = toPersianDigits(d.getHours().toString().padStart(2, '0'));
    const minutes = toPersianDigits(d.getMinutes().toString().padStart(2, '0'));
    return `${weekday} ${toPersianDigits(jd)} ${JALALI_MONTH_NAMES[jm - 1]} ${toPersianDigits(jy)} - ساعت ${hours}:${minutes}`;
  } catch {
    return '';
  }
}
