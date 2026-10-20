// ===== ADMIN ORDERS MANAGEMENT PAGE =====
// Orders management with status workflows, tracking code updates, SMS trigger notifications, and invoice generation

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Order } from '../../../shared/types';
import { formatToman, toPersianDigits, toJalaliDate } from '../../lib/persian';
import { useToastStore } from '../../store/toastStore';

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [postalBarnameh, setPostalBarnameh] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const { showToast } = useToastStore();

  const loadOrders = () => {
    setLoading(true);
    api.admin
      .getOrders(statusFilter || undefined)
      .then((res) => {
        setOrders(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const handleOpenStatusModal = (ord: Order) => {
    setSelectedOrder(ord);
    setNewStatus(ord.status);
    setTrackingCode(ord.trackingCode);
    setPostalBarnameh(ord.postalBarnameh || '');
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setIsUpdating(true);
    try {
      await api.admin.updateOrderStatus(selectedOrder.id, newStatus, trackingCode, postalBarnameh);
      showToast(`وضعیت سفارش ${selectedOrder.orderNumber} با موفقیت به‌روزرسانی شد و پیامک برای مشتری ارسال گردید.`, 'success');
      setSelectedOrder(null);
      loadOrders();
    } catch (err: any) {
      showToast(err.message || 'خطا در به‌روزرسانی سفارش', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-on-surface">مدیریت و پردازش سفارش‌های مشتریان</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            تغییر وضعیت، صدور فاکتور و ثبت بارنامه شرکت ملی پست جمهوری اسلامی ایران
          </p>
        </div>

        <button
          onClick={() => {
            const csvContent = 'data:text/csv;charset=utf-8,' + ['شماره سفارش,مشتری,تلفن,مبلغ,وضعیت,تاریخ', ...orders.map(o => `${o.orderNumber},${o.customerName},${o.customerPhone},${o.totalPaid},${o.status},${o.createdAt}`)].join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', `orders-export-${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('خروجی اکسل/CSV با موفقیت دانلود شد.', 'success');
          }}
          className="px-4 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface font-bold text-xs flex items-center gap-1.5 hover:bg-surface-container transition active:scale-95"
        >
          <span className="material-symbols-outlined text-base">download</span>
          <span>خروجی اکسل (CSV)</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-outline-variant/60 pb-3 overflow-x-auto text-xs font-bold">
        {[
          { id: '', label: 'همه سفارش‌ها' },
          { id: 'awaiting_payment', label: 'در انتظار پرداخت' },
          { id: 'processing', label: 'در حال پردازش انبار' },
          { id: 'shipped', label: 'تحویل شده به پست' },
          { id: 'delivered', label: 'تحویل نهایی' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setStatusFilter(f.id)}
            className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
              statusFilter === f.id
                ? 'bg-primary text-white font-black shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-surface rounded-2xl border border-outline-variant/60 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/50 text-on-surface font-black">
                <th className="p-3 text-start">شماره و تاریخ سفارش</th>
                <th className="p-3 text-start">مشتری و مقصد</th>
                <th className="p-3 text-center">تعداد اقلام</th>
                <th className="p-3 text-center">مبلغ فاکتور (تومان)</th>
                <th className="p-3 text-center">درگاه / شیوه پرداخت</th>
                <th className="p-3 text-center">وضعیت مرسوله</th>
                <th className="p-3 text-center w-28">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-on-surface-variant">
                    در حال دریافت لیست سفارش‌ها...
                  </td>
                </tr>
              ) : orders.length > 0 ? (
                orders.map((ord) => (
                  <tr key={ord.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low transition">
                    <td className="p-3">
                      <div className="font-bold font-mono text-on-surface">{ord.orderNumber}</div>
                      <div className="text-[11px] text-on-surface-variant">{toJalaliDate(ord.createdAt)}</div>
                      <div className="text-[10px] text-primary font-mono mt-0.5">کد رهگیری: {ord.trackingCode}</div>
                    </td>

                    <td className="p-3">
                      <div className="font-bold text-on-surface">{ord.customerName}</div>
                      <div className="text-[11px] text-on-surface-variant font-mono">{ord.customerPhone}</div>
                      <div className="text-[10px] text-on-surface-variant">
                        {ord.shippingAddress.province}، {ord.shippingAddress.city}
                      </div>
                    </td>

                    <td className="p-3 text-center font-mono font-bold">
                      {toPersianDigits(ord.itemsCount)} عدد
                    </td>

                    <td className="p-3 text-center font-mono font-black text-on-surface">
                      {formatToman(ord.totalPaid)}
                    </td>

                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-surface-container-high text-on-surface">
                        {ord.paymentMethodName}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        ord.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                        ord.status === 'processing' ? 'bg-amber-100 text-amber-800' :
                        ord.status === 'shipped' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {ord.status === 'delivered' ? 'تحویل شده' :
                         ord.status === 'processing' ? 'در حال بسته‌بندی' :
                         ord.status === 'shipped' ? 'تحویل به پست' : 'در انتظار بررسی'}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleOpenStatusModal(ord)}
                        className="px-3 py-1.5 rounded-lg bg-primary text-white font-bold text-[11px] hover:bg-primary-container transition active:scale-95"
                      >
                        تغییر وضعیت
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-on-surface-variant">
                    سفارشی با این وضعیت یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* UPDATE STATUS & TRACKING MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface rounded-3xl max-w-lg w-full p-6 space-y-5 border border-outline-variant shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
              <div>
                <h3 className="text-base font-black text-on-surface">
                  مدیریت سفارش {selectedOrder.orderNumber}
                </h3>
                <span className="text-xs text-on-surface-variant">مشتری: {selectedOrder.customerName} ({selectedOrder.customerPhone})</span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-on-surface">وضعیت سفارش *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-bold focus:outline-none focus:border-primary"
                >
                  <option value="awaiting_payment">در انتظار پرداخت</option>
                  <option value="processing">در حال بسته‌بندی در انبار مرکزی</option>
                  <option value="shipped">تحویل به شرکت ملی پست (کد بارنامه درج شود)</option>
                  <option value="delivered">تحویل نهایی به خریدار</option>
                  <option value="cancelled">لغو شده</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-on-surface">کد رهگیری سامانه دیجی‌استایل</label>
                <input
                  type="text"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-mono focus:outline-none focus:border-primary"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-on-surface">شماره بارنامه ۲۴ رقمی پست (اختیاری)</label>
                <input
                  type="text"
                  value={postalBarnameh}
                  onChange={(e) => setPostalBarnameh(e.target.value)}
                  placeholder="مثال: PB-9481230"
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-mono focus:outline-none focus:border-primary"
                  dir="ltr"
                />
              </div>

              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[11px] flex items-center gap-2">
                <span className="material-symbols-outlined text-base">sms</span>
                <span>با تایید این فرم، پیامک اطلاع‌رسانی وضعیت به صورت خودکار به شماره مشتری ارسال می‌شود.</span>
              </div>

              <div className="pt-3 border-t border-outline-variant flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-5 py-2.5 rounded-xl border border-outline-variant text-on-surface font-bold hover:bg-surface-container-low transition"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary-container transition active:scale-95 disabled:opacity-50"
                >
                  {isUpdating ? 'در حال ثبت...' : 'به‌روزرسانی و ارسال پیامک'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
