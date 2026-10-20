// ===== STOREFRONT STATIC & INFORMATIONAL PAGES =====
// About Us, Contact Us, FAQ, and Terms/Return policy screens with Persian RTL styling

import React, { useState } from 'react';
import { Breadcrumb } from '../../components/shared/Breadcrumb';
import { useToastStore } from '../../store/toastStore';

export const AboutPage: React.FC = () => {
  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      <Breadcrumb items={[{ label: 'درباره ما', isCurrent: true }]} />

      <div className="bg-surface rounded-3xl p-6 sm:p-10 border border-outline-variant/60 shadow-xs space-y-6 text-on-surface">
        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
            داستان دیجی‌استایل (ویستا استایل)
          </span>
          <h1 className="text-2xl sm:text-3xl font-black">مرجع تخصصی مد و سبک زندگی معاصر ایران</h1>
        </div>

        <p className="text-sm leading-loose text-on-surface-variant">
          دیجی‌استایل از سال ۱۳۹۵ با هدف ارائه تجربه‌ای متمایز، مدرن و اصیل در خرید پوشاک، کفش و اکسسوری در ایران فعالیت خود را آغاز نموده است. ما با گلچینی از برترین برندهای رسمی پوشاک ایرانی نظیر هاکوپیان، پاتن جامه، مارال چرم، درسا و چرم مشهد، اصالت فیزیکی ۱۰۰٪ و کیفیت بی‌نقص را به خانه ایرانیان آورده‌ایم.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/60 text-center space-y-1.5">
            <span className="material-symbols-outlined text-primary text-3xl">verified</span>
            <h3 className="font-bold text-sm">۱۰۰٪ ضمانت اصالت کالا</h3>
            <p className="text-xs text-on-surface-variant">تامین مستقیم و انحصاری از تولیدکنندگان رسمی</p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/60 text-center space-y-1.5">
            <span className="material-symbols-outlined text-primary text-3xl">sync</span>
            <h3 className="font-bold text-sm">۷ روز ضمانت بازگشت</h3>
            <p className="text-xs text-on-surface-variant">امکان تعویض سایز و مرجوعی بدون قید و شرط</p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/60 text-center space-y-1.5">
            <span className="material-symbols-outlined text-primary text-3xl">support_agent</span>
            <h3 className="font-bold text-sm">پشتیبانی ۷ روز هفته</h3>
            <p className="text-xs text-on-surface-variant">مشاوره تخصصی استایل و پاسخگویی تلفنی</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ContactPage: React.FC = () => {
  const { showToast } = useToastStore();
  const [form, setForm] = useState({ name: '', phone: '', subject: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('پیام شما با موفقیت ثبت شد. همکاران پشتیبانی به زودی با شما تماس خواهند گرفت.', 'success');
    setForm({ name: '', phone: '', subject: '', message: '' });
  };

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      <Breadcrumb items={[{ label: 'تماس با ما', isCurrent: true }]} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Contact Info */}
        <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-outline-variant/60 space-y-6 shadow-xs">
          <h1 className="text-xl font-black text-on-surface">اطلاعات تماس و دفتر مرکزی</h1>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            همکاران ما در واحد صدای مشتری دیجی‌استایل همه‌روزه از ساعت ۸ صبح الی ۲۲ آماده پاسخگویی و راهنمایی شما هستند.
          </p>

          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3 text-on-surface">
              <span className="material-symbols-outlined text-primary text-lg mt-0.5">call</span>
              <div>
                <span className="font-bold block">تلفن پشتیبانی مرکزی:</span>
                <span className="font-mono text-sm font-bold text-primary">۰۲۱-۹۱۰۰۸۸۷۷</span>
              </div>
            </div>

            <div className="flex items-start gap-3 text-on-surface">
              <span className="material-symbols-outlined text-primary text-lg mt-0.5">mail</span>
              <div>
                <span className="font-bold block">پست الکترونیک:</span>
                <span className="font-mono">support@digistyle.ir</span>
              </div>
            </div>

            <div className="flex items-start gap-3 text-on-surface">
              <span className="material-symbols-outlined text-primary text-lg mt-0.5">location_on</span>
              <div>
                <span className="font-bold block">آدرس دفتر مرکزی:</span>
                <span>تهران، خیابان شریعتی، بالاتر از میرداماد، برج اداری ویستا، طبقه ۷، واحد ۷۰۳</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <form onSubmit={handleSubmit} className="bg-surface rounded-3xl p-6 sm:p-8 border border-outline-variant/60 space-y-4 shadow-xs">
          <h2 className="text-base font-black text-on-surface">ارسال پیام مستقیم به پشتیبانی</h2>

          <div className="space-y-1 text-xs">
            <label className="font-bold text-on-surface">نام و نام خانوادگی *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1 text-xs">
            <label className="font-bold text-on-surface">شماره تماس *</label>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:border-primary font-mono"
              dir="ltr"
            />
          </div>

          <div className="space-y-1 text-xs">
            <label className="font-bold text-on-surface">موضوع پیام *</label>
            <input
              type="text"
              required
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1 text-xs">
            <label className="font-bold text-on-surface">متن پیام *</label>
            <textarea
              required
              rows={3}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-container transition active:scale-95 shadow"
          >
            ارسال پیام
          </button>
        </form>
      </div>
    </div>
  );
};

