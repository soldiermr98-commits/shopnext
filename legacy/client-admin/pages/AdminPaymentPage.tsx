// ===== ADMIN PAYMENT GATEWAYS & SHAPARAK PAGE =====
// Configure Iranian bank payment gateways (Saman Kish SEP, Mellat, ZarinPal, Zibal), credentials, and live transaction ledger

import React, { useState } from 'react';
import { useToastStore } from '../../store/toastStore';
import { formatToman, toPersianDigits } from '../../lib/persian';

interface PaymentGatewayConfig {
  id: string;
  name: string;
  code: string;
  terminalId: string;
  merchantId: string;
  apiKeyMasked: string;
  ipgUrl: string;
  isDefault: boolean;
  isActive: boolean;
  sandboxMode: boolean;
  wageFee: string;
  logo: string;
}

interface ShaparakTransaction {
  id: string;
  orderNumber: string;
  customerName: string;
  gateway: string;
  amount: number;
  rrn: string;
  cardMask: string;
  status: 'successful' | 'failed' | 'reversed';
  date: string;
}

const INITIAL_GATEWAYS: PaymentGatewayConfig[] = [
  {
    id: 'gw-sep',
    name: 'پرداخت الکترونیک سامان کیش (SEP)',
    code: 'sep',
    terminalId: '84920118',
    merchantId: 'SEP-MER-94821',
    apiKeyMasked: 'SEP-SEC-••••-••••-9841',
    ipgUrl: 'https://sep.shaparak.ir/payment.aspx',
    isDefault: true,
    isActive: true,
    sandboxMode: false,
    wageFee: 'رایگان (طرح ویژه سازمانی)',
    logo: '💳',
  },
  {
    id: 'gw-mellat',
    name: 'به‌پرداخت ملت (BPM)',
    code: 'mellat',
    terminalId: '4901827',
    merchantId: 'MLT-77491',
    apiKeyMasked: 'MLT-SEC-••••-••••-1049',
    ipgUrl: 'https://bpm.shaparak.ir/pgwchannel/startpay.mellat',
    isDefault: false,
    isActive: true,
    sandboxMode: false,
    wageFee: '۰.۰۲٪ سهم شاپرک',
    logo: '🏦',
  },
  {
    id: 'gw-zarinpal',
    name: 'زرین‌پال (ZarinPal IPG)',
    code: 'zarinpal',
    terminalId: 'ZRP-00918',
    merchantId: 'd6b94821-4890-4821-b489-009481928401',
    apiKeyMasked: 'ZRP-KEY-••••-••••-8812',
    ipgUrl: 'https://payment.zarinpal.com/pg/StartPay/',
    isDefault: false,
    isActive: true,
    sandboxMode: false,
    wageFee: '۱٪ کارمزد شاپرک',
    logo: '🟡',
  },
  {
    id: 'gw-zibal',
    name: 'زیبال (Zibal Payment)',
    code: 'zibal',
    terminalId: 'ZBL-49102',
    merchantId: 'zibal-mer-8841',
    apiKeyMasked: 'ZBL-SEC-••••-••••-3391',
    ipgUrl: 'https://gateway.zibal.ir/start/',
    isDefault: false,
    isActive: false,
    sandboxMode: true,
    wageFee: '۱٪ کارمزد استاندارد',
    logo: '🔷',
  },
  {
    id: 'gw-wallet',
    name: 'کیف پول نقدی دیجی‌استایل',
    code: 'wallet',
    terminalId: 'DIGI-WALLET-INTERNAL',
    merchantId: 'INTERNAL-SETTLEMENT',
    apiKeyMasked: 'INTERNAL-SYSTEM-TOKEN',
    ipgUrl: 'داخلی (تسویه آنی بدون کارمزد)',
    isDefault: false,
    isActive: true,
    sandboxMode: false,
    wageFee: 'صفر کارمزد',
    logo: '👛',
  },
  {
    id: 'gw-cod',
    name: 'پرداخت در محل (Cash On Delivery)',
    code: 'cod',
    terminalId: 'COD-TEH-STANDARD',
    merchantId: 'COURIER-SETTLEMENT',
    apiKeyMasked: 'INTERNAL-POS-KEY',
    ipgUrl: 'دستگاه کارتخوان سیار پیک در محل تحویل',
    isDefault: false,
    isActive: true,
    sandboxMode: false,
    wageFee: 'پیک اکسپرس',
    logo: '📦',
  },
];

