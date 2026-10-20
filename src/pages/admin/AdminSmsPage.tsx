// ===== ADMIN SMS & PATTERN TEMPLATES PAGE =====
// Full-featured Iranian SMS gateways configuration (Kavenegar, MeliPayamak, FarazSMS), pattern templates, live test simulator, and sent logs

import React, { useState } from 'react';
import { useToastStore } from '../../store/toastStore';
import { toPersianDigits, toJalaliDate, formatToman } from '../../lib/persian';

interface SmsPattern {
  id: string;
  code: string;
  title: string;
  triggerEvent: string;
  templateText: string;
  variables: string[];
  sampleOutput: string;
  isActive: boolean;
}

interface SentSmsLog {
  id: string;
  recipient: string;
  patternCode: string;
  patternTitle: string;
  messageText: string;
  status: 'delivered' | 'sent' | 'failed';
  cost: number;
  traceCode: string;
  sentAt: string;
}

const INITIAL_PATTERNS: SmsPattern[] = [
  {
    id: 'pat-1',
    code: 'order_success_vst',
    title: 'تأیید و ثبت سفارش',
    triggerEvent: 'ثبت موفقیت‌آمیز سفارش توسط مشتری در درگاه',
    templateText: 'سهراب عزیز، سفارش شما با کد {0} به مبلغ {1} تومان با موفقیت در دیجی‌استایل ثبت شد و در مرحله آماده‌سازی است.\nپیگیری: {2}',
    variables: ['{0}: کد سفارش', '{1}: مبلغ پرداختی', '{2}: لینک رهگیری'],
    sampleOutput: 'سهراب عزیز، سفارش شما با کد VST-94821 به مبلغ ۴,۶۸۹,۰۰۰ تومان با موفقیت در دیجی‌استایل ثبت شد و در مرحله آماده‌سازی است.\nپیگیری: digistyle.ir/track-order?code=EXP-94821-TEH',
    isActive: true,
  },
  {
    id: 'pat-2',
    code: 'order_shipped_vst',
    title: 'تحویل به پیک / ارسال کد بارنامه پستی',
    triggerEvent: 'تغییر وضعیت سفارش به تحویل به پست یا پیک',
    templateText: 'مشتری گرامی {0}، مرسوله سفارش {1} تحویل شرکت پست گردید.\nشماره بارنامه رهگیری: {2}\nدیجی‌استایل',
    variables: ['{0}: نام گیرنده', '{1}: شماره سفارش', '{2}: کد رهگیری پستی'],
    sampleOutput: 'مشتری گرامی سهراب مظفری، مرسوله سفارش VST-94821 تحویل شرکت پست گردید.\nشماره بارنامه رهگیری: 4892019482103\nدیجی‌استایل',
    isActive: true,
  },
  {
    id: 'pat-3',
    code: 'auth_otp_vst',
    title: 'کد یک‌بار مصرف ورود (OTP)',
    triggerEvent: 'درخواست ورود با شماره موبایل',
    templateText: 'کد تأیید ورود شما به دیجی‌استایل: {0}\nاین کد به مدت ۲ دقیقه معتبر است.',
    variables: ['{0}: کد ۶ رقمی'],
    sampleOutput: 'کد تأیید ورود شما به دیجی‌استایل: 849201\nاین کد به مدت ۲ دقیقه معتبر است.',
    isActive: true,
  },
  {
    id: 'pat-4',
    code: 'club_bonus_vst',
    title: 'پاداش عضویت طلایی و شارژ کیف پول',
    triggerEvent: 'ارتقای حساب به عضویت طلایی یا دریافت امتیاز خرید',
    templateText: 'تبریک! {0} امتیاز وفاداری ویستا کلاب به حساب شما افزوده شد.\nموجودی فعلی: {1} تومان\nدیجی‌استایل',
    variables: ['{0}: امتیاز جدید', '{1}: موجودی کیف پول'],
    sampleOutput: 'تبریک! ۲۴۸ امتیاز وفاداری ویستا کلاب به حساب شما افزوده شد.\nموجودی فعلی: ۱,۲۵۰,۰۰۰ تومان\nدیجی‌استایل',
    isActive: true,
  },
];

