// ===== ADMIN THEME & LIVE COLOR PALETTE PAGE =====
// Live visual design studio: primary/secondary colors, border radius, Persian typography, presets, and real-time storefront preview

import React, { useState } from 'react';
import { useThemeStore, DEFAULT_THEME, ThemeColors } from '../../store/themeStore';
import { useToastStore } from '../../store/toastStore';
import { formatToman } from '../../lib/persian';

interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
}

const PRESETS: ThemePreset[] = [
  {
    id: 'digistyle-classic',
    name: 'دیجی‌استایل کلاسیک (سورمه‌ای و یاقوتی)',
    description: 'تم رسمی دیجی‌استایل با سورمه‌ای درباری، کنتراست بی‌نقص و قرمز یاقوتی اکسنت',
    colors: DEFAULT_THEME,
  },
  {
    id: 'royal-gold',
    name: 'اشرافی لوکس (مشکی و طلایی متالیک)',
    description: 'استایل پرمیوم مناسب برندهای ساعت و چرم لوکس',
    colors: {
      primary: '#0f172a',
      primaryContainer: '#b45309',
      secondary: '#d97706',
      secondaryContainer: '#78350f',
      tertiary: '#1e293b',
      tertiaryContainer: '#0f172a',
      background: '#fafaf9',
      surface: '#fafaf9',
      borderRadius: '0.75rem',
    },
  },
  {
    id: 'emerald-fresh',
    name: 'زمردی مدرن (سبز جنگلی و فیروزه‌ای)',
    description: 'کالکشن بهاره و لایف‌استایل ارگانیک با حس شادابی',
    colors: {
      primary: '#064e3b',
      primaryContainer: '#047857',
      secondary: '#0d9488',
      secondaryContainer: '#115e59',
      tertiary: '#022c22',
      tertiaryContainer: '#064e3b',
      background: '#f0fdf4',
      surface: '#f0fdf4',
      borderRadius: '1rem',
    },
  },
  {
    id: 'burgundy-luxury',
    name: 'شرابی معاصر (بورگاندی و رزگلد)',
    description: 'طراحی شیک پوشاک بانوان و فشن شوهای بین‌المللی',
    colors: {
      primary: '#4c0519',
      primaryContainer: '#881337',
      secondary: '#be185d',
      secondaryContainer: '#9d174d',
      tertiary: '#2e020d',
      tertiaryContainer: '#4c0519',
      background: '#fff1f2',
      surface: '#fff1f2',
      borderRadius: '0.5rem',
    },
  },
];

