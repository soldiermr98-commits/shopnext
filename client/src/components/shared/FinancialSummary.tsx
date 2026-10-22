import React from 'react';
import type { Quote } from '../../lib/financialApi';
import { formatToman } from '../../lib/persian';
import { useCartStore } from '../../store/cartStore';
export function FinancialSummary({ quote }: { quote: Quote | null }) {
  if (!quote) return <p role="status">صورت‌حساب معتبر هنوز دریافت نشده است.</p>;
  const t = quote.totals;
  return <dl className="space-y-3 text-xs">{[
    ['جمع قیمت ثبت‌شده کالاها', t.subtotal], ['تخفیف کالا و خودکار', t.items_discount], ['تخفیف کوپن', t.coupon_discount],
    ['مالیات افزوده', t.vat_amount], ['مالیات داخل قیمت', t.included_vat], ['تعدیل گرد کردن (با علامت)', t.rounding_adjustment],
    ['جمع نهایی کالاها', t.merchandise_total], ['هزینه ارسال', t.shipping_fee], ['مبلغ قابل پرداخت', t.payable_total],
  ].map(([label, amount]) => <div key={String(label)} className="flex justify-between gap-3"><dt>{label}</dt><dd className="font-mono font-bold">{amount == null ? 'پس از انتخاب نشانی و ارسال' : formatToman(amount as number)}</dd></div>)}</dl>;
}
export function CartStatus() {
  const { error, busy, mergeConflict, retryMerge } = useCartStore();
  return <div aria-live="polite" className="space-y-2 text-xs">{busy && <p>دریافت سبد از سرور…</p>}{error && <p role="alert" className="text-red-700">{error}</p>}{mergeConflict && <p role="alert">سبد مهمان ادغام نشد؛ هر دو سبد حفظ شده‌اند. سبد فعلی، سبد حساب است. <button type="button" disabled={busy} onClick={() => void retryMerge()} className="underline">تلاش مجدد برای ادغام</button></p>}</div>;
}
