// ===== ADMIN DASHBOARD PAGE =====
// Complete admin overview with sales KPI cards, Jalali Recharts analytics, low stock alerts, and latest orders

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { api } from '../../lib/api';
import { formatToman, toPersianDigits, toJalaliDate } from '../../lib/persian';
import { Order, Product } from '../../../shared/types';

export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<{
    kpis: {
      totalSales: number;
      ordersCount: number;
      customersCount: number;
      averageOrderValue: number;
      conversionRate: string;
      lowStockCount: number;
    };
    salesChartData: { day: string; sales: number; orders: number }[];
    recentOrders: Order[];
    lowStockProducts: Product[];
    topProducts: Product[];
  } | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin.getDashboard().then((res) => {
      setData(res);
      setLoading(false);
    }).catch(console.error);
  }, []);

  if (loading || !data) {
    return (
      <div className="py-20 text-center text-xs text-on-surface-variant flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <span>در حال تحلیل آمارهای فروش و انبارداری...</span>
      </div>
    );
  }

  const { kpis, salesChartData, recentOrders, lowStockProducts, topProducts } = data;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-on-surface">داشبورد مدیریت و تحلیل فروش</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">خلاصه وضعیت فروش، سفارشات، انبار و مشتریان در یک نگاه</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>سامانه برخط شاپرک و درگاه‌ها: فعال</span>
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-surface p-4 rounded-2xl border border-outline-variant/60 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] font-bold">فروش کل</span>
            <span className="material-symbols-outlined text-primary text-base">payments</span>
          </div>
          <div className="text-base sm:text-lg font-black text-on-surface font-mono">
            {formatToman(kpis.totalSales)}
          </div>
          <span className="text-[10px] text-emerald-600 font-bold block">+۱۲٪ رشد نسبت به هفته پیش</span>
        </div>

        <div className="bg-surface p-4 rounded-2xl border border-outline-variant/60 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] font-bold">سفارش‌های ثبت شده</span>
            <span className="material-symbols-outlined text-primary text-base">shopping_cart</span>
          </div>
          <div className="text-base sm:text-lg font-black text-on-surface font-mono">
            {toPersianDigits(kpis.ordersCount)} سفارش
          </div>
          <span className="text-[10px] text-emerald-600 font-bold block">۹۸٪ موفقیت پرداخت</span>
        </div>

        <div className="bg-surface p-4 rounded-2xl border border-outline-variant/60 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] font-bold">تعداد مشتریان</span>
            <span className="material-symbols-outlined text-primary text-base">group</span>
          </div>
          <div className="text-base sm:text-lg font-black text-on-surface font-mono">
            {toPersianDigits(kpis.customersCount)} کاربر
          </div>
          <span className="text-[10px] text-primary font-bold block">+۴ کاربر جدید امروز</span>
        </div>

        <div className="bg-surface p-4 rounded-2xl border border-outline-variant/60 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] font-bold">میانگین سبد خرید (AOV)</span>
            <span className="material-symbols-outlined text-primary text-base">receipt</span>
          </div>
          <div className="text-base sm:text-lg font-black text-on-surface font-mono">
            {formatToman(kpis.averageOrderValue)}
          </div>
          <span className="text-[10px] text-on-surface-variant block">سبد مشتریان طلایی</span>
        </div>

        <div className="bg-surface p-4 rounded-2xl border border-outline-variant/60 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] font-bold">نرخ تبدیل فروش</span>
            <span className="material-symbols-outlined text-primary text-base">trending_up</span>
          </div>
          <div className="text-base sm:text-lg font-black text-on-surface font-mono">
            {kpis.conversionRate}
          </div>
          <span className="text-[10px] text-emerald-600 font-bold block">بالاتر از میانگین رقبا</span>
        </div>

        <div className="bg-surface p-4 rounded-2xl border border-outline-variant/60 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] font-bold">هشدار کمبود موجودی</span>
            <span className="material-symbols-outlined text-secondary text-base">warning</span>
          </div>
          <div className="text-base sm:text-lg font-black text-secondary font-mono">
            {toPersianDigits(kpis.lowStockCount)} کالا
          </div>
          <span className="text-[10px] text-secondary font-bold block">نیازمند شارژ سریع انبار</span>
        </div>
      </div>

      {/* Sales Chart (Jalali Dates) */}
      <div className="bg-surface rounded-2xl p-5 border border-outline-variant/60 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-on-surface">نمودار روند فروش روزانه (۷ روز اخیر)</h3>
            <p className="text-[11px] text-on-surface-variant mt-0.5">مبالغ به تومان و بر اساس تقویم جلالی (شمسی)</p>
          </div>
          <span className="text-xs font-bold text-primary px-3 py-1 rounded-lg bg-primary/10">
            مجموع هفتگی: ۵۹,۸۰۰,۰۰۰ تومان
          </span>
        </div>

        <div className="h-64 w-full pt-4 font-mono text-xs" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesChartData} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary, #00236f)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--primary, #00236f)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
              <XAxis dataKey="day" stroke="#888" fontSize={11} />
              <YAxis
                stroke="#888"
                fontSize={10}
                tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
              />
              <Tooltip
                formatter={(value: any) => [`${formatToman(Number(value))}`, 'فروش']}
                labelStyle={{ fontWeight: 'bold' }}
                contentStyle={{ borderRadius: '12px', border: '1px solid #ddd', direction: 'rtl' }}
              />
              <Area type="monotone" dataKey="sales" stroke="var(--primary, #00236f)" strokeWidth={3} fillOpacity={1} fill="url(#salesGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column Grid: Latest Orders & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Latest Orders (Col 1-7) */}
        <div className="lg:col-span-7 bg-surface rounded-2xl p-5 border border-outline-variant/60 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-outline-variant/50">
            <h3 className="text-sm font-black text-on-surface">جدیدترین سفارش‌های دریافتی</h3>
            <Link to="/admin/orders" className="text-xs text-primary font-bold hover:underline">
              مشاهده همه
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/40 text-on-surface-variant font-bold">
                  <th className="p-2 text-start">شماره سفارش</th>
                  <th className="p-2 text-start">مشتری</th>
                  <th className="p-2 text-center">مبلغ</th>
                  <th className="p-2 text-center">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((ord) => (
                  <tr key={ord.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low">
                    <td className="p-2 font-mono font-bold text-on-surface">{ord.orderNumber}</td>
                    <td className="p-2 font-medium">{ord.customerName}</td>
                    <td className="p-2 text-center font-mono font-bold">{formatToman(ord.totalPaid)}</td>
                    <td className="p-2 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                        {ord.status === 'delivered' ? 'تحویل شد' :
                         ord.status === 'processing' ? 'بسته‌بندی' :
                         ord.status === 'shipped' ? 'ارسال شد' : 'در انتظار'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts (Col 8-12) */}
        <div className="lg:col-span-5 bg-surface rounded-2xl p-5 border border-outline-variant/60 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-outline-variant/50">
            <h3 className="text-sm font-black text-secondary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">warning</span>
              کالاهای در آستانه اتمام موجودی
            </h3>
            <Link to="/admin/products" className="text-xs text-primary font-bold hover:underline">
              مدیریت انبار
            </Link>
          </div>

          <div className="space-y-3">
            {lowStockProducts.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs">
                <div className="flex items-center gap-2.5">
                  <img src={p.mainImage} alt="" className="w-10 h-10 rounded-lg object-cover bg-surface-container-high" />
                  <div>
                    <h4 className="font-bold text-on-surface line-clamp-1 max-w-[180px]">{p.title}</h4>
                    <span className="text-[10px] text-on-surface-variant font-mono">کد: {p.sku}</span>
                  </div>
                </div>
                <div className="text-end">
                  <span className="px-2 py-0.5 rounded text-[11px] font-black bg-secondary/10 text-secondary font-mono">
                    موجودی: {toPersianDigits(p.stock)} عدد
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