export const FAQPage: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'چگونه می‌توانم سفارش خود را رهگیری کنم؟',
      a: 'پس از ثبت سفارش و تحویل آن به پست، کد ۲۴ رقمی رهگیری مرسوله از طریق پیامک برای شما ارسال می‌شود. همچنین در بخش «رهگیری سفارش» با درج شماره سفارش یا کد رهگیری می‌توانید موقعیت لحظه‌ای بسته را مشاهده نمایید.',
    },
    {
      q: 'شرایط تعویض یا مرجوع کردن کالا تا چند روز است؟',
      a: 'کلیه مشتریان دیجی‌استایل تا ۷ روز پس از دریافت کالا، در صورت عدم استفاده، سالم بودن اتیکت‌ها و بسته‌بندی اورجینال، می‌توانند اقدام به مرجوع کردن یا تعویض سایز نمایند.',
    },
    {
      q: 'آیا امکان پرداخت در محل (COD) وجود دارد؟',
      a: 'بله، در شهرهای تحت پوشش سفیران دیجی‌استایل (نظیر تهران، اصفهان، شیراز و مشهد)، امکان پرداخت از طریق دستگاه کارتخوان سیار هنگام تحویل بسته فراهم است.',
    },
    {
      q: 'سقف خرید برای ارسال رایگان چقدر است؟',
      a: 'خریدهای بالای ۴۰۰,۰۰۰ تومان در سراسر کشور مشمول ارسال کاملاً رایگان با پست پیشتاز سفارشی هستند.',
    },
  ];

  return (
    <div className="space-y-8 pb-16 max-w-3xl mx-auto">
      <Breadcrumb items={[{ label: 'پرسش‌های متداول', isCurrent: true }]} />

      <div className="text-center space-y-2">
        <h1 className="text-2xl font-black text-on-surface">پرسش‌های متداول خریداران</h1>
        <p className="text-xs text-on-surface-variant">پاسخ سریع به پرسش‌های رایج در مورد سفارش، ارسال و بازگشت کالا</p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className="bg-surface rounded-2xl border border-outline-variant/60 overflow-hidden shadow-xs transition"
          >
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="w-full p-4 text-start font-bold text-xs sm:text-sm text-on-surface flex items-center justify-between gap-4 hover:bg-surface-container-low transition"
            >
              <span>{faq.q}</span>
              <span className={`material-symbols-outlined text-base transition-transform ${openIdx === i ? 'rotate-180' : ''}`}>
                keyboard_arrow_down
              </span>
            </button>
            {openIdx === i && (
              <div className="px-4 pb-4 pt-1 text-xs text-on-surface-variant leading-relaxed border-t border-outline-variant/40">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
