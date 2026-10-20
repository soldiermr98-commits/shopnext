// ===== ADMIN MARKETING & DISCOUNTS PAGE =====
// Complete promotional campaigns, coupon codes, and hero slider banner management

import React, { useState } from 'react';
import { useToastStore } from '../../store/toastStore';
import { Coupon } from '../../../shared/types';
import { formatToman, toPersianDigits } from '../../lib/persian';

interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  order: number;
  active: boolean;
}

const INITIAL_COUPONS: Coupon[] = [
  {
    id: 'c-1',
    code: 'VISTA2025',
    type: 'fixed',
    value: 150000,
    minOrderAmount: 2000000,
    maxDiscountAmount: 150000,
    usageLimit: 500,
    usedCount: 142,
    expiresAt: '2025-12-29T23:59:59Z',
    isActive: true,
  },
  {
    id: 'c-2',
    code: 'GOLDMEMBER',
    type: 'percent',
    value: 20,
    minOrderAmount: 1000000,
    maxDiscountAmount: 500000,
    usageLimit: 1000,
    usedCount: 389,
    expiresAt: '2025-06-31T23:59:59Z',
    isActive: true,
  },
  {
    id: 'c-3',
    code: 'NOROOZ1404',
    type: 'percent',
    value: 25,
    minOrderAmount: 3000000,
    maxDiscountAmount: 800000,
    usageLimit: 200,
    usedCount: 78,
    expiresAt: '2025-01-30T23:59:59Z',
    isActive: true,
  },
  {
    id: 'c-4',
    code: 'FIRSTBUY',
    type: 'fixed',
    value: 100000,
    minOrderAmount: 800000,
    maxDiscountAmount: 100000,
    usageLimit: 5000,
    usedCount: 1205,
    expiresAt: '2026-01-01T00:00:00Z',
    isActive: true,
  },
];

const INITIAL_BANNERS: BannerItem[] = [
  {
    id: 'b-1',
    title: 'کالکشن پاییز و زمستان ۲۰۲۵',
    subtitle: 'تجربه‌ای نو در مد معاصر با پارچه‌های لوکس فوتر، چرم طبیعی و دوخت ممتاز ایتالیایی',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80',
    link: '/shop?collection=winter',
    order: 1,
    active: true,
  },
  {
    id: 'b-2',
    title: 'کت و پالتوهای رسمی زارا',
    subtitle: 'تخفیف ویژه تا ۳۵٪ برای اعضای باشگاه طلایی ویستا با ارسال فوری امروز',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80',
    link: '/shop?brand=zara',
    order: 2,
    active: true,
  },
  {
    id: 'b-3',
    title: 'اکسسوری، چرم و کفش دست‌دوز',
    subtitle: 'کفش‌های اصیل درسا و ساعت‌های کلاسیک پیر کاردین با گارانتی اصالت',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80',
    link: '/shop?category=shoes-bags',
    order: 3,
    active: true,
  },
];

