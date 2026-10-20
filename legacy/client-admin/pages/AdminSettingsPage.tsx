// ===== ADMIN SETTINGS PAGE =====
// Store configuration, masked payment gateway credentials, SMS APIs, and shipping thresholds

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { SettingsResponse } from '../../../shared/types';
import { formatToman } from '../../lib/persian';
import { useToastStore } from '../../store/toastStore';

export const AdminSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToastStore();

  useEffect(() => {
    api.admin.getSettings().then((res) => {
      setSettings(res);
      setLoading(false);
    }).catch(console.error);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const result = await api.admin.saveSettings(settings);
      setSettings(result.settings);
      showToast('تنظیمات فروشگاه با موفقیت در پایگاه داده ذخیره گردید.', 'success');
    } catch (err: any) {
      showToast(err.message || 'خطا در ذخیره تنظیمات', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return <div className="py-20 text-center text-xs text-on-surface-variant">در حال بارگذاری تنظیمات فروشگاه...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl pb-16">
      <div>
        <h1 className="text-xl font-black text-on-surface">تنظیمات سامانه تجارت الکترونیک</h1>
        <p className="text-xs text-on-surface-variant mt-0.5">
          پیکربندی اطلاعات حقوقی، مالیات بر ارزش افزوده، سقف ارسال رایگان و درگاه‌های پرداخت شاپرک
        </p>
      </div>

      {/* 1. General & Legal Information */}
      <div className="bg-surface rounded-2xl p-5 border border-outline-variant/60 shadow-xs space-y-4">
        <h3 className="font-black text-sm text-on-surface pb-2 border-b border-outline-variant/50 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-base">store</span>
          اطلاعات حقوقی و هویت سازمانی
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-bold text-on-surface">نام تجاری فروشگاه</label>
            <input
              type="text"
              value={settings.storeName}
              onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-on-surface">نام رسمی حقوقی شرکت</label>
            <input
              type="text"
              value={settings.storeLegalName}
              onChange={(e) => setSettings({ ...settings, storeLegalName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-on-surface">تلفن پشتیبانی مرکزی</label>
            <input
              type="text"
              value={settings.phone}
              onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:border-primary font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-on-surface">پست الکترونیک رسمی</label>
            <input
              type="email"
              value={settings.email}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:border-primary font-mono text-start"
              dir="ltr"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-on-surface">کد اقتصادی شرکت</label>
            <input
              type="text"
              value={settings.economicCode}
              onChange={(e) => setSettings({ ...settings, economicCode: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-mono focus:outline-none focus:border-primary"
              dir="ltr"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-on-surface">شناسه ملی حقوقی</label>
            <input
              type="text"
              value={settings.nationalId}
              onChange={(e) => setSettings({ ...settings, nationalId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-mono focus:outline-none focus:border-primary"
              dir="ltr"
            />
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <label className="font-bold text-on-surface">نشانی دفتر مرکزی و انبار توزیع</label>
          <input
            type="text"
            value={settings.address}
            onChange={(e) => setSettings({ ...settings, address: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* 2. Shipping & Thresholds */}
      <div className="bg-surface rounded-2xl p-5 border border-outline-variant/60 shadow-xs space-y-4">
        <h3 className="font-black text-sm text-on-surface pb-2 border-b border-outline-variant/50 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-base">local_shipping</span>
          هزینه‌های حمل و نقل و آستانه ارسال رایگان
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-bold text-on-surface">سقف خرید برای ارسال رایگان (تومان)</label>
            <input
              type="number"
              value={settings.freeShippingThreshold}
              onChange={(e) => setSettings({ ...settings, freeShippingThreshold: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-mono focus:outline-none focus:border-primary"
            />
            <span className="text-[10px] text-on-surface-variant block">فعلی: {formatToman(settings.freeShippingThreshold)}</span>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-on-surface">هزینه پست پیشتاز سراسری (تومان)</label>
            <input
              type="number"
              value={settings.standardShippingFee}
              onChange={(e) => setSettings({ ...settings, standardShippingFee: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-mono focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-on-surface">هزینه پیک اکسپرس فوری (تومان)</label>
            <input
              type="number"
              value={settings.expressShippingFee}
              onChange={(e) => setSettings({ ...settings, expressShippingFee: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-mono focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* 3. Masked Payment Gateway Secrets (Strict Rule) */}
      <div className="bg-surface rounded-2xl p-5 border border-outline-variant/60 shadow-xs space-y-4">
        <h3 className="font-black text-sm text-on-surface pb-2 border-b border-outline-variant/50 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-base">lock</span>
          تنظیمات امنیتی درگاه‌های پرداخت آنلاین (کلیدهای رمزنگاری شده)
        </h3>

        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-base">security</span>
          <span>طبق قوانین امنیتی سامانه، مرچنت کدها و توکن‌های اتصال در سرور ذخیره و برای مروگر به صورت ماسک‌شده ارسال می‌گردند.</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-outline-variant space-y-3 bg-surface-container-low">
            <div className="flex items-center justify-between">
              <span className="font-bold text-on-surface">درگاه پرداخت زرین‌پال (ZarinPal)</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">فعال</span>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-on-surface-variant font-medium">Merchant ID (ماسک شده):</label>
              <input
                type="text"
                readOnly
                value={settings.gateways?.zarinpal?.merchantId?.masked || 'تنظیم نشده'}
                className="w-full px-3 py-1.5 rounded-lg border border-outline-variant bg-surface font-mono text-[11px]"
                dir="ltr"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-outline-variant space-y-3 bg-surface-container-low">
            <div className="flex items-center justify-between">
              <span className="font-bold text-on-surface">درگاه شاپرک پرداخت الکترونیک سامان (SEP)</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">فعال</span>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-on-surface-variant font-medium">Terminal ID (ماسک شده):</label>
              <input
                type="text"
                readOnly
                value="••••8891"
                className="w-full px-3 py-1.5 rounded-lg border border-outline-variant bg-surface font-mono text-[11px]"
                dir="ltr"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-8 py-3 rounded-xl bg-primary text-white font-black text-sm shadow hover:bg-primary-container transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-base">save</span>
          <span>{saving ? 'در حال ذخیره‌سازی...' : 'ذخیره کلیه تنظیمات'}</span>
        </button>
      </div>
    </form>
  );
};