const INITIAL_TRANSACTIONS: ShaparakTransaction[] = [
  {
    id: 'tx-1',
    orderNumber: 'VST-94821',
    customerName: 'سهراب مظفری',
    gateway: 'سامان کیش (SEP)',
    amount: 4689000,
    rrn: '840192837192',
    cardMask: '۵۰۲۲-****-****-۷۸۲۱',
    status: 'successful',
    date: '۱۴۰۳/۰۲/۲۵ - ۱۵:۱۰',
  },
  {
    id: 'tx-2',
    orderNumber: 'VST-88210',
    customerName: 'سهراب مظفری',
    gateway: 'سامان کیش (SEP)',
    amount: 1850000,
    rrn: '840191029481',
    cardMask: '۶۰۳۷-****-****-۴۴۱۱',
    status: 'successful',
    date: '۱۴۰۳/۰۱/۱۲ - ۱۰:۳۰',
  },
  {
    id: 'tx-3',
    orderNumber: 'VST-85412',
    customerName: 'مریم رضایی',
    gateway: 'به‌پرداخت ملت',
    amount: 3200000,
    rrn: '839102948123',
    cardMask: '۶۱۰۴-****-****-۸۸۳۰',
    status: 'successful',
    date: '۱۴۰۳/۰۱/۰۵ - ۱۸:۴۵',
  },
  {
    id: 'tx-4',
    orderNumber: 'VST-81092',
    customerName: 'علی‌رضا محمدی',
    gateway: 'زرین‌پال',
    amount: 890000,
    rrn: '820194821034',
    cardMask: '۶۲۱۹-****-****-۲۳۰۱',
    status: 'successful',
    date: '۱۴۰۲/۱۲/۲۸ - ۱۲:۱۵',
  },
];