const INITIAL_LOGS: SentSmsLog[] = [
  {
    id: 'log-1',
    recipient: '۰۹۱۲۳۴۵۶۷۸۹',
    patternCode: 'order_success_vst',
    patternTitle: 'تأیید و ثبت سفارش VST-94821',
    messageText: 'سهراب عزیز، سفارش شما با کد VST-94821 به مبلغ ۴,۶۸۹,۰۰۰ تومان با موفقیت در دیجی‌استایل ثبت شد.',
    status: 'delivered',
    cost: 140,
    traceCode: 'TRC-94810294',
    sentAt: '۱۴۰۳/۰۲/۲۵ - ۱۶:۴۲',
  },
  {
    id: 'log-2',
    recipient: '۰۹۱۲۳۴۵۶۷۸۹',
    patternCode: 'auth_otp_vst',
    patternTitle: 'کد تایید ورود OTP',
    messageText: 'کد تأیید ورود شما به دیجی‌استایل: 582104\nاین کد به مدت ۲ دقیقه معتبر است.',
    status: 'delivered',
    cost: 140,
    traceCode: 'TRC-94810012',
    sentAt: '۱۴۰۳/۰۲/۲۵ - ۱۶:۳۸',
  },
  {
    id: 'log-3',
    recipient: '۰۹۳۵۱۲۳۴۵۶۷',
    patternCode: 'order_shipped_vst',
    patternTitle: 'ارسال بارنامه VST-88210',
    messageText: 'مشتری گرامی مریم مظفری، مرسوله سفارش VST-88210 تحویل پیک گردید.',
    status: 'delivered',
    cost: 140,
    traceCode: 'TRC-88410291',
    sentAt: '۱۴۰۳/۰۱/۱۲ - ۱۱:۱۵',
  },
  {
    id: 'log-4',
    recipient: '۰۹۱۹۲۲۲۳۳۴۴',
    patternCode: 'club_bonus_vst',
    patternTitle: 'پاداش وفاداری',
    messageText: 'تبریک! ۱۰۰ امتیاز وفاداری ویستا کلاب به حساب شما افزوده شد.',
    status: 'delivered',
    cost: 140,
    traceCode: 'TRC-87102931',
    sentAt: '۱۴۰۳/۰۱/۱۰ - ۰۹:۲۰',
  },
];

