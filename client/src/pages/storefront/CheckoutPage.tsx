// Existing checkout layout; only owned saved addresses and configured server methods.
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { financialApi, paymentNames, type CheckoutInput, type Quote, type SavedAddress } from '../../lib/financialApi';
import { CheckoutStepper } from '../../components/shared/CheckoutStepper';
import { FinancialSummary, CartStatus } from '../../components/shared/FinancialSummary';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, openLoginModal } = useAuthStore();
  const { items, version, coupon, busy, refresh } = useCartStore();
  const [options, setOptions] = useState<Awaited<ReturnType<typeof financialApi.options>> | null>(null);
  const [addressId, setAddressId] = useState(0);
  const [method, setMethod] = useState('');
  const [payment, setPayment] = useState<CheckoutInput['payment_method']>('card_to_card');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const sending = useRef(false);
  const quotedFingerprint = useRef('');
  const address: SavedAddress | undefined = options?.addresses.find(a => a.id === addressId);
  const methods = options?.shipping.filter(s => s.zone === address?.zone_code) ?? [];
  const fingerprint = JSON.stringify([user?.id, version, addressId, method, payment, coupon?.code ?? null]);
  const input = useRef<CheckoutInput | null>(null);
  useEffect(() => {
    let current = true;
    setOptions(null); setAddressId(0); setMethod(''); setQuote(null); setError('');
    if (user) financialApi.options().then(data => { if (current) { setOptions(data); setAddressId(data.addresses[0]?.id ?? 0); } }).catch(e => { if (current) setError(e.message); });
    return () => { current = false; };
  }, [user?.id]);
  useEffect(() => {
    let current = true;
    setQuote(null); setError(''); input.current = null; quotedFingerprint.current = '';
    if (!user || !addressId || !method || busy) return;
    // A network retry reuses the same key; no browser monetary values are persisted.
    const storageKey = 'shopnext_checkout_attempt';
    let attempt: { fingerprint: string; key: string } | null = null;
    try { attempt = JSON.parse(sessionStorage.getItem(storageKey) || 'null'); } catch { /* unavailable storage is safe for this mounted attempt */ }
    if (attempt?.fingerprint !== fingerprint) attempt = { fingerprint, key: crypto.randomUUID() };
    try { sessionStorage.setItem(storageKey, JSON.stringify(attempt)); } catch { /* key remains in this operation */ }
    const request: CheckoutInput = { version, address_id: addressId, shipping_method: method, payment_method: payment, coupon: coupon?.code ?? null, idempotency_key: attempt.key };
    input.current = request;
    financialApi.checkoutQuote(request).then(q => { if (current) { setQuote(q); quotedFingerprint.current = fingerprint; } }).catch(e => { if (current) setError(e.message); });
    return () => { current = false; };
  }, [fingerprint, busy]);
  async function place(e: React.FormEvent) {
    e.preventDefault();
    if (quotedFingerprint.current !== fingerprint || sending.current || !quote?.checkout_ready || !input.current || busy) return;
    sending.current = true; setSubmitting(true); setError('');
    try {
      const { order } = await financialApi.checkout(input.current);
      // Checkout already cleared the cart transactionally. Never issue a destructive PUT here.
      void refresh(); void useAuthStore.getState().checkAuth();
      navigate('/order-success/' + order.id);
    } catch (e) { setError((e as Error).message); }
    finally { sending.current = false; setSubmitting(false); }
  }
  if (!user) return <div className="py-16 text-center space-y-4"><p>برای تسویه وارد حساب شوید.</p><button onClick={openLoginModal}>ورود به حساب</button></div>;
  return <div className="space-y-8 pb-16"><CheckoutStepper currentStep={2} /><CartStatus />
    <form onSubmit={place} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-surface rounded-2xl p-5 border border-outline-variant/60 space-y-4 shadow-xs">
          <h2 className="font-black text-sm">نشانی ذخیره‌شده دریافت سفارش</h2>
          <label className="block text-xs">انتخاب نشانی<select className="block w-full p-3 border rounded-xl" value={addressId} disabled={submitting} onChange={e => { setAddressId(Number(e.target.value)); setMethod(''); }}><option value={0}>انتخاب کنید</option>{options?.addresses.map(a => <option key={a.id} value={a.id}>{a.title} — {a.city}</option>)}</select></label>
          {options && !options.addresses.length && <p role="alert">نشانی ذخیره‌شده ندارید؛ ثبت سفارش تا ثبت نشانی معتبر ممکن نیست.</p>}
          {address && <p className="text-xs">{address.recipient_name} — {address.recipient_phone}<br />{address.province}، {address.city}، {address.street_address}<br />{address.postal_code}</p>}
          <p className="text-xs">منطقه و کرایه از نشانی متعلق به حساب تعیین می‌شوند، نه از مبلغ یا منطقه ارسالی مرورگر.</p>
        </div>
        <div className="bg-surface rounded-2xl p-5 border border-outline-variant/60 space-y-4 shadow-xs"><h2 className="font-black text-sm">روش ارسال</h2>
          {methods.map(s => <label key={s.method} className="block p-3 border rounded-xl"><input type="radio" name="shipping" disabled={submitting} checked={method === s.method} onChange={() => setMethod(s.method)} /> {s.method}</label>)}
          {address && !methods.length && <p role="alert">روش و تعرفه معتبر برای این نشانی پیکربندی نشده است؛ کرایه صفر فرض نمی‌شود.</p>}
        </div>
        <div className="bg-surface rounded-2xl p-5 border border-outline-variant/60 space-y-4 shadow-xs"><h2 className="font-black text-sm">شیوه پرداخت</h2>
          {(['card_to_card', 'wallet', 'cod'] as const).map(p => <label key={p} className="block p-3 border rounded-xl"><input type="radio" name="payment" disabled={submitting || (p === 'cod' && !methods.find(s => s.method === method)?.cod)} checked={payment === p} onChange={() => setPayment(p)} /> {paymentNames[p]}</label>)}
          <p className="text-xs">کیف پول فقط با موجودی کافی و به‌صورت کامل؛ کارت به کارت پس از ارسال رسید و تایید مدیر پرداخت‌شده محسوب می‌شود. درگاه آنلاین در این مرحله فعال نیست.</p>
        </div>
      </div>
      <div className="lg:col-span-4 bg-surface rounded-2xl p-5 border border-outline-variant/60 space-y-5 shadow-xs">
        <h2 className="font-black text-sm">صورت‌حساب سرور</h2><FinancialSummary quote={quote} />
        {error && <p role="alert" className="text-red-700 text-xs">{error}</p>}
        <button disabled={submitting || busy || !items.length || !quote?.checkout_ready} className="w-full py-3.5 px-6 rounded-xl bg-primary text-white font-black text-sm disabled:opacity-50">{submitting ? 'در حال ثبت…' : 'ثبت نهایی سفارش'}</button>
        <Link to="/cart" className="text-xs underline">بازگشت به سبد</Link>
      </div>
    </form>
  </div>;
};