export const AdminPaymentPage: React.FC = () => {
  const { showToast } = useToastStore();
  const [activeTab, setActiveTab] = useState<'gateways' | 'transactions' | 'config'>('gateways');

  const [gateways, setGateways] = useState<PaymentGatewayConfig[]>(INITIAL_GATEWAYS);
  const [transactions] = useState<ShaparakTransaction[]>(INITIAL_TRANSACTIONS);
  const [editingGateway, setEditingGateway] = useState<PaymentGatewayConfig | null>(null);

  // Edit fields
  const [termId, setTermId] = useState('');
  const [merId, setMerId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [sandbox, setSandbox] = useState(false);

  // Toggle active
  const handleToggleActive = (id: string) => {
    setGateways(
      gateways.map((g) => (g.id === id ? { ...g, isActive: !g.isActive } : g))
    );
    showToast('وضعیت اتصال درگاه به‌روزرسانی شد.', 'info');
  };

  // Set default gateway
  const handleSetDefault = (id: string) => {
    setGateways(
      gateways.map((g) => ({
        ...g,
        isDefault: g.id === id,
      }))
    );
    showToast('درگاه پیش‌فرض شاپرک تغییر یافت.', 'success');
  };

  // Open Edit
  const openEdit = (gw: PaymentGatewayConfig) => {
    setEditingGateway(gw);
    setTermId(gw.terminalId);
    setMerId(gw.merchantId);
    setKeySecret(gw.apiKeyMasked);
    setSandbox(gw.sandboxMode);
  };

  // Save Gateway Config
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGateway) return;

    setGateways(
      gateways.map((g) =>
        g.id === editingGateway.id
          ? {
              ...g,
              terminalId: termId,
              merchantId: merId,
              apiKeyMasked: keySecret,
              sandboxMode: sandbox,
            }
          : g
      )
    );
    showToast(`پیکربندی درگاه «${editingGateway.name}» با موفقیت ذخیره شد.`, 'success');
    setEditingGateway(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-outline mb-1 font-mono">
            <span>پنل مدیریت</span>
            <span>/</span>
            <span className="text-primary font-bold">درگاه‌های پرداخت بانکی</span>
          </div>
          <h1 className="text-xl font-black text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">credit_card</span>
            <span>مدیریت درگاه‌های پرداخت بانکی و شبکه شاپرک</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <span>اتصال زنده شاپرک: پایدار (SSL ۲۵۶ بیتی)</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/60 pb-1 text-xs font-bold">
        <button
          onClick={() => setActiveTab('gateways')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 ${
            activeTab === 'gateways'
              ? 'bg-primary text-white shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-base">account_balance</span>
          <span>درگاه‌های فعال ({toPersianDigits(gateways.filter((g) => g.isActive).length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 ${
            activeTab === 'transactions'
              ? 'bg-primary text-white shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-base">receipt_long</span>
          <span>تراکنش‌های اخیر شاپرک ({toPersianDigits(transactions.length)})</span>
        </button>
      </div>

      {/* TAB 1: GATEWAYS GRID */}
      {activeTab === 'gateways' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gateways.map((gw) => (
            <div
              key={gw.id}
              className={`bg-surface-container-lowest rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 transition ${
                gw.isDefault
                  ? 'border-2 border-primary bg-primary/5'
                  : 'border border-outline-variant hover:border-primary/50'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{gw.logo}</span>
                    <div>
                      <h4 className="font-bold text-xs text-on-surface">{gw.name}</h4>
                      <span className="text-[10px] text-outline font-mono block">{gw.code}</span>
                    </div>
                  </div>

                  {gw.isDefault && (
                    <span className="px-2.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">
                      درگاه پیش‌فرض
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low/70 space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-outline">Terminal ID:</span>
                    <span className="font-bold text-on-surface">{gw.terminalId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-outline">Merchant ID:</span>
                    <span className="font-bold text-on-surface truncate max-w-[150px]">{gw.merchantId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-outline">کارمزد بانکی:</span>
                    <span className="text-on-surface">{gw.wageFee}</span>
                  </div>
                </div>

                {gw.sandboxMode && (
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                    حالت سندباکس تستی فعال است (بدون کسر وجه واقعی)
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={gw.isActive}
                    onChange={() => handleToggleActive(gw.id)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant"
                  />
                  <span>{gw.isActive ? 'فعال' : 'غیرفعال'}</span>
                </label>

                <div className="flex items-center gap-2">
                  {!gw.isDefault && gw.isActive && (
                    <button
                      onClick={() => handleSetDefault(gw.id)}
                      className="px-2.5 py-1 rounded-lg border border-outline-variant text-[11px] font-bold hover:bg-surface-container"
                    >
                      پیش‌فرض
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(gw)}
                    className="px-3 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-[11px] font-bold text-primary flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">tune</span>
                    <span>تنظیمات</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: TRANSACTIONS TABLE */}
      {activeTab === 'transactions' && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-outline-variant/60 flex items-center justify-between">
            <h3 className="font-bold text-xs text-on-surface">گزارش تراکنش‌های پرداختی تاییدشده شاپرک</h3>
            <span className="text-[11px] text-outline font-mono">تایید دو مرحله‌ای و وریفای توکن</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-surface-container-high text-on-surface font-bold border-b border-outline-variant">
                <tr>
                  <th className="p-3">شماره سفارش</th>
                  <th className="p-3">خریدار</th>
                  <th className="p-3">درگاه بانکی</th>
                  <th className="p-3 font-mono">مبلغ (تومان)</th>
                  <th className="p-3 font-mono">شماره پیگیری (RRN)</th>
                  <th className="p-3 font-mono">ماسک کارت</th>
                  <th className="p-3 text-center">وضعیت شاپرک</th>
                  <th className="p-3 font-mono">تاریخ پرداخت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-surface-container-low transition">
                    <td className="p-3 font-mono font-bold text-primary">{tx.orderNumber}</td>
                    <td className="p-3 text-on-surface">{tx.customerName}</td>
                    <td className="p-3 text-outline">{tx.gateway}</td>
                    <td className="p-3 font-mono font-bold text-on-surface">{formatToman(tx.amount)}</td>
                    <td className="p-3 font-mono text-[11px] text-outline">{tx.rrn}</td>
                    <td className="p-3 font-mono text-[11px] text-on-surface" dir="ltr">{tx.cardMask}</td>
                    <td className="p-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        موفقیت‌آمیز
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-outline">{tx.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EDIT GATEWAY MODAL */}
      {editingGateway && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <h3 className="font-bold text-sm text-on-surface">پیکربندی {editingGateway.name}</h3>
              <button
                onClick={() => setEditingGateway(null)}
                className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-outline"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-on-surface">کد ترمینال درگاه (Terminal ID) *</label>
                <input
                  type="text"
                  required
                  value={termId}
                  onChange={(e) => setTermId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-on-surface">شناسه پذیرنده مرچنت (Merchant Code) *</label>
                <input
                  type="text"
                  required
                  value={merId}
                  onChange={(e) => setMerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-on-surface">کلید امنیتی وب‌سرویس (API Key / Token)</label>
                <input
                  type="password"
                  value={keySecret}
                  onChange={(e) => setKeySecret(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-bold pt-1">
                <input
                  type="checkbox"
                  checked={sandbox}
                  onChange={(e) => setSandbox(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant"
                />
                <span>فعال‌سازی محیط آزمایشی سندباکس (Sandbox Testing)</span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setEditingGateway(null)}
                  className="px-4 py-2 rounded-xl text-outline hover:bg-surface-container"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary-container shadow transition"
                >
                  ذخیره اطلاعات درگاه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
