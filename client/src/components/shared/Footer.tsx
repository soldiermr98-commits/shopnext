import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-surface-container-low border-t border-outline-variant mt-auto no-print">
      <div className="max-w-[1320px] mx-auto px-margin-mobile md:px-margin-desktop py-space-xl space-y-space-lg">
        {/* Top Row: Value Proposition Trust Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-space-lg border-b border-outline-variant/60 text-right">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl text-primary">verified</span>
            <div>
              <h4 className="text-body-md font-bold text-on-surface">ضمانت ۱۰۰٪ اصالت کالا</h4>
              <p className="text-label-sm text-outline">تضمین تمامی برندهای معتبر</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl text-primary">local_shipping</span>
            <div>
              <h4 className="text-body-md font-bold text-on-surface">ارسال سریع و اکسپرس</h4>
              <p className="text-label-sm text-outline">تحویل در بازه‌های دلخواه تهران و شهرستان</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl text-primary">assignment_return</span>
            <div>
              <h4 className="text-body-md font-bold text-on-surface">۷ روز ضمانت بازگشت</h4>
              <p className="text-label-sm text-outline">تعویض و عودت آسان وجه کالا</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl text-primary">headset_mic</span>
            <div>
              <h4 className="text-body-md font-bold text-on-surface">پشتیبانی ۲۴ ساعته</h4>
              <p className="text-label-sm text-outline">پاسخگویی در تمام روزهای هفته</p>
            </div>
          </div>
        </div>

        {/* Middle Row: Links & Electronic Trust Marks */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-space-lg items-start">
          {/* Brand Info & Contact */}
          <div className="md:col-span-5 space-y-3">
            <div className="text-headline-md font-headline-md font-bold text-primary flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center font-black text-sm">
                V
              </span>
              <span>دیجی‌استایل</span>
            </div>
            <p className="text-body-sm font-body-sm text-on-surface-variant leading-relaxed text-justify">
              دیجی‌استایل به عنوان مرجع تخصصی مد، پوشاک و سبک زندگی با ارائه جدیدترین مجموعه‌های پوشاک زنانه، مردانه، کیف، کفش و اکسسوری از برترین برندهای بین‌المللی و ایرانی، تجربه‌ای بی‌نظیر از خرید آنلاین را برای شما به ارمغان می‌آورد.
            </p>
            <div className="text-body-sm font-body-sm text-on-surface-variant space-y-1 pt-1">
              <p>
                تلفن پشتیبانی: <strong className="text-primary font-mono font-bold">۰۲۱-۹۱۰۰۸۸۷۷</strong> (پاسخگویی شبانه‌روزی)
              </p>
              <p>
                نشانی ایمیل سازمانی: <strong className="text-primary font-mono font-bold">support@digistyle.ir</strong>
              </p>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="md:col-span-4 grid grid-cols-2 gap-space-md text-body-sm font-body-sm">
            <div className="space-y-2.5">
              <h4 className="font-bold text-on-surface text-body-md">خدمات مشتریان</h4>
              <ul className="space-y-1.5 text-on-surface-variant">
                <li><Link to="/return-request" className="hover:text-primary transition-colors">پشتیبانی و شرایط بازگشت</Link></li>
                <li><Link to="/faq" className="hover:text-primary transition-colors">راهنمای خرید و پرداخت امن</Link></li>
                <li><Link to="/faq" className="hover:text-primary transition-colors">پرسش‌های متداول (FAQ)</Link></li>
                <li><Link to="/track-order" className="hover:text-primary transition-colors">رویه‌های ارسال سفارش</Link></li>
              </ul>
            </div>
            <div className="space-y-2.5">
              <h4 className="font-bold text-on-surface text-body-md">دیجی‌استایل</h4>
              <ul className="space-y-1.5 text-on-surface-variant">
                <li><Link to="/about" className="hover:text-primary transition-colors">درباره ما و داستان برند</Link></li>
                <li><Link to="/contact" className="hover:text-primary transition-colors">تماس با پشتیبانی ۲۴/۷</Link></li>
                <li><Link to="/careers" className="hover:text-primary transition-colors">فرصت‌های شغلی</Link></li>
                <li><Link to="/terms" className="hover:text-primary transition-colors">حریم خصوصی و قوانین</Link></li>
              </ul>
            </div>
          </div>

          {/* Official Seals: Enamad & Samandehi Cards */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="font-bold text-on-surface text-body-md">مجوزها و تاییدیه رسمی</h4>
            <div className="flex items-center gap-3">
              {/* Enamad Box */}
              <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-xl p-3 text-center shadow-xs hover:border-primary transition-colors">
                <div className="w-12 h-12 mx-auto mb-1.5 bg-surface-container flex items-center justify-center rounded-lg text-primary">
                  <span className="material-symbols-outlined text-2xl">verified</span>
                </div>
                <span className="text-label-sm font-bold text-on-surface block">اینماد ۵ ستاره</span>
                <span className="text-label-sm text-outline text-[10px]">نماد اعتماد الکترونیکی</span>
              </div>
              {/* Samandehi Box */}
              <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-xl p-3 text-center shadow-xs hover:border-primary transition-colors">
                <div className="w-12 h-12 mx-auto mb-1.5 bg-surface-container flex items-center justify-center rounded-lg text-primary">
                  <span className="material-symbols-outlined text-2xl">gavel</span>
                </div>
                <span className="text-label-sm font-bold text-on-surface block">ساماندهی رسمی</span>
                <span className="text-label-sm text-outline text-[10px]">وزارت ارشاد و رسانه</span>
              </div>
            </div>
            <p className="text-[11px] text-outline text-center">
              کلیه پرداخت‌ها تحت نظارت شاپرک بانک مرکزی ج.ا.ا انجام می‌پذیرد.
            </p>
          </div>
        </div>

        {/* Bottom Copyright Line */}
        <div className="border-t border-outline-variant/60 pt-space-md text-center text-body-sm font-body-sm text-on-surface-variant flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>کلیه حقوق مادی و معنوی این وب‌سایت متعلق به دیجی‌استایل است. © ۱۴۰۳</p>
          <div className="flex items-center gap-4 text-xs text-outline">
            <Link to="/terms" className="hover:text-primary transition-colors">حریم خصوصی</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-primary transition-colors">شرایط استفاده</Link>
            <span>•</span>
            <Link to="/admin" className="text-primary font-bold hover:underline">ورود همکاران (ادمین)</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