export const AdminThemePage: React.FC = () => {
  const { colors, draftColors, setDraftColor, publishTheme, revertTheme, isDarkMode, toggleDarkMode } = useThemeStore();
  const { showToast } = useToastStore();
  const [selectedPresetId, setSelectedPresetId] = useState('digistyle-classic');
  const [fontFamily, setFontFamily] = useState('Vazirmatn');

  // Apply Preset
  const handleApplyPreset = (preset: ThemePreset) => {
    setSelectedPresetId(preset.id);
    (Object.keys(preset.colors) as (keyof ThemeColors)[]).forEach((key) => {
      setDraftColor(key, preset.colors[key]);
    });
    showToast(`پالت رنگی «${preset.name}» در پیش‌نمایش زنده اعمال شد.`, 'info');
  };

  // Publish
  const handlePublish = () => {
    publishTheme();
    showToast('تنظیمات قالب و رنگ‌های زنده با موفقیت منتشر گردید.', 'success');
  };

  // Reset
  const handleReset = () => {
    revertTheme();
    showToast('رنگ‌ها به حالت ذخیره‌شده بازگردانی شدند.', 'info');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-outline mb-1 font-mono">
            <span>پنل مدیریت</span>
            <span>/</span>
            <span className="text-primary font-bold">طراحی قالب و رنگ زنده</span>
          </div>
          <h1 className="text-xl font-black text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">palette</span>
            <span>استودیوی طراحی زنده و پالت‌های رنگی فروشگاه</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleDarkMode}
            className="px-3.5 py-2 rounded-xl border border-outline-variant hover:bg-surface-container text-xs font-bold flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
            <span>{isDarkMode ? 'پیش‌نمایش حالت روز' : 'پیش‌نمایش حالت شب'}</span>
          </button>

          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-xl border border-outline-variant hover:bg-surface-container text-xs font-bold text-outline hover:text-on-surface transition"
          >
            بازنشانی
          </button>

          <button
            onClick={handlePublish}
            className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container shadow transition active:scale-95 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">publish</span>
            <span>انتشار عمومی تم در سایت</span>
          </button>
        </div>
      </div>

      {/* Grid: Controls Left, Live Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Column */}
        <div className="lg:col-span-6 space-y-6">
          {/* Preset Cards */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-outline-variant/60">
              <span className="w-2.5 h-6 rounded-full bg-primary"></span>
              <h2 className="text-sm font-bold text-on-surface">پالت‌های رنگی آماده و استاندارد</h2>
            </div>

            <div className="space-y-2.5">
              {PRESETS.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleApplyPreset(p)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    selectedPresetId === p.id
                      ? 'border-primary bg-primary/5 shadow-xs'
                      : 'border-outline-variant/80 bg-surface hover:border-primary/40'
                  }`}
                >
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs text-on-surface">{p.name}</h4>
                    <p className="text-[11px] text-outline">{p.description}</p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="w-5 h-5 rounded-full border border-black/10 shadow-xs" style={{ backgroundColor: p.colors.primary }}></span>
                    <span className="w-5 h-5 rounded-full border border-black/10 shadow-xs" style={{ backgroundColor: p.colors.secondary }}></span>
                    <span className="w-5 h-5 rounded-full border border-black/10 shadow-xs" style={{ backgroundColor: p.colors.tertiary }}></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Color Pickers */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-outline-variant/60">
              <span className="w-2.5 h-6 rounded-full bg-primary"></span>
              <h2 className="text-sm font-bold text-on-surface">شخصی‌سازی دقیق کدهای هگز رنگی</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-on-surface block">رنگ اصلی برند (Primary)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draftColors.primary}
                    onChange={(e) => setDraftColor('primary', e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-outline-variant p-0.5"
                  />
                  <input
                    type="text"
                    value={draftColors.primary}
                    onChange={(e) => setDraftColor('primary', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-outline-variant bg-surface font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-on-surface block">رنگ کانتینر اصلی (Primary Container)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draftColors.primaryContainer}
                    onChange={(e) => setDraftColor('primaryContainer', e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-outline-variant p-0.5"
                  />
                  <input
                    type="text"
                    value={draftColors.primaryContainer}
                    onChange={(e) => setDraftColor('primaryContainer', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-outline-variant bg-surface font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-on-surface block">رنگ فرعی / تخفیف (Secondary)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draftColors.secondary}
                    onChange={(e) => setDraftColor('secondary', e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-outline-variant p-0.5"
                  />
                  <input
                    type="text"
                    value={draftColors.secondary}
                    onChange={(e) => setDraftColor('secondary', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-outline-variant bg-surface font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-on-surface block">رنگ سوم و پس‌زمینه کارت‌ها</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draftColors.tertiary}
                    onChange={(e) => setDraftColor('tertiary', e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-outline-variant p-0.5"
                  />
                  <input
                    type="text"
                    value={draftColors.tertiary}
                    onChange={(e) => setDraftColor('tertiary', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-outline-variant bg-surface font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Typography & Radius */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-outline-variant/60 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-on-surface">فونت رسمی سایت</label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface"
                >
                  <option value="Vazirmatn">وزیرمتن (Vazirmatn) - پیش‌فرض</option>
                  <option value="Shabnam">شبنام (Shabnam)</option>
                  <option value="Yekan">یکان بخ (Yekan Bakh)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-on-surface">گردی گوشه‌ها (Border Radius)</label>
                <select
                  value={draftColors.borderRadius}
                  onChange={(e) => setDraftColor('borderRadius', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface"
                >
                  <option value="0.5rem">فشرده و شارپ (۸px)</option>
                  <option value="0.75rem">مدرن و استاندارد (۱۲px)</option>
                  <option value="1rem">بسیار گرد و فانتزی (۱۶px)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-6 space-y-4 sticky top-24">
          <div className="bg-surface-container-lowest border-2 border-primary/40 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
              <span className="font-bold text-xs text-on-surface flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>پیش‌نمایش زنده المان‌های ویترین فروشگاه</span>
              </span>
              <span className="text-[11px] text-outline font-mono">طراحی بلادرنگ</span>
            </div>

            {/* Mock Header */}
            <div
              className="p-3 rounded-xl border flex items-center justify-between text-white shadow-xs"
              style={{ backgroundColor: draftColors.primary }}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                <span className="material-symbols-outlined text-lg">shopping_bag</span>
                <span>دیجی‌استایل ویستا</span>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span>پوشاک مردانه</span>
                <span>زنانه</span>
                <span>تخفیف‌ها</span>
              </div>
            </div>

            {/* Mock Product Card */}
            <div className="p-4 rounded-xl border border-outline-variant/80 bg-surface space-y-3 shadow-xs">
              <div className="relative h-40 rounded-lg overflow-hidden bg-gray-100">
                <img
                  src="https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=600&q=80"
                  alt="اورکت پشمی"
                  className="w-full h-full object-cover"
                />
                <span
                  className="absolute top-2 start-2 px-2 py-0.5 rounded text-white text-[10px] font-bold"
                  style={{ backgroundColor: draftColors.secondary }}
                >
                  ٪۲۵ تخفیف ویژه
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-outline">برند زارا (Zara)</span>
                <h4 className="font-bold text-xs text-on-surface">پالتو پشمی دوطرفه فوتر کلاسیک مدل ۲۰۲۵</h4>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-black text-sm font-mono text-on-surface">۲,۴۰۰,۰۰۰ تومان</span>
                  <span className="line-through text-outline text-xs font-mono">۳,۲۰۰,۰۰۰</span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  className="flex-1 py-2 rounded-lg text-white font-bold text-xs shadow-xs transition"
                  style={{ backgroundColor: draftColors.primary }}
                >
                  افزودن به سبد خرید
                </button>
                <button
                  className="px-3 py-2 rounded-lg text-white font-bold text-xs shadow-xs"
                  style={{ backgroundColor: draftColors.primaryContainer }}
                >
                  جزئیات
                </button>
              </div>
            </div>

            {/* Mock Alert & Toast */}
            <div
              className="p-3 rounded-xl text-white text-xs flex items-center justify-between shadow-xs"
              style={{ backgroundColor: draftColors.secondaryContainer }}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base">local_shipping</span>
                <span>ارسال رایگان سفارش‌های بالای ۱,۲۰۰,۰۰۰ تومان</span>
              </div>
              <span className="text-[10px] font-bold underline">مشاهده</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
