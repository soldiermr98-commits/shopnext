import { financialDate as toJalaliDate } from '../../lib/financialDate';
// Owner-only order/invoice projection. Order success is NOT payment success.
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Link, useParams } from 'react-router-dom';
import { financialApi, paymentNames, paymentStates, orderStates, utcDate, type ServerOrder } from '../../lib/financialApi';
import { formatToman, toPersianDigits } from '../../lib/persian';
import { FinancialSummary } from '../../components/shared/FinancialSummary';
export const OrderSuccessPage: React.FC = () => {
  const { user } = useAuthStore();
  const [owner, setOwner] = useState<string | null>(null);
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<ServerOrder | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { let current = true; setOrder(null); setError(''); if (id && user) financialApi.order(id).then(r => { if (current) { setOrder(r.order); setOwner(user.id); } }).catch(e => { if (current) setError(e.message); }); return () => { current = false; }; }, [id, user?.id]);
  async function action(file?: File) {
    if (!id || busy) return;
    setBusy(true); setError('');
    try { const result = file ? await financialApi.receipt(id, file) : await financialApi.cancel(id); if (useAuthStore.getState().user?.id === user?.id) setOrder(result.order); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  if (!user) return <div className="py-20 text-center"><button onClick={() => useAuthStore.getState().openLoginModal()}>برای مشاهده سفارش وارد شوید.</button></div>;
  if (!order || owner !== user.id) return <div className="py-20 text-center"><p role={error ? 'alert' : 'status'}>{error || 'دریافت سفارش…'}</p><Link to="/account#orders">سفارش‌های من</Link></div>;
  const a = order.shipping_address;
  return <div className="space-y-8 pb-16 max-w-4xl mx-auto">
    <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-outline-variant/60 text-center space-y-4 shadow-sm no-print">
      <h1 className="text-2xl font-black">سفارش {order.order_number}</h1>
      <p>{orderStates[order.status] ?? order.status} — {paymentStates[order.payment_state] ?? order.payment_state}</p>
      <p>مبلغ واقعاً پرداخت‌شده: {formatToman(order.total_paid)}</p><p>{paymentNames[order.payment_method]}</p>
      <Link to={`/track-order?code=${order.tracking_code}`} className="underline">پیگیری سفارش</Link> — <Link to="/account#orders" className="underline">سفارش‌های من</Link>
      {['pending', 'awaiting_payment'].includes(order.status) && <button disabled={busy} onClick={() => { if (confirm('این سفارش لغو شود؟')) void action(); }} className="block mx-auto text-red-700 underline">لغو سفارش</button>}
      {order.payment_method === 'card_to_card' && ['unpaid', 'pending_verification'].includes(order.payment_state) && ['pending', 'awaiting_payment', 'processing'].includes(order.status) && <label className="block text-xs">ارسال رسید تصویر (ثبت رسید به معنی تایید پرداخت نیست)<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f) void action(f); e.target.value = ''; }} /></label>}
      {order.receipt_url && <a href={order.receipt_url} target="_blank" rel="noreferrer" className="underline">مشاهده خصوصی رسید</a>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
    </div>
    <div className="bg-white text-gray-900 rounded-2xl p-5 sm:p-8 border space-y-6 text-xs">
      <div className="flex justify-between border-b pb-4"><h2 className="font-black text-lg">صورت‌حساب سفارش</h2><button onClick={() => window.print()} className="no-print underline">چاپ</button></div>
      <p>{toJalaliDate(utcDate(order.created_at))} — {a?.recipient_name} — {a?.recipient_phone}<br />{a?.province}، {a?.city}، {a?.street_address} — {a?.postal_code}</p>
      <div className="overflow-x-auto"><table className="w-full text-right"><thead><tr><th>کالا / شناسه تنوع</th><th>تعداد</th><th>قیمت واحد</th><th>تخفیف فروش / خودکار / کوپن</th><th>مالیات افزوده</th><th>تعدیل گرد کردن</th><th>جمع نهایی ردیف</th></tr></thead><tbody>{order.items.map(l => <tr key={l.key} className="border-b"><td className="p-2">{l.title} / {l.sku}</td><td>{toPersianDigits(l.quantity)}</td><td>{formatToman(l.unit_price)}</td><td>{formatToman(l.sale_discount)} / {formatToman(l.automatic_discount)} / {formatToman(l.coupon_discount)}</td><td>{formatToman(l.tax_added)}</td><td>{formatToman(l.rounding_adjustment)}</td><td>{formatToman(l.line_total)}</td></tr>)}</tbody></table></div>
      <FinancialSummary quote={order.invoice} />
    </div>
    <section className="bg-surface rounded-2xl p-5 border space-y-3 text-xs"><h2 className="font-black">رویدادهای ثبت‌شده سفارش</h2>{order.timeline.map((e, i) => <p key={i}>{toJalaliDate(utcDate(e.created_at))} — {e.actor_role} — {orderStates[e.to_status] ?? e.to_status} — {paymentStates[e.to_payment_state] ?? e.to_payment_state}</p>)}</section>
  </div>;
};
