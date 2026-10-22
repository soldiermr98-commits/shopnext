import { utcDate } from './financialApi';
export const FINANCIAL_TIME_ZONE = 'Asia/Tehran';
/** Financial timestamps are explicit UTC/offset instants, never date-only/local input. */
export function financialDate(value: string, timeZone = FINANCIAL_TIME_ZONE): string {
  const normalized = utcDate(value);
  const m = /^(\d{4})-(\d\d)-(\d\d)T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.exec(normalized);
  if (!m || m[0] !== normalized) return 'تاریخ نامعتبر';
  const day = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
  if (day.getUTCFullYear() !== Number(m[1]) || day.getUTCMonth() + 1 !== Number(m[2]) || day.getUTCDate() !== Number(m[3])) return 'تاریخ نامعتبر';
  const instant = new Date(normalized);
  if (!Number.isFinite(instant.getTime())) return 'تاریخ نامعتبر';
  try { return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone, year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(instant); }
  catch { return 'تاریخ نامعتبر'; }
}
