// ===== STOREFRONT ORDER SUCCESS & INVOICE PAGE =====
// Pixel-faithful order success screen with confetti animation, invoice print view, and tracking details

import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Order } from '../../../shared/types';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits, toJalaliDate } from '../../lib/persian';

export const OrderSuccessPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [order, setOrder] = useState<Order | null>((location.state as any)?.order || null);
  const [loading, setLoading] = useState(!order);

  useEffect(() => {
    // Fire confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}

    if (!order && id) {
      api.getOrder(id).then((o) => {
        setOrder(o);
        setLoading(false);
      }).catch(console.error);
    }
  }, [id, order]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-on-surface">سفارش مورد نظر یافت نشد</h2>
        <Link to="/" className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-sm inline-block">
          بازگشت به خانه
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      {/* Success Card (Hidden on Print) */}
      <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-outline-variant/60 text-center space-y-4 shadow-sm no-print">
        <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
          <span className="material-symbols-outlined text-4xl">check_circle</span>
        </div>

        <div className="space-y-1">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            پرداخت و ثبت با موفقیت انجام شد
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-on-surface">
            از حسن اعتماد و خرید شما سپاسگزاریم
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-md mx-auto">
            سفارش شما در مرحله بسته‌بندی انبار دیجی‌استایل قرار گرفت و پیامک وضعیت به زودی برای شما ارسال خواهد شد.
          </p>
        </div>

        {/* Quick Reference Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-4 text-xs">
          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/50">
            <span className="text-on-surface-variant block mb-1">شماره سفارش</span>
            <span className="font-black font-mono text-on-surface text-sm">{order.orderNumber}</span>
          </div>

          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/50">
            <span className="text-on-surface-variant block mb-1">کد رهگیری</span>
            <span className="font-black font-mono text-primary text-sm">{order.trackingCode}</span>
          </div>

          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/50">
            <span className="text-on-surface-variant block mb-1">مبلغ پرداختی</span>
            <span className="font-black font-mono text-on-surface text-sm">{formatToman(order.totalPaid)}</span>
          </div>

          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/50">
            <span className="text-on-surface-variant block mb-1">شیوه پرداخت</span>
            <span className="font-black text-on-surface text-sm">{order.paymentMethodName}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <button
            onClick={() => window.print()}
            className="px-5 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface font-bold text-xs flex items-center gap-1.5 hover:bg-surface-container transition"
          >
            <span className="material-symbols-outlined text-sm">print</span>
            <span>چاپ فاکتور رسمی سفارش</span>
          </button>

          <Link
            to={`/track-order?code=${order.trackingCode}`}
            className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs flex items-center gap-1.5 shadow hover:bg-primary-container transition"
          >
            <span className="material-symbols-outlined text-sm">local_shipping</span>
            <span>رهگیری لحظه‌ای مرسوله</span>
          </Link>
        </div>
      </div>

      {/* Official Tax Invoice Container (Visible on Print or Screen) */}
      <div className="bg-white text-gray-900 rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6 text-xs print:border-none print:shadow-none print:p-0">
        {/* Invoice Header */}
        <div className="flex items-center justify-between border-b pb-4 border-gray-200">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-blue-900">شرکت تجارت الکترونیک ویستا استایل (دیجی‌استایل)</h2>
            <p className="text-[11px] text-gray-500">صورتحساب فروش کالا و خدمات ویژه مصرف‌کننده نهایی</p>
          </div>
          <div className="text-end space-y-1 font-mono">
            <div><span className="text-gray-500">شماره فاکتور:</span> <strong>{order.orderNumber}</strong></div>
            <div><span className="text-gray-500">تاریخ صدور:</span> <strong>{toJalaliDate(order.createdAt)}</strong></div>
            {order.invoiceSerial && <div><span className="text-gray-500">سریال مالیاتی:</span> <strong>{order.invoiceSerial}</strong></div>}
          </div>
        </div>

        {/* Buyer & Seller Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
          <div className="space-y-1">
            <span className="font-bold text-gray-700 block border-b pb-1 mb-1">مشخصات خریدار (گیرنده):</span>
            <div><span className="text-gray-500">نام گیرنده:</span> {order.customerName}</div>
            <div><span className="text-gray-500">تلفن تماس:</span> <span className="font-mono">{order.customerPhone}</span></div>
            <div><span className="text-gray-500">نشانی تحویل:</span> {order.shippingAddress.province}، {order.shippingAddress.city}، {order.shippingAddress.streetAddress}</div>
            <div><span className="text-gray-500">کد پستی:</span> <span className="font-mono">{order.shippingAddress.postalCode}</span></div>
          </div>

          <div className="space-y-1">
            <span className="font-bold text-gray-700 block border-b pb-1 mb-1">مشخصات فروشنده:</span>
            <div><span className="text-gray-500">نام ثبتی:</span> شرکت تجارت الکترونیک ویستا استایل (سهامی خاص)</div>
            <div><span className="text-gray-500">شناسه ملی:</span> ۱۰۱۰۳۹۸۴۷۱۲ | <span className="text-gray-500">کد اقتصادی:</span> ۴۱۱۵۸۹۳۴۶۷۱۸</div>
            <div><span className="text-gray-500">آدرس دفتر مرکزی:</span> تهران، برج اداری ویستا، واحد ۷۰۳</div>
            <div><span className="text-gray-500">روش ارسال:</span> {order.shippingMethodName} ({order.deliveryDateSlot})</div>
          </div>
        </div>

        {/* Order Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 text-gray-700 font-bold">
                <th className="p-2.5 text-center w-12">ردیف</th>
                <th className="p-2.5 text-start">شرح کالا یا خدمات</th>
                <th className="p-2.5 text-center w-20">تعداد</th>
                <th className="p-2.5 text-end">مبلغ واحد (تومان)</th>
                <th className="p-2.5 text-end">تخفیف (تومان)</th>
                <th className="p-2.5 text-end">مبلغ کل (تومان)</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it: any, idx) => {
                const unitPrice = it.unitPrice || it.finalPrice || it.selectedVariant?.salePrice || it.selectedVariant?.price || it.salePrice || it.product?.salePrice || it.product?.price || it.price || 0;
                const totalItemPrice = unitPrice * it.quantity;

                return (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-2.5 text-center font-mono text-gray-500">{toPersianDigits(idx + 1)}</td>
                    <td className="p-2.5">
                      <div className="font-bold text-gray-900">{it.productTitle || it.product?.title || 'کالای سفارشی'}</div>
                      <div className="text-[11px] text-gray-500">
                        {(it.colorName || it.selectedVariant?.colorName) && `رنگ: ${it.colorName || it.selectedVariant?.colorName} `}
                        {(it.size || it.selectedVariant?.size) && `| سایز: ${it.size || it.selectedVariant?.size}`}
                      </div>
                    </td>
                    <td className="p-2.5 text-center font-mono font-bold">{toPersianDigits(it.quantity)}</td>
                    <td className="p-2.5 text-end font-mono">{formatToman(unitPrice)}</td>
                    <td className="p-2.5 text-end font-mono text-gray-500">۰</td>
                    <td className="p-2.5 text-end font-mono font-bold">{formatToman(totalItemPrice)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end pt-2">
          <div className="w-full sm:w-80 space-y-2 border-t pt-3 border-gray-300">
            <div className="flex justify-between text-gray-600">
              <span>جمع کل اقلام:</span>
              <span className="font-mono font-bold">{formatToman(order.subtotal)}</span>
            </div>

            {order.couponDiscount > 0 && (
              <div className="flex justify-between text-red-600 font-bold">
                <span>تخفیف کوپن:</span>
                <span className="font-mono">- {formatToman(order.couponDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-600">
              <span>هزینه حمل و نقل:</span>
              <span className="font-mono">{order.shippingFee === 0 ? 'رایگان' : formatToman(order.shippingFee)}</span>
            </div>

            <div className="flex justify-between text-base font-black text-blue-900 border-t pt-2">
              <span>مبلغ پرداختی نهایی:</span>
              <span className="font-mono">{formatToman(order.totalPaid)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
