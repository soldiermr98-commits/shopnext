import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { toPersianDigits } from '../../lib/persian';

export const AuthModal: React.FC = () => {
  const { loginModalOpen, setLoginModalOpen, setUser } = useAuthStore();
  const { showToast } = useToastStore();

  const [mode, setMode] = useState<'password' | 'otp' | 'register'>('otp');
  const [phone, setPhone] = useState('09123456789');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!loginModalOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      showToast('لطفا شماره همراه خود را وارد کنید', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        showToast(data.message || 'کد تأیید ارسال شد', 'success');
        if (data.devCode) {
          setOtpCode(data.devCode);
        }
      } else {
        showToast(data.message || 'خطا در ارسال کد', 'error');
      }
    } catch {
      // Offline fallback
      setOtpSent(true);
      setOtpCode('12345');
      showToast('کد تأیید تست ۱۲۳۴۵ ارسال شد', 'success');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otpCode }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user, data.token);
        setLoginModalOpen(false);
        showToast(`خوش آمدید، ${data.user.name}`, 'success');
      } else {
        showToast(data.message || 'کد وارد شده نامعتبر است', 'error');
      }
    } catch {
      showToast('خطا در برقراری ارتباط با سرور', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: phone, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user, data.token);
        setLoginModalOpen(false);
        showToast(`خوش آمدید، ${data.user.name}`, 'success');
      } else {
        showToast(data.message || 'نام کاربری یا رمز عبور اشتباه است', 'error');
      }
    } catch {
      showToast('خطا در ورود به حساب', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user, data.token);
        setLoginModalOpen(false);
        showToast(`ثبت‌نام با موفقیت انجام شد. خوش آمدید، ${data.user.name}`, 'success');
      } else {
        showToast(data.message || 'خطا در ثبت نام', 'error');
      }
    } catch {
      showToast('خطا در ثبت نام کاربر جدید', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Demo Login Presets
  const setDemoUser = (type: 'admin' | 'customer') => {
    if (type === 'admin') {
      setMode('password');
      setPhone('admin');
      setPassword('change-me-123');
    } else {
      setMode('otp');
      setPhone('09123456789');
      setOtpSent(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/60 backdrop-blur-xs">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
        {/* Close Button */}
        <button
          onClick={() => setLoginModalOpen(false)}
          className="absolute top-4 left-4 p-1.5 text-outline hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors"
          title="بستن"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        {/* Modal Brand Title */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary text-on-primary mx-auto flex items-center justify-center font-bold text-2xl shadow-md mb-2">
            V
          </div>
          <h2 className="text-headline-md font-headline-md font-bold text-primary">ورود به دیجی‌استایل</h2>
          <p className="text-body-sm font-body-sm text-outline mt-1">
            برای دسترسی به سبد خرید، پیگیری سفارش‌ها و سوابق خرید وارد شوید
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-surface-container-low p-1 rounded-xl mb-6 text-label-md font-bold">
          <button
            onClick={() => {
              setMode('otp');
              setOtpSent(false);
            }}
            className={`py-2 rounded-lg transition-all ${
              mode === 'otp' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            ورود با پیامک (OTP)
          </button>
          <button
            onClick={() => setMode('password')}
            className={`py-2 rounded-lg transition-all ${
              mode === 'password' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            ورود با رمز عبور
          </button>
          <button
            onClick={() => setMode('register')}
            className={`py-2 rounded-lg transition-all ${
              mode === 'register' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            ثبت‌نام جدید
          </button>
        </div>

        {/* Tab 1: OTP Flow */}
        {mode === 'otp' && (
          <div>
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-label-md font-bold text-on-surface mb-1">
                    شماره تلفن همراه:
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09123456789"
                    className="w-full h-11 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface text-center font-mono font-bold text-base focus:ring-2 focus:ring-primary focus:outline-none"
                    required
                  />
                  <p className="text-xs text-outline mt-1">کد تأیید ۵ رقمی به این شماره ارسال خواهد شد.</p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-label-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? 'در حال ارسال...' : 'دریافت کد تأیید ورود'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl p-3 text-body-sm text-center">
                  کد تأیید به شماره <span className="font-mono font-bold">{toPersianDigits(phone)}</span> پیامک شد.
                </div>
                <div>
                  <label className="block text-label-md font-bold text-on-surface mb-1">
                    کد تأیید ۵ رقمی:
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="12345"
                    className="w-full h-12 px-3 rounded-xl border-2 border-primary bg-surface-container-low text-on-surface text-center font-mono font-black text-xl tracking-widest focus:ring-2 focus:ring-primary focus:outline-none"
                    maxLength={5}
                    required
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-outline">
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="text-primary hover:underline"
                  >
                    ویرایش شماره همراه
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="hover:underline"
                  >
                    ارسال مجدد کد
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-label-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? 'در حال بررسی...' : 'تأیید و ورود به حساب'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Password Flow */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-label-md font-bold text-on-surface mb-1">
                شماره همراه یا نام کاربری:
              </label>
              <input
                type="text"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09123456789 یا admin"
                className="w-full h-11 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-label-md font-bold text-on-surface mb-1">
                رمز عبور:
              </label>
              <input
                type="password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-label-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'در حال ورود...' : 'ورود با کلمه عبور'}
            </button>
          </form>
        )}

        {/* Tab 3: Register Flow */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-label-md font-bold text-on-surface mb-1">
                نام و نام خانوادگی:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: سهراب مظفری"
                className="w-full h-10 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-label-md font-bold text-on-surface mb-1">
                شماره تلفن همراه:
              </label>
              <input
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09123456789"
                className="w-full h-10 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-label-md font-bold text-on-surface mb-1">
                تعیین رمز عبور:
              </label>
              <input
                type="password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="حداقل ۶ کاراکتر"
                className="w-full h-10 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-label-lg transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {loading ? 'در حال ثبت‌نام...' : 'تکمیل ثبت‌نام و ورود'}
            </button>
          </form>
        )}

        {/* Quick Demo Credentials Assistant */}
        <div className="mt-6 pt-4 border-t border-outline-variant/60">
          <p className="text-[11px] text-outline text-center mb-2">ورود سریع برای تست سیستم و ارزیابی:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setDemoUser('customer')}
              className="p-2 rounded-lg border border-outline-variant hover:border-primary bg-surface-container-low text-on-surface text-center transition-colors"
            >
              👤 <strong className="text-primary">سهراب مظفری</strong> (مشتری)
            </button>
            <button
              type="button"
              onClick={() => setDemoUser('admin')}
              className="p-2 rounded-lg border border-outline-variant hover:border-primary bg-surface-container-low text-on-surface text-center transition-colors"
            >
              👑 <strong className="text-primary">مدیر ارشد</strong> (ادمین)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