export const AdminSmsPage: React.FC = () => {
  const { showToast } = useToastStore();
  const [activeTab, setActiveTab] = useState<'provider' | 'patterns' | 'simulator' | 'logs'>('patterns');

  // Provider Settings
  const [activeProvider, setActiveProvider] = useState<'kavenegar' | 'melipayamak' | 'farazsms'>('kavenegar');
  const [apiKey, setApiKey] = useState('KVN-8841-SEC-94821039-PERSIA');
  const [senderLine, setSenderLine] = useState('20005006');
  const [otpMode, setOtpMode] = useState<'lookup_pattern' | 'direct_sms'>('lookup_pattern');
  const [balance, setBalance] = useState(845000); // 845,000 Tomans SMS balance

  // Patterns State
  const [patterns, setPatterns] = useState<SmsPattern[]>(INITIAL_PATTERNS);
  const [editingPattern, setEditingPattern] = useState<SmsPattern | null>(null);

  // Simulator State
  const [testMobile, setTestMobile] = useState('09123456789');
  const [selectedPatternCode, setSelectedPatternCode] = useState('order_success_vst');
  const [customTestMessage, setCustomTestMessage] = useState('');
  const [simulatedMobileScreen, setSimulatedMobileScreen] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Logs State
  const [logs, setLogs] = useState<SentSmsLog[]>(INITIAL_LOGS);

  // Save Provider Config
  const handleSaveProviderConfig = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('تنظیمات سرویس پیامک با موفقیت در دیتابیس ذخیره شد.', 'success');
  };

  // Toggle Pattern Status
  const handleTogglePattern = (id: string) => {
    setPatterns(
      patterns.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p))
    );
    showToast('وضعیت ارسال الگو به‌روزرسانی شد.', 'info');
  };

  // Save Edited Pattern
  const handleSavePattern = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPattern) return;
    setPatterns(
      patterns.map((p) => (p.id === editingPattern.id ? editingPattern : p))
    );
    showToast(`الگوی «${editingPattern.title}» با موفقیت ذخیره شد.`, 'success');
    setEditingPattern(null);
  };

  // Send Test SMS
  const handleSendTestSms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testMobile || testMobile.length < 11) {
      showToast('لطفاً شماره موبایل ۱۱ رقمی معتبر وارد کنید.', 'error');
      return;
    }

    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      const chosenPattern = patterns.find((p) => p.code === selectedPatternCode);
      const message = customTestMessage || chosenPattern?.sampleOutput || 'پیامک تستی سامانه دیجی‌استایل با موفقیت ارسال شد.';
      
      setSimulatedMobileScreen((prev) => [message, ...prev]);
      
      const newLog: SentSmsLog = {
        id: `log-${Date.now()}`,
        recipient: testMobile,
        patternCode: chosenPattern?.code || 'custom_test',
        patternTitle: chosenPattern?.title || 'ارسال دستی آزمایشی',
        messageText: message,
        status: 'delivered',
        cost: 140,
        traceCode: `TRC-${Math.floor(10000000 + Math.random() * 90000000)}`,
        sentAt: 'لحظاتی پیش',
      };
      setLogs([newLog, ...logs]);
      setBalance((b) => Math.max(0, b - 140));
      showToast(`پیامک آزمایشی با موفقیت به ${testMobile} ارسال شد.`, 'success');
    }, 700);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-outline mb-1 font-mono">
            <span>پنل مدیریت</span>
            <span>/</span>
            <span className="text-primary font-bold">سرویس پیامک و الگوها</span>
          </div>
          <h1 className="text-xl font-black text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">sms</span>
            <span>سرویس پیامک و اطلاع‌رسانی الگوها</span>
          </h1>
        </div>

        {/* SMS Credit Balance Badge */}
        <div className="flex items-center gap-3">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-2 flex items-center gap-3 shadow-xs">
            <span className="material-symbols-outlined text-amber-500 text-xl">account_balance_wallet</span>
            <div>
              <span className="text-[10px] text-outline block">اعتبار پنل پیامک:</span>
              <span className="text-sm font-bold text-on-surface font-mono">{formatToman(balance)} تومان</span>
            </div>
            <button
              onClick={() => {
                setBalance((b) => b + 500000);
                showToast('اعتبار پنل با موفقیت ۵۰۰,۰۰۰ تومان شارژ شد.', 'success');
              }}
              className="px-2.5 py-1 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-container transition"
            >
              + شارژ
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-outline-variant/60 overflow-x-auto pb-1 text-xs font-bold">
        <button
          onClick={() => setActiveTab('patterns')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'patterns'
              ? 'bg-primary text-white shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-base">quickref</span>
          <span>الگوهای خدماتی OTP ({toPersianDigits(patterns.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('provider')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'provider'
              ? 'bg-primary text-white shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-base">tune</span>
          <span>تنظیمات ارائه‌دهنده پیامک</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'simulator'
              ? 'bg-primary text-white shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-base">phone_android</span>
          <span>شبیه‌ساز و کنسول تست زنده</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'logs'
              ? 'bg-primary text-white shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-base">history</span>
          <span>لاگ و تاریخچه پیامک‌ها ({toPersianDigits(logs.length)})</span>
        </button>
      </div>

      {/* TAB 1: PATTERNS */}
      {activeTab === 'patterns' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-xl">info</span>
            <p className="leading-relaxed">
              پیامک‌های وب‌سرویس خدماتی بدون بلک‌لیست مخابراتی حتی به خطوطی که پیامک تبلیغاتی را مسدود کرده‌اند ارسال می‌شوند.
              الگوها از سیستم الگوی اشتراکی کاوه‌نگار / ملی‌پیامک استفاده می‌کنند.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {patterns.map((pat) => (
              <div
                key={pat.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-on-surface flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                      <span>{pat.title}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-surface-container text-primary font-bold">
                      {pat.code}
                    </span>
                  </div>

                  <p className="text-[11px] text-outline font-medium">رویداد ارسال: {pat.triggerEvent}</p>

                  <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60 font-mono text-xs leading-relaxed text-on-surface">
                    {pat.templateText}
                  </div>

                  <div className="text-[11px] text-outline space-y-0.5">
                    <span className="font-bold block text-on-surface">متغیرهای مجاز:</span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {pat.variables.map((v, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-mono text-[10px]">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={pat.isActive}
                      onChange={() => handleTogglePattern(pat.id)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant"
                    />
                    <span>{pat.isActive ? 'فعال در سیستم' : 'غیرفعال'}</span>
                  </label>

                  <button
                    onClick={() => setEditingPattern(pat)}
                    className="px-3 py-1.5 rounded-xl border border-outline-variant hover:bg-surface-container text-xs font-bold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    <span>ویرایش الگو</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: PROVIDER SETTINGS */}
      {activeTab === 'provider' && (
        <form onSubmit={handleSaveProviderConfig} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-xs max-w-2xl space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-outline-variant/60">
            <span className="w-2.5 h-6 rounded-full bg-primary"></span>
            <h2 className="text-base font-bold text-on-surface">پیکربندی وب‌سرویس پیامکی</h2>
          </div>

          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface block">انتخاب سامانه پیامک پیش‌فرض</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'kavenegar', name: 'کاوه‌نگار (Kavenegar)', desc: 'وب‌سرویس لوک‌آپ آنی' },
                { id: 'melipayamak', name: 'ملی‌پیامک (MeliPayamak)', desc: 'پترن خدماتی وب‌سرویس' },
                { id: 'farazsms', name: 'فراز اس‌ام‌اس (FarazSMS)', desc: 'ارسال با خطوط خدماتی' },
              ].map((prov) => (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => setActiveProvider(prov.id as any)}
                  className={`p-3.5 rounded-xl border text-right transition ${
                    activeProvider === prov.id
                      ? 'border-primary bg-primary/5 text-primary shadow-xs'
                      : 'border-outline-variant bg-surface hover:border-primary/40'
                  }`}
                >
                  <span className="font-bold text-xs block text-on-surface">{prov.name}</span>
                  <span className="text-[10px] text-outline mt-1 block">{prov.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-1.5 text-xs">
            <label className="font-bold text-on-surface">کلید امنیتی API Key / Token</label>
            <input
              type="text"
              required
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono focus:outline-none focus:border-primary"
            />
          </div>

          {/* Sender Line */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-on-surface">شماره خط اختصاصی ارسال‌کننده</label>
              <input
                type="text"
                required
                value={senderLine}
                onChange={(e) => setSenderLine(e.target.value)}
                placeholder="20005006 یا 1000..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-on-surface">مکانیزم ارسال کدهای تایید (OTP)</label>
              <select
                value={otpMode}
                onChange={(e) => setOtpMode(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="lookup_pattern">الگوی خدماتی اختصاصی (بدون بلک‌لیست)</option>
                <option value="direct_sms">پیامک متنی معمولی (خطوط معمولی)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-end gap-3">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-container shadow transition active:scale-95"
            >
              ذخیره تنظیمات درگاه پیامک
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: SIMULATOR & TEST CONSOLE */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Simulator Form */}
          <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-outline-variant/60">
              <span className="w-2.5 h-6 rounded-full bg-primary"></span>
              <h2 className="text-base font-bold text-on-surface">کنسول شبیه‌ساز ارسال پیامک آزمایشی</h2>
            </div>

            <form onSubmit={handleSendTestSms} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-on-surface">شماره موبایل تست گیرنده *</label>
                <input
                  type="text"
                  required
                  placeholder="09123456789"
                  value={testMobile}
                  onChange={(e) => setTestMobile(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-on-surface">انتخاب الگوی تست</label>
                <select
                  value={selectedPatternCode}
                  onChange={(e) => setSelectedPatternCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-none focus:border-primary"
                >
                  {patterns.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.title} ({p.code})
                    </option>
                  ))}
                  <option value="custom">متن سفارشی دلخواه</option>
                </select>
              </div>

              {selectedPatternCode === 'custom' && (
                <div className="space-y-1.5">
                  <label className="font-bold text-on-surface">متن پیامک ارسالی</label>
                  <textarea
                    rows={3}
                    value={customTestMessage}
                    onChange={(e) => setCustomTestMessage(e.target.value)}
                    placeholder="متن دلخواه پیامک را بنویسید..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-none focus:border-primary leading-relaxed"
                  ></textarea>
                </div>
              )}

              <button
                type="submit"
                disabled={isSending}
                className="w-full py-3 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-container shadow transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">send</span>
                <span>{isSending ? 'در حال ارسال پیامک...' : 'ارسال آزمایشی پیامک'}</span>
              </button>
            </form>
          </div>

          {/* Smartphone Simulator */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-[280px] sm:w-[300px] h-[520px] rounded-[40px] border-8 border-gray-900 bg-gray-950 p-3 shadow-2xl relative flex flex-col justify-between">
              {/* Phone Speaker & Camera */}
              <div className="w-24 h-4 bg-gray-900 rounded-full mx-auto mb-2 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-gray-800 mr-2"></div>
                <div className="w-10 h-1 rounded-full bg-gray-800"></div>
              </div>

              {/* Phone Screen */}
              <div className="flex-1 bg-surface-container rounded-[26px] p-3 overflow-y-auto space-y-2 flex flex-col justify-end text-[11px]">
                <div className="text-center text-outline text-[10px] pb-1 font-mono">
                  پیامک‌ها • خط {senderLine}
                </div>

                {simulatedMobileScreen.length === 0 ? (
                  <div className="p-3 rounded-2xl bg-white text-gray-800 shadow-xs border border-gray-100 space-y-1">
                    <span className="text-[9px] text-gray-400 block font-mono">دیجی‌استایل • ۱۴۰۳/۰۲/۲۵</span>
                    <p className="leading-relaxed">
                      سهراب عزیز، سفارش شما با کد VST-94821 به مبلغ ۴,۶۸۹,۰۰۰ تومان با موفقیت ثبت شد.
                    </p>
                  </div>
                ) : (
                  simulatedMobileScreen.map((msg, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-2xl bg-white text-gray-800 shadow-sm border border-gray-100 space-y-1 animate-in fade-in slide-in-from-bottom-2"
                    >
                      <span className="text-[9px] text-primary block font-bold font-mono">دیجی‌استایل • لحظاتی پیش</span>
                      <p className="leading-relaxed whitespace-pre-line">{msg}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Home Indicator */}
              <div className="w-24 h-1 bg-gray-700 rounded-full mx-auto mt-2"></div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SENT LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-outline-variant/60 flex items-center justify-between">
            <h3 className="font-bold text-xs text-on-surface">آرشیو پیامک‌های ارسالی مخابرات</h3>
            <span className="text-[11px] text-outline font-mono">هزینه هر پیامک: ۱۴۰ تومان</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-surface-container-high text-on-surface font-bold border-b border-outline-variant">
                <tr>
                  <th className="p-3">گیرنده</th>
                  <th className="p-3">الگو</th>
                  <th className="p-3">متن پیامک</th>
                  <th className="p-3 text-center">وضعیت</th>
                  <th className="p-3 font-mono">شناسه رهگیری</th>
                  <th className="p-3 font-mono">زمان ارسال</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-container-low transition">
                    <td className="p-3 font-mono font-bold text-on-surface">{log.recipient}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-surface-container font-mono text-[10px] text-primary font-bold">
                        {log.patternCode}
                      </span>
                    </td>
                    <td className="p-3 max-w-sm truncate text-on-surface-variant" title={log.messageText}>
                      {log.messageText}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        تحویل به گوشی
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-outline">{log.traceCode}</td>
                    <td className="p-3 font-mono text-[11px] text-outline">{log.sentAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EDIT PATTERN MODAL */}
      {editingPattern && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-outline-variant space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <h3 className="font-bold text-sm text-on-surface">ویرایش الگوی پیامکی: {editingPattern.title}</h3>
              <button
                onClick={() => setEditingPattern(null)}
                className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-outline"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleSavePattern} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-on-surface">کد شناسه پترن (انگلیسی)</label>
                <input
                  type="text"
                  required
                  value={editingPattern.code}
                  onChange={(e) => setEditingPattern({ ...editingPattern, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-on-surface">متن قالب الگو</label>
                <textarea
                  required
                  rows={4}
                  value={editingPattern.templateText}
                  onChange={(e) => setEditingPattern({ ...editingPattern, templateText: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono leading-relaxed"
                ></textarea>
                <span className="text-[10px] text-outline">برای متغیرها از نمادهای {'{0}'}، {'{1}'} استفاده کنید.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setEditingPattern(null)}
                  className="px-4 py-2 rounded-xl text-outline hover:bg-surface-container"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-primary text-white font-bold hover:bg-primary-container shadow transition"
                >
                  ذخیره تغییرات الگو
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
