// ===== STOREFRONT ORDER TRACKING PAGE =====
// Public parcel & order tracking with Jalali timeline and postal barnameh

import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits, toJalaliDate } from '../../lib/persian';

export const OrderTrackingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [trackingInput, setTrackingInput] = useState(searchParams.get('code') || '');
  const [orderData, setOrderData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async (codeToSearch: string) => {
    if (!codeToSearch.trim()) return;
    setLoading(true);
    setError('');
    setOrderData(null);

    try {
      const data = await api.trackOrder(codeToSearch.trim());
      setOrderData(data);
    } catch (err: any) {
      setError(err.message || 'سفارشی با این کد رهگیری یافت نشد.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setTrackingInput(code);
      handleTrack(code);
    }
  }, [searchParams]);

  const steps = [
    { key: 'pending', title: 'ثبت اولیه سفارش', icon: 'receipt_long', desc: 'سفارش در سیستم ثبت شد' },
    { key: 'processing', title: 'تایید و بسته‌بندی انبار', icon: 'inventory_2', desc: 'کالاها بسته‌بندی و الصاق بارکد شدند' },
    { key: 'shipped', title: 'تحویل به شرکت پست', icon: 'local_shipping', desc: 'مرسوله به مرکز توزیع پست تحویل گردید' },
    { key: 'delivered', title: 'تحویل نهایی به مشتری', icon: 'done_all', desc: 'بسته با موفقیت تحویل داده شد' },
  ];

  const getStepStatus = (stepKey: string, currentStatus: string) => {
    const order = ['pending', 'awaiting_payment', 'processing', 'shipped', 'delivered'];
    const currentIdx = order.indexOf(currentStatus);
    const stepIdx = order.indexOf(stepKey);
    if (currentIdx >= stepIdx) return 'completed';
    return 'pending';
  };

  return (
    <div className="space-y-8 pb-16 max-w-3xl mx-auto">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl">local_shipping</span>
        </div>
        <h1 className="text-2xl font-black text-on-surface">رهگیری آنلاین سفارش و مرسوله پستی</h1>
        <p className="text-xs text-on-surface-variant">
          شماره سفارش (DK-...) یا کد رهگیری پستی (TRK-...) خود را وارد فرمایید.
        </p>
      </div>

      {/* Search Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleTrack(trackingInput);
        }}
        className="bg-surface rounded-2xl p-4 border border-outline-variant/60 shadow-xs flex gap-2"
      >
        <input
          type="text"
          value={trackingInput}
          onChange={(e) => setTrackingInput(e.target.value)}
          placeholder="مثال: TRK-55428912 یا DK-892144"
          className="flex-1 px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-sm font-mono focus:outline-none focus:border-primary"
          dir="ltr"
        />
        <button
          type="submit"
          disabled={loading || !trackingInput.trim()}
          className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-container transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
        >
          {loading ? 'در حال جستجو...' : 'پیگیری وضعیت'}
        </button>
      </form>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-base">error</span>
          <span>{error}</span>
        </div>
      )}

      {orderData && (
        <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-outline-variant/60 space-y-8 shadow-xs">
          {/* Order Header Summary */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-outline-variant/50">
            <div className="space-y-1">
              <span className="text-xs text-on-surface-variant font-medium">گیرنده مرسوله: {orderData.customerName}</span>
              <h2 className="text-lg font-black text-on-surface flex items-center gap-2 font-mono">
                <span>{orderData.orderNumber}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {orderData.shippingMethodName}
                </span>
              </h2>
            </div>
            <div className="text-end font-mono text-xs">
              <div className="text-on-surface-variant">بارنامه پستی: <strong>{orderData.postalBarnameh || 'در انتظار صدور'}</strong></div>
              <div className="text-on-surface-variant">تاریخ ثبت: <strong>{toJalaliDate(orderData.createdAt)}</strong></div>
            </div>
          </div>

          {/* Stepper Timeline */}
          <div className="space-y-6">
            <h3 className="text-sm font-black text-on-surface">مراحل پردازش و ارسال سفارش</h3>
            <div className="relative border-s-2 border-primary/20 ms-4 space-y-8 ps-6">
              {steps.map((st) => {
                const status = getStepStatus(st.key, orderData.status);
                const isCompleted = status === 'completed';

                return (
                  <div key={st.key} className="relative">
                    <div
                      className={`absolute -start-[35px] top-0 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-xs transition ${
                        isCompleted ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">{st.icon}</span>
                    </div>

                    <div className="space-y-1">
                      <h4 className={`text-sm font-bold ${isCompleted ? 'text-primary font-black' : 'text-on-surface-variant'}`}>
                        {st.title}
                      </h4>
                      <p className="text-xs text-on-surface-variant">{st.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delivery Note */}
          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/60 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 text-on-surface">
              <span className="material-symbols-outlined text-primary">schedule</span>
              <span>بازه تحویل انتخابی شما: <strong>{orderData.deliveryDateSlot}</strong></span>
            </div>
            <span className="font-bold text-primary font-mono">
              مقصد: {orderData.shippingAddress.province}، {orderData.shippingAddress.city}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
