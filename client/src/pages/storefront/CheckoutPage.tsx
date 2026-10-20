// ===== STOREFRONT CHECKOUT PAGE =====
// Pixel-faithful checkout screen with Iranian provinces/cities dropdowns, shipping options, payment gateway selection, and official invoice toggle

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits } from '../../lib/persian';
import { CheckoutStepper } from '../../components/shared/CheckoutStepper';

const IRAN_PROVINCES: Record<string, string[]> = {
  تهران: ['تهران', 'ری', 'شمیرانات', 'اسلامشهر', 'پردیس', 'دماوند', 'ورامین', 'شهریار'],
  اصفهان: ['اصفهان', 'کاشان', 'نجف‌آباد', 'شاهین‌شهر', 'خمینی‌شهر', 'فلاورجان'],
  فارس: ['شیراز', 'مرودشت', 'جهرم', 'فسا', 'کازرون', 'لارستان'],
  'خراسان رضوی': ['مشهد', 'نیشابور', 'سبزوار', 'تربت حیدریه', 'قوچان'],
  'آذربایجان شرقی': ['تبریز', 'مراغه', 'مرند', 'میانه', 'اهر'],
  مازندران: ['ساری', 'بابل', 'آمل', 'قائم‌شهر', 'تنکابن', 'چالوس', 'رامسر'],
  البرز: ['کرج', 'فردیس', 'نظرآباد', 'هشتگرد', 'طالقان'],
  خوزستان: ['اهواز', 'آبادان', 'خرمشهر', 'دزفول', 'ماهشهر'],
  گیلان: ['رشت', 'بندر انزلی', 'لاهیجان', 'لنگرود', 'تالش'],
};

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { items, coupon, clearCart, getSubtotal, getDiscountTotal, getShippingFee, getGrandTotal } = useCartStore();
  const { showToast } = useToastStore();

  const [province, setProvince] = useState('تهران');
  const [city, setCity] = useState('تهران');
  const [recipientName, setRecipientName] = useState(user?.name || 'سهراب مظفری');
  const [recipientPhone, setRecipientPhone] = useState(user?.phone || '09123456789');
  const [nationalCode, setNationalCode] = useState(user?.nationalCode || '0083459126');
  const [streetAddress, setStreetAddress] = useState('خیابان فرشته، خیابان مریم غربی، پلاک ۲۴، زنگ ۳');
  const [postalCode, setPostalCode] = useState('۱۹۶۵۸۷۳۲۱۱');
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express'>('standard');
  const [deliverySlot, setDeliverySlot] = useState('فردا، بازه ۱۰ تا ۱۴');
  const [paymentMethod, setPaymentMethod] = useState<'sep' | 'zarinpal' | 'wallet' | 'cod'>('sep');
  const [requiresOfficialInvoice, setRequiresOfficialInvoice] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = getSubtotal();
  const discountTotal = getDiscountTotal();
  const baseShippingFee = getShippingFee();
  const shippingFee = shippingMethod === 'express' ? 65000 : baseShippingFee;
  const couponDiscount = coupon ? (coupon.type === 'percent' ? Math.round((subtotal * coupon.value) / 100) : coupon.value) : 0;
  const grandTotal = Math.max(0, subtotal - couponDiscount + shippingFee);

  if (items.length === 0) {
    return (
      <div className="py-16 text-center space-y-4">
        <h2 className="text-lg font-bold text-on-surface">سبد خرید شما برای تسویه حساب خالی است.</h2>
        <Link to="/shop" className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs inline-block">
          بازگشت به فروشگاه
        </Link>
      </div>
    );
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName || !recipientPhone || !streetAddress || !postalCode) {
      showToast('لطفاً مشخصات کامل گیرنده و آدرس پستی را تکمیل فرمایید.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const orderPayload = {
        customerName: recipientName,
        customerPhone: recipientPhone,
        customerNationalCode: nationalCode,
        shippingAddress: {
          recipientName,
          recipientPhone,
          province,
          city,
          streetAddress,
          postalCode,
        },
        items,
        couponCode: coupon?.code,
        shippingMethodId: shippingMethod,
        shippingMethodName: shippingMethod === 'express' ? 'پیک اکسپرس فوری' : 'پست پیشتاز سفارشی',
        deliveryDateSlot: deliverySlot,
        paymentMethod,
        notes,
        requiresOfficialTaxInvoice: requiresOfficialInvoice,
      };

      const res = await api.createOrder(orderPayload);
      clearCart();
      showToast('سفارش شما با موفقیت ثبت گردید.', 'success');
      navigate(`/order-success/${res.order.id}`, { state: { order: res.order } });
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت نهایی سفارش', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto">
      <CheckoutStepper currentStep={2} />

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Address, Shipping & Payment (Col 1-8) */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. Recipient & Postal Address */}
          <div className="bg-surface rounded-2xl p-5 border border-outline-variant/60 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-outline-variant/50">
              <span className="material-symbols-outlined text-primary text-lg">location_on</span>
              <h3 className="font-black text-sm text-on-surface">اطلاعات گیرنده و آدرس تحویل سفارش</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-on-surface">نام و نام خانوادگی گیرنده *</label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-on-surface">شماره همراه دریافت‌کننده *</label>
                <input
                  type="tel"
                  required
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:border-primary font-mono"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-on-surface">کد ملی گیرنده (اختیاری)</label>
                <input
                  type="text"
                  value={nationalCode}
                  onChange={(e) => setNationalCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:border-primary font-mono"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-on-surface">استان *</label>
                <select
                  value={province}
                  onChange={(e) => {
                    setProvince(e.target.value);
                    setCity(IRAN_PROVINCES[e.target.value]?.[0] || '');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:border-primary font-bold"
                >
                  {Object.keys(IRAN_PROVINCES).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-on-surface">شهر *</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:border-primary font-bold"
                >
                  {(IRAN_PROVINCES[province] || []).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-on-surface">نشانی پستی دقیق (خیابان، کوچه، پلاک، واحد) *</label>
              <textarea
                required
                rows={2}
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-on-surface">کد پستی ۱۰ رقمی *</label>
                <input
                  type="text"
                  required
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:border-primary font-mono"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-on-surface">یادداشت برای سفیر ارسال (اختیاری)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: تحویل به نگهبانی مجتمع"
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* 2. Shipping Method & Time Slot */}
          <div className="bg-surface rounded-2xl p-5 border border-outline-variant/60 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-outline-variant/50">
              <span className="material-symbols-outlined text-primary text-lg">local_shipping</span>
              <h3 className="font-black text-sm text-on-surface">انتخاب روش و زمان تحویل</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                onClick={() => setShippingMethod('standard')}
                className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition ${
                  shippingMethod === 'standard' ? 'border-primary bg-primary/5 shadow-xs' : 'border-outline-variant hover:border-outline'
                }`}
              >
                <input
                  type="radio"
                  name="shipping"
                  checked={shippingMethod === 'standard'}
                  onChange={() => setShippingMethod('standard')}
                  className="mt-1 text-primary focus:ring-primary"
                />
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-on-surface flex items-center justify-between">
                    <span>پست پیشتاز سراسری</span>
                    <span className="text-emerald-600 font-mono">
                      {baseShippingFee === 0 ? 'رایگان' : formatToman(baseShippingFee)}
                    </span>
                  </div>
                  <p className="text-on-surface-variant text-[11px]">تحویل ۲ الی ۳ روز کاری در سراسر کشور با بیمه مرسوله</p>
                </div>
              </label>

              <label
                onClick={() => setShippingMethod('express')}
                className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition ${
                  shippingMethod === 'express' ? 'border-primary bg-primary/5 shadow-xs' : 'border-outline-variant hover:border-outline'
                }`}
              >
                <input
                  type="radio"
                  name="shipping"
                  checked={shippingMethod === 'express'}
                  onChange={() => setShippingMethod('express')}
                  className="mt-1 text-primary focus:ring-primary"
                />
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-on-surface flex items-center justify-between">
                    <span>پیک اکسپرس فوری دیجی‌استایل</span>
                    <span className="text-primary font-mono">{formatToman(65000)}</span>
                  </div>
                  <p className="text-on-surface-variant text-[11px]">ارسال در همان روز یا روز بعد با انتخاب بازه زمانی</p>
                </div>
              </label>
            </div>

            {/* Time Slot */}
            <div className="space-y-2 text-xs pt-2">
              <span className="font-bold text-on-surface">بازه زمانی تحویل:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {['فردا، بازه ۱۰ تا ۱۴', 'فردا، بازه ۱۵ تا ۲۰', 'پس‌فردا، بازه ۱۰ تا ۱۴'].map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setDeliverySlot(slot)}
                    className={`p-2.5 rounded-xl border text-center font-bold transition text-xs ${
                      deliverySlot === slot ? 'border-primary bg-primary text-white shadow-xs' : 'border-outline-variant hover:border-primary'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Payment Method Choice */}
          <div className="bg-surface rounded-2xl p-5 border border-outline-variant/60 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-outline-variant/50">
              <span className="material-symbols-outlined text-primary text-lg">credit_card</span>
              <h3 className="font-black text-sm text-on-surface">انتخاب درگاه و شیوه پرداخت</h3>
            </div>

            <div className="space-y-2.5">
              {[
                { id: 'sep', title: 'درگاه شاپرک پرداخت الکترونیک سامان (SEP)', desc: 'پرداخت امن با تمامی کارت‌های شتاب بانکی با رمز دوم پویا', icon: 'payments' },
                { id: 'zarinpal', title: 'درگاه اینترنتی زرین‌پال (ZarinPal)', desc: 'پرداخت سریع و تضمینی با کلیه کارت‌های عضو شبکه شتاب', icon: 'account_balance_wallet' },
                { id: 'wallet', title: 'کیف پول نقدی دیجی‌استایل', desc: `موجودی شما: ${formatToman(user?.walletBalance || 1250000)} (کسر آنی بدون کارمزد)`, icon: 'savings' },
                { id: 'cod', title: 'پرداخت در محل (Cash On Delivery)', desc: 'پرداخت هنگام تحویل مرسوله از طریق کارتخوان سیار سفیر دیجی‌استایل', icon: 'local_atm' },
              ].map((m) => (
                <label
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                    paymentMethod === m.id ? 'border-primary bg-primary/5 shadow-xs' : 'border-outline-variant hover:border-outline'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === m.id}
                      onChange={() => setPaymentMethod(m.id as any)}
                      className="text-primary focus:ring-primary"
                    />
                    <div className="space-y-0.5 text-xs">
                      <span className="font-bold text-on-surface block">{m.title}</span>
                      <span className="text-on-surface-variant text-[11px]">{m.desc}</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-primary text-xl">{m.icon}</span>
                </label>
              ))}
            </div>

            {/* Official Tax Invoice Checkbox */}
            <div className="pt-3 border-t border-outline-variant/50 flex items-center gap-2.5">
              <input
                type="checkbox"
                id="invoiceToggle"
                checked={requiresOfficialInvoice}
                onChange={(e) => setRequiresOfficialInvoice(e.target.checked)}
                className="w-4 h-4 text-primary rounded focus:ring-primary cursor-pointer"
              />
              <label htmlFor="invoiceToggle" className="text-xs font-bold text-on-surface cursor-pointer">
                درخواست صدور فاکتور رسمی مالیاتی با شناسه یکتای مودیان و کد اقتصادی
              </label>
            </div>
          </div>
        </div>

        {/* Right Summary Column (Col 9-12) */}
        <div className="lg:col-span-4 bg-surface rounded-2xl p-6 border border-outline-variant/60 space-y-5 shadow-xs sticky top-24">
          <h3 className="font-black text-sm text-on-surface pb-3 border-b border-outline-variant/50">
            بازبینی و تایید نهایی سفارش
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">مجموع قیمت کالاها</span>
              <span className="font-bold font-mono text-on-surface">{formatToman(subtotal)}</span>
            </div>

            {discountTotal > 0 && (
              <div className="flex items-center justify-between text-secondary">
                <span>تخفیف کاتالوگ</span>
                <span className="font-bold font-mono">- {formatToman(discountTotal)}</span>
              </div>
            )}

            {couponDiscount > 0 && (
              <div className="flex items-center justify-between text-emerald-600">
                <span>تخفیف کوپن ({coupon?.code})</span>
                <span className="font-bold font-mono">- {formatToman(couponDiscount)}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">هزینه ارسال</span>
              <span className="font-bold font-mono text-on-surface">
                {shippingFee === 0 ? <span className="text-emerald-600 font-bold">رایگان</span> : formatToman(shippingFee)}
              </span>
            </div>

            <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-between text-sm font-black text-on-surface">
              <span>مبلغ نهایی فاکتور</span>
              <span className="text-lg font-black text-primary font-mono">
                {formatToman(grandTotal)}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-6 rounded-xl bg-primary text-white font-black text-sm flex items-center justify-center gap-2 shadow hover:bg-primary-container transition active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>در حال برقراری ارتباط با درگاه...</span>
            ) : (
              <>
                <span>پرداخت و ثبت نهایی سفارش</span>
                <span className="material-symbols-outlined text-sm rtl:rotate-180">lock</span>
              </>
            )}
          </button>

          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60 text-[11px] text-on-surface-variant space-y-1">
            <div className="flex items-center gap-1 font-bold text-on-surface">
              <span className="material-symbols-outlined text-xs text-primary">verified_user</span>
              <span>تضمین امنیت پرداخت شاپرک</span>
            </div>
            <p>کلیه تراکنش‌های مالی با پروتکل رمزنگاری امن SSL پردازش می‌گردد.</p>
          </div>
        </div>
      </form>
    </div>
  );
};