export const AdminMarketingPage: React.FC = () => {
  const { showToast } = useToastStore();
  const [activeTab, setActiveTab] = useState<'coupons' | 'banners' | 'flash_deals'>('coupons');

  // Coupons State
  const [coupons, setCoupons] = useState<Coupon[]>(INITIAL_COUPONS);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  // Coupon Form
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'fixed' | 'percent'>('percent');
  const [couponValue, setCouponValue] = useState(15);
  const [couponMinOrder, setCouponMinOrder] = useState(1000000);
  const [couponMaxCap, setCouponMaxCap] = useState(400000);
  const [couponLimit, setCouponLimit] = useState(500);

  // Banners State
  const [banners, setBanners] = useState<BannerItem[]>(INITIAL_BANNERS);
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null);

  // Banner Form
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [bannerLink, setBannerLink] = useState('/shop');
  const [bannerOrder, setBannerOrder] = useState(1);

  // Flash Deals Form
  const [flashDealActive, setFlashDealActive] = useState(true);
  const [flashDealHours, setFlashDealHours] = useState(14);
  const [flashDealMinutes, setFlashDealMinutes] = useState(35);
  const [flashDealDiscount, setFlashDealDiscount] = useState(25);

  // Toggle Coupon Active
  const handleToggleCoupon = (id: string) => {
    setCoupons(
      coupons.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c))
    );
    showToast('وضعیت کد تخفیف به‌روزرسانی شد.', 'info');
  };

  // Open Create Coupon Modal
  const openCreateCoupon = () => {
    setEditingCoupon(null);
    setCouponCode('');
    setCouponType('percent');
    setCouponValue(15);
    setCouponMinOrder(1000000);
    setCouponMaxCap(300000);
    setCouponLimit(500);
    setCouponModalOpen(true);
  };

  // Save Coupon
  const handleSaveCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) {
      showToast('کد تخفیف الزامی است.', 'error');
      return;
    }

    if (editingCoupon) {
      setCoupons(
        coupons.map((c) =>
          c.id === editingCoupon.id
            ? {
                ...c,
                code: couponCode.toUpperCase(),
                type: couponType,
                value: couponValue,
                minOrderAmount: couponMinOrder,
                maxDiscountAmount: couponMaxCap,
                usageLimit: couponLimit,
              }
            : c
        )
      );
      showToast('کد تخفیف با موفقیت ویرایش شد.', 'success');
    } else {
      const newCoupon: Coupon = {
        id: `c-${Date.now()}`,
        code: couponCode.toUpperCase(),
        type: couponType,
        value: couponValue,
        minOrderAmount: couponMinOrder,
        maxDiscountAmount: couponMaxCap,
        usageLimit: couponLimit,
        usedCount: 0,
        expiresAt: '2026-12-29T23:59:59Z',
        isActive: true,
      };
      setCoupons([...coupons, newCoupon]);
      showToast('کد تخفیف جدید ایجاد گردید.', 'success');
    }
    setCouponModalOpen(false);
  };

  // Delete Coupon
  const handleDeleteCoupon = (id: string) => {
    setCoupons(coupons.filter((c) => c.id !== id));
    showToast('کد تخفیف حذف شد.', 'info');
  };

  // Open Create Banner
  const openCreateBanner = () => {
    setEditingBanner(null);
    setBannerTitle('');
    setBannerSubtitle('');
    setBannerImage('https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80');
    setBannerLink('/shop');
    setBannerOrder(banners.length + 1);
    setBannerModalOpen(true);
  };

  // Open Edit Banner
  const openEditBanner = (b: BannerItem) => {
    setEditingBanner(b);
    setBannerTitle(b.title);
    setBannerSubtitle(b.subtitle);
    setBannerImage(b.image);
    setBannerLink(b.link);
    setBannerOrder(b.order);
    setBannerModalOpen(true);
  };

  // Save Banner
  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle || !bannerImage) {
      showToast('عنوان و تصویر بنر الزامی هستند.', 'error');
      return;
    }

    if (editingBanner) {
      setBanners(
        banners.map((b) =>
          b.id === editingBanner.id
            ? {
                ...b,
                title: bannerTitle,
                subtitle: bannerSubtitle,
                image: bannerImage,
                link: bannerLink,
                order: bannerOrder,
              }
            : b
        )
      );
      showToast('بنر اسلایدر با موفقیت ویرایش شد.', 'success');
    } else {
      const newB: BannerItem = {
        id: `banner-${Date.now()}`,
        title: bannerTitle,
        subtitle: bannerSubtitle,
        image: bannerImage,
        link: bannerLink,
        order: bannerOrder,
        active: true,
      };
      setBanners([...banners, newB]);
      showToast('بنر تبلیغاتی جدید افزوده شد.', 'success');
    }
    setBannerModalOpen(false);
  };

  // Delete Banner
  const handleDeleteBanner = (id: string) => {
    setBanners(banners.filter((b) => b.id !== id));
    showToast('بنر حذف گردید.', 'info');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-outline mb-1 font-mono">
            <span>پنل مدیریت</span>
            <span>/</span>
            <span className="text-primary font-bold">تخفیف و بازاریابی</span>
          </div>
          <h1 className="text-xl font-black text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">campaign</span>
            <span>کمپین‌های تخفیف، کوپن‌ها و بنرهای تبلیغاتی</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'coupons' ? (
            <button
              onClick={openCreateCoupon}
              className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container shadow transition flex items-center gap-1.5 active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              <span>ایجاد کد تخفیف جدید</span>
            </button>
          ) : activeTab === 'banners' ? (
            <button
              onClick={openCreateBanner}
              className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container shadow transition flex items-center gap-1.5 active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">add_photo_alternate</span>
              <span>افزودن بنر اسلایدر</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/60 pb-1 text-xs font-bold">
        <button
          onClick={() => setActiveTab('coupons')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 ${
            activeTab === 'coupons'
              ? 'bg-primary text-white shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-base">local_offer</span>
          <span>کدهای تخفیف و کوپن‌ها ({toPersianDigits(coupons.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('banners')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 ${
            activeTab === 'banners'
              ? 'bg-primary text-white shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-base">view_carousel</span>
          <span>اسلایدر و بنرهای صفحه اصلی ({toPersianDigits(banners.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('flash_deals')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 ${
            activeTab === 'flash_deals'
              ? 'bg-primary text-white shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-base">timer</span>
          <span>پیشنهادهای شگفت‌انگیز و شمارش معکوس</span>
        </button>
      </div>

      {/* TAB 1: COUPONS */}
      {activeTab === 'coupons' && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-outline-variant/60 flex items-center justify-between">
            <h3 className="font-bold text-xs text-on-surface">لیست کدهای تخفیف فعال و مصرفی</h3>
            <span className="text-[11px] text-outline font-mono">اعتبارسنجی در صفحه سبد خرید و چک‌اوت</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-surface-container-high text-on-surface font-bold border-b border-outline-variant">
                <tr>
                  <th className="p-3">کد کوپن</th>
                  <th className="p-3">نوع تخفیف</th>
                  <th className="p-3 font-mono">میزان تخفیف</th>
                  <th className="p-3 font-mono">حداقل خرید</th>
                  <th className="p-3 font-mono">سقف تخفیف</th>
                  <th className="p-3 text-center">مصرف / محدودیت</th>
                  <th className="p-3 text-center">وضعیت</th>
                  <th className="p-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-container-low transition">
                    <td className="p-3">
                      <span className="px-2.5 py-1 rounded-lg bg-surface-container font-mono font-bold text-primary text-xs border border-outline-variant/60">
                        {c.code}
                      </span>
                    </td>
                    <td className="p-3 text-outline">
                      {c.type === 'percent' ? 'درصدی (%)' : 'مبلغ ثابت نقدی'}
                    </td>
                    <td className="p-3 font-mono font-bold text-on-surface">
                      {c.type === 'percent' ? `٪${toPersianDigits(c.value)}` : formatToman(c.value)}
                    </td>
                    <td className="p-3 font-mono text-outline">
                      {c.minOrderAmount ? formatToman(c.minOrderAmount) : 'بدون شرط'}
                    </td>
                    <td className="p-3 font-mono text-outline">
                      {c.maxDiscountAmount ? formatToman(c.maxDiscountAmount) : '-'}
                    </td>
                    <td className="p-3 text-center font-mono">
                      <span className="font-bold text-primary">{toPersianDigits(c.usedCount || 0)}</span>
                      <span className="text-outline"> / {toPersianDigits(c.usageLimit || 0)}</span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleToggleCoupon(c.id)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition ${
                          c.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {c.isActive ? 'فعال' : 'غیرفعال'}
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteCoupon(c.id)}
                        className="p-1.5 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error transition"
                        title="حذف"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: BANNERS */}
      {activeTab === 'banners' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {banners.map((b) => (
            <div
              key={b.id}
              className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-xs space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="relative h-44 overflow-hidden bg-gray-100">
                  <img src={b.image} alt={b.title} className="w-full h-full object-cover" />
                  <span className="absolute top-2 end-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-mono">
                    ترتیب: {toPersianDigits(b.order)}
                  </span>
                </div>

                <div className="p-4 space-y-2">
                  <h4 className="font-bold text-sm text-on-surface leading-tight">{b.title}</h4>
                  <p className="text-xs text-outline line-clamp-2 leading-relaxed">{b.subtitle}</p>
                  <p className="text-[11px] text-primary font-mono truncate">{b.link}</p>
                </div>
              </div>

              <div className="p-4 pt-0 flex items-center justify-between border-t border-outline-variant/40 pt-3">
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {b.active ? 'در حال نمایش' : 'مخفی'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditBanner(b)}
                    className="px-3 py-1 rounded-lg border border-outline-variant hover:bg-surface-container text-xs font-bold"
                  >
                    ویرایش
                  </button>
                  <button
                    onClick={() => handleDeleteBanner(b.id)}
                    className="p-1 rounded-lg text-error hover:bg-error/10"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: FLASH DEALS & COUNTDOWN */}
      {activeTab === 'flash_deals' && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-xs max-w-2xl space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-outline-variant/60">
            <span className="w-2.5 h-6 rounded-full bg-primary"></span>
            <h2 className="text-base font-bold text-on-surface">پیکربندی جشنواره شگفت‌انگیزها</h2>
          </div>

          <div className="space-y-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-bold">
              <input
                type="checkbox"
                checked={flashDealActive}
                onChange={(e) => setFlashDealActive(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant"
              />
              <span>فعال بودن بخش باکس شگفت‌انگیز در صفحه اول فروشگاه</span>
            </label>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-on-surface">ساعت باقی‌مانده تایمر</label>
                <input
                  type="number"
                  min="0"
                  max="48"
                  value={flashDealHours}
                  onChange={(e) => setFlashDealHours(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-on-surface">دقیقه تایمر</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={flashDealMinutes}
                  onChange={(e) => setFlashDealMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-on-surface">حداقل درصد تخفیف کالاهای شگفت‌انگیز (%)</label>
              <input
                type="number"
                min="5"
                max="70"
                value={flashDealDiscount}
                onChange={(e) => setFlashDealDiscount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface font-mono"
              />
            </div>

            <button
              onClick={() => showToast('تنظیمات کمپین شگفت‌انگیز با موفقیت ذخیره شد.', 'success')}
              className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-container shadow transition active:scale-95"
            >
              اعمال و به‌روزرسانی تایمر فروشگاه
            </button>
          </div>
        </div>
      )}

      {/* COUPON MODAL */}
      {couponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <h3 className="font-bold text-sm text-on-surface">
                {editingCoupon ? 'ویرایش کد تخفیف' : 'ایجاد کد تخفیف جدید'}
              </h3>
              <button
                onClick={() => setCouponModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-outline"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-on-surface">کد تخفیف (لاتین) *</label>
                <input
                  type="text"
                  required
                  placeholder="VISTA2025, OFF50..."
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-on-surface">نوع تخفیف</label>
                  <select
                    value={couponType}
                    onChange={(e) => setCouponType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface"
                  >
                    <option value="percent">درصدی (%)</option>
                    <option value="fixed">مبلغ ثابت (تومان)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-on-surface">مقدار تخفیف</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={couponValue}
                    onChange={(e) => setCouponValue(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-on-surface">حداقل خرید (تومان)</label>
                  <input
                    type="number"
                    value={couponMinOrder}
                    onChange={(e) => setCouponMinOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-on-surface">سقف تخفیف (تومان)</label>
                  <input
                    type="number"
                    value={couponMaxCap}
                    onChange={(e) => setCouponMaxCap(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-on-surface">تعداد مجاز استفاده</label>
                <input
                  type="number"
                  min="1"
                  value={couponLimit}
                  onChange={(e) => setCouponLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setCouponModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-outline hover:bg-surface-container"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary-container shadow transition"
                >
                  ذخیره کد تخفیف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BANNER MODAL */}
      {bannerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-outline-variant space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <h3 className="font-bold text-sm text-on-surface">
                {editingBanner ? 'ویرایش بنر اسلایدر' : 'افزودن بنر اسلایدر جدید'}
              </h3>
              <button
                onClick={() => setBannerModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-outline"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-on-surface">عنوان بزرگ بنر *</label>
                <input
                  type="text"
                  required
                  placeholder="کالکشن زمستان، تخفیف فصلی..."
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-on-surface">زیرعنوان توضیحی</label>
                <input
                  type="text"
                  placeholder="توضیح کوتاه و جذاب بنر..."
                  value={bannerSubtitle}
                  onChange={(e) => setBannerSubtitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-on-surface">آدرس اینترنتی تصویر بنر *</label>
                <input
                  type="url"
                  required
                  value={bannerImage}
                  onChange={(e) => setBannerImage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-on-surface">لینک کلیک بنر</label>
                  <input
                    type="text"
                    value={bannerLink}
                    onChange={(e) => setBannerLink(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-on-surface">ترتیب نمایش</label>
                  <input
                    type="number"
                    min="1"
                    value={bannerOrder}
                    onChange={(e) => setBannerOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setBannerModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-outline hover:bg-surface-container"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary-container shadow transition"
                >
                  ذخیره بنر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
