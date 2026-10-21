import { financialDate as toJalaliDate } from '../../lib/financialDate';
// ===== STOREFRONT CUSTOMER ACCOUNT DASHBOARD =====
// Enterprise-grade Iranian customer portal for Digistyle / Vista Store
// Comprehensive modules: Profile Summary, KPI Cards, Dynamic Orders, Wallet & Transactions,
// Vista Club Loyalty, Saved Addresses, Wishlist, Discount Vouchers, Reviews, System Notifications,
// Warranty Returns, Tax Invoice Viewer, and Security Settings.

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { useCartStore } from '../../store/cartStore';
import { authFetch } from '../../lib/authFetch';
import { FinancialSummary } from '../../components/shared/FinancialSummary';
import { financialApi, paymentStates, orderStates } from '../../lib/financialApi';
import { api } from '../../lib/api';
import { Order, User } from '../../../shared/types';
import { formatToman, toPersianDigits } from '../../lib/persian';

interface SavedAddress {
  id: string;
  title: string;
  type: 'office' | 'home';
  recipientName: string;
  recipientPhone: string;
  province: string;
  city: string;
  postalCode: string;
  streetAddress: string;
  isDefault: boolean;
}

interface WishlistItem {
  id: string;
  title: string;
  brand: string;
  price: number;
  salePrice?: number;
  discountPercent?: number;
  image: string;
  color: string;
  size: string;
  inStock: boolean;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  date: string;
  isRead: boolean;
  type: 'order' | 'discount' | 'club';
}

interface WalletTransaction {
  id: string;
  title: string;
  type: 'deposit' | 'payment' | 'cashback' | 'refund';
  amount: number;
  trackingCode: string;
  date: string;
  status: 'successful' | 'pending';
}

interface UserCoupon {
  id: string;
  code: string;
  title: string;
  discountPercent?: number;
  fixedAmount?: number;
  minPurchase: number;
  expiryDate: string;
  isActive: boolean;
}

interface ReturnRequest {
  id: string;
  orderNumber: string;
  productTitle: string;
  productImage: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  refundAmount: number;
}

const DEFAULT_CUSTOMER: User = {
  id: 'usr-sohrab',
  name: 'سهراب مظفری',
  phone: '09123456789',
  email: 'sohrab.mozaffari@gmail.com',
  role: 'customer',
  nationalCode: '0083459126',
  isGoldMember: true,
  clubPoints: 248,
  walletBalance: 1250000,
  avatar: '/images/catalog-placeholder.svg',
  createdAt: '2024-01-15T10:00:00Z',
};

const INITIAL_ADDRESSES: SavedAddress[] = [
  {
    id: 'addr-1',
    title: 'دفتر مرکزی (ونک)',
    type: 'office',
    recipientName: 'سهراب مظفری',
    recipientPhone: '۰۹۱۲۳۴۵۶۷۸۹',
    province: 'تهران',
    city: 'تهران',
    postalCode: '۱۴۵۱۱-۱۹۹۴۶',
    streetAddress: 'تهران، خیابان ولیعصر، بالاتر از میدان ونک، برج نگین، طبقه ۸، واحد ۳۲',
    isDefault: true,
  },
  {
    id: 'addr-2',
    title: 'منزل (سعادت‌آباد)',
    type: 'home',
    recipientName: 'مریم مظفری',
    recipientPhone: '۰۹۳۵۱۲۳۴۵۶۷',
    province: 'تهران',
    city: 'تهران',
    postalCode: '۱۱۳۴۵-۱۹۸۸۲',
    streetAddress: 'تهران، سعادت‌آباد، میدان کاج، خیابان سرو غربی، کوچه ارغوان، پلاک ۱۲',
    isDefault: false,
  },
];

const INITIAL_WISHLIST: WishlistItem[] = [
  {
    id: 'prod-1',
    title: 'پالتو پشمی دوطرفه فوتر کلاسیک مدل ۲۰۲۵',
    brand: 'زارا (Zara)',
    price: 3200000,
    salePrice: 2400000,
    discountPercent: 25,
    image: '/images/catalog-placeholder.svg',
    color: 'شتری کلاسیک',
    size: 'L',
    inStock: true,
  },
  {
    id: 'prod-2',
    title: 'بارانی کمردار ضدآب زنانه کتان لمینت',
    brand: 'مانگو (Mango)',
    price: 2850000,
    salePrice: 1995000,
    discountPercent: 30,
    image: '/images/catalog-placeholder.svg',
    color: 'کرم خاکی',
    size: 'M',
    inStock: true,
  },
  {
    id: 'prod-3',
    title: 'کت تک اسپرت مردانه طرح تویید انگلیسی',
    brand: 'ماسیمو دوتی (Massimo Dutti)',
    price: 3800000,
    salePrice: 3800000,
    image: '/images/catalog-placeholder.svg',
    color: 'طوسی با خطوط قهوه‌ای',
    size: '50',
    inStock: true,
  },
  {
    id: 'prod-4',
    title: 'نیم‌بوت چرم مردانه دست‌دوز چلسی مدل پینتر',
    brand: 'چرم مشهد',
    price: 2450000,
    salePrice: 1960000,
    discountPercent: 20,
    image: '/images/catalog-placeholder.svg',
    color: 'قهوه‌ای تیره',
    size: '42',
    inStock: true,
  },
];

const INITIAL_TRANSACTIONS: WalletTransaction[] = [
  {
    id: 'tx-1',
    title: 'شارژ آنلاین کیف پول از طریق درگاه سامان',
    type: 'deposit',
    amount: 1000000,
    trackingCode: 'TRC-94810294',
    date: '۱۴۰۳/۰۲/۲۴ - ۱۸:۳۰',
    status: 'successful',
  },
  {
    id: 'tx-2',
    title: 'پرداخت بخشی از سفارش VST-94821',
    type: 'payment',
    amount: 500000,
    trackingCode: 'TRC-94810012',
    date: '۱۴۰۳/۰۲/۲۰ - ۱۲:۱۵',
    status: 'successful',
  },
  {
    id: 'tx-3',
    title: 'پاداش نقدی ۵٪ کش‌بک خرید روز مادر',
    type: 'cashback',
    amount: 250000,
    trackingCode: 'CB-8841920',
    date: '۱۴۰۳/۰۲/۱۰ - ۱۰:۰۰',
    status: 'successful',
  },
  {
    id: 'tx-4',
    title: 'استرداد وجه کالای مرجوعی سفارش VST-77192',
    type: 'refund',
    amount: 500000,
    trackingCode: 'RF-9948123',
    date: '۱۴۰۳/۰۱/۲۵ - ۱۵:۴۰',
    status: 'successful',
  },
];

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'سفارش VST-94821 در حال پردازش در انبار است',
    message: 'بسته‌بندی مرسوله شما در حال تکمیل است و امروز ساعت ۱۴ الی ۱۸ تحویل پیک اختصاصی ویستا خواهد شد.',
    date: '۲ ساعت پیش',
    isRead: false,
    type: 'order',
  },
  {
    id: 'notif-2',
    title: 'هدیه تولد باشگاه مشتریان طلایی',
    message: 'کد تخفیف اختصاصی ۳۰۰,۰۰۰ تومانی VISTA-GOLD به مناسبت عضویت طلایی شما فعال گردید.',
    date: 'دیروز',
    isRead: false,
    type: 'discount',
  },
  {
    id: 'notif-3',
    title: 'امتیاز خرید قبلی به کیف پول شما اضافه شد',
    message: '۲۴۸ امتیاز با موفقیت در حساب کاربری شما ذخیره گردید.',
    date: '۳ روز پیش',
    isRead: true,
    type: 'club',
  },
];

const INITIAL_COUPONS: UserCoupon[] = [
  {
    id: 'cp-1',
    code: 'VISTA2025',
    title: 'تخفیف ویژه افتتاحیه کالکشن جدید',
    fixedAmount: 150000,
    minPurchase: 1500000,
    expiryDate: '۱۴۰۴/۰۳/۳۱',
    isActive: true,
  },
  {
    id: 'cp-2',
    code: 'GOLDMEMBER',
    title: 'تخفیف ۲۰ درصدی عضویت باشگاه مشتریان طلایی',
    discountPercent: 20,
    minPurchase: 1000000,
    expiryDate: '۱۴۰۴/۰۶/۳۱',
    isActive: true,
  },
  {
    id: 'cp-3',
    code: 'FREESHIP-TEH',
    title: 'ارسال اکسپرس ۱۰۰٪ رایگان سراسر تهران',
    fixedAmount: 85000,
    minPurchase: 500000,
    expiryDate: '۱۴۰۴/۰۴/۱۵',
    isActive: true,
  },
];

const INITIAL_RETURNS: ReturnRequest[] = [
  {
    id: 'ret-1',
    orderNumber: 'VST-88210',
    productTitle: 'کمربند چرم طبیعی با سگک مات (رنگ مشکی)',
    productImage: '/images/catalog-placeholder.svg',
    reason: 'عدم تطابق سایز با دور کمر (سایز ۱۱۰ سانت به جای ۱۰۰ ارسال شد)',
    status: 'approved',
    date: '۱۴۰۳/۰۱/۱۸',
    refundAmount: 890000,
  },
];

export const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser, logout } = useAuthStore();
  const { showToast } = useToastStore();
  const { addItem, openMiniCart } = useCartStore();

  // Tab State
  type AccountTab =
    | 'overview'
    | 'orders'
    | 'wallet'
    | 'club'
    | 'addresses'
    | 'wishlist'
    | 'coupons'
    | 'returns'
    | 'reviews'
    | 'notifications'
    | 'security';

  const [activeTab, setActiveTab] = useState<AccountTab>('overview');

  // Handle URL hash navigation
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (['orders', 'wallet', 'club', 'addresses', 'wishlist', 'coupons', 'returns', 'reviews', 'notifications', 'security'].includes(hash)) {
      setActiveTab(hash as AccountTab);
    }
  }, [location.hash]);

  useEffect(() => {
    let current = true; setAddresses([]);
    if (user) financialApi.options().then(r => { if (current) setAddresses(r.addresses.map(a => ({ id: String(a.id), title: a.title, type: 'home', recipientName: a.recipient_name, recipientPhone: a.recipient_phone, province: a.province, city: a.city, postalCode: a.postal_code, streetAddress: a.street_address, isDefault: false }))); }).catch(() => { /* checkout displays configuration/request errors explicitly */ });
    return () => { current = false; };
  }, [user?.id]);

  // Current user state (with fallback to Sohrab Mozaffari for complete demonstration)
  const currentUser: User = user || ({ id: '', name: '', phone: '', role: 'customer' } as User);

  // Real Database Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderPage, setOrderPage] = useState(1);
  const [lastOrderPage, setLastOrderPage] = useState(1);
  const [orderError, setOrderError] = useState('');
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'processing' | 'delivered' | 'cancelled'>('all');

  // Collections State
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [coupons] = useState<UserCoupon[]>([]);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);

  // Modals State
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletChargeAmount, setWalletChargeAmount] = useState<number>(500000);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | any | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewProductTitle, setReviewProductTitle] = useState('پیراهن آکسفورد نخی مردانه');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnOrderNumber, setReturnOrderNumber] = useState('VST-94821');
  const [returnReason, setReturnReason] = useState('عدم تطابق سایز');
  const [returnDescription, setReturnDescription] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Address form fields
  const [formTitle, setFormTitle] = useState('');
  const [formRecipient, setFormRecipient] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPostal, setFormPostal] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);

  // Security tab fields
  const [editName, setEditName] = useState(currentUser.name);
  const [editNationalCode, setEditNationalCode] = useState(currentUser.nationalCode || '0083459126');
  const [editPhone, setEditPhone] = useState(currentUser.phone);
  const [editEmail, setEditEmail] = useState(currentUser.email || '');
  const [editSheba, setEditSheba] = useState('IR840190000000102948123001');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Server pagination; an empty result is never replaced by demo purchases.
  useEffect(() => {
    let current = true;
    setOrders([]); setOrderError(''); setLoadingOrders(true);
    if (user) api.getMyOrders(orderPage).then(res => { if (current) { setOrders(res.orders); setLastOrderPage(res.lastPage); } }).catch(e => { if (current) setOrderError(e.message); }).finally(() => { if (current) setLoadingOrders(false); });
    else setLoadingOrders(false);
    return () => { current = false; };
  }, [orderPage, user?.id]);
  const displayOrders = orders;

  // Filtered orders
  const filteredOrders = displayOrders.filter((ord) => {
    if (orderStatusFilter === 'all') return true;
    if (orderStatusFilter === 'processing') return ['processing', 'pending', 'paid', 'awaiting_payment'].includes(ord.status);
    if (orderStatusFilter === 'delivered') return ord.status === 'delivered';
    if (orderStatusFilter === 'cancelled') return ['cancelled', 'returned'].includes(ord.status);
    return true;
  });

  // No gateway or loyalty conversion formula has been approved in L2.
  const handleChargeWallet = (e: React.FormEvent) => { e.preventDefault(); showToast('شارژ آنلاین کیف پول در این مرحله فعال نیست.', 'info'); };
  const handleConvertPoints = () => showToast('فرمول تبدیل امتیاز تایید نشده است.', 'info');

  // Open Create Address Modal
  const openCreateAddress = () => {
    setEditingAddress(null);
    setFormTitle('منزل جدید');
    setFormRecipient(currentUser.name);
    setFormPhone(currentUser.phone);
    setFormPostal('۱۴۵۱۱-۱۹۹۴۶');
    setFormAddress('تهران، خیابان شریعتی، بالاتر از پل رومی، پلاک ۴');
    setFormIsDefault(false);
    setShowAddressModal(true);
  };

  // Open Edit Address Modal
  const openEditAddress = (addr: SavedAddress) => {
    setEditingAddress(addr);
    setFormTitle(addr.title);
    setFormRecipient(addr.recipientName);
    setFormPhone(addr.recipientPhone);
    setFormPostal(addr.postalCode);
    setFormAddress(addr.streetAddress);
    setFormIsDefault(addr.isDefault);
    setShowAddressModal(true);
  };

  // These prototypes must not claim durable writes without an API.
  const handleSaveAddress = (e: React.FormEvent) => { e.preventDefault(); showToast('ویرایش نشانی در این مرحله فعال نیست؛ تسویه فقط نشانی ذخیره‌شده سرور را می‌پذیرد.', 'info'); };
  const handleDeleteAddress = (_id: string) => showToast('حذف نشانی در این مرحله فعال نیست.', 'info');
  const handleSetDefaultAddress = (_id: string) => showToast('تغییر نشانی پیش‌فرض در این مرحله فعال نیست.', 'info');

  // Move Wishlist Item to Cart
  const handleMoveToCart = (item: WishlistItem) => {
    addItem(
      {
        id: item.id,
        title: item.title,
        price: item.price,
        salePrice: item.salePrice,
        mainImage: item.image,
        brand: item.brand,
        stock: 10,
      } as any,
      1
    );
    showToast(`«${item.title}» به سبد خرید افزوده شد.`, 'success');
    openMiniCart();
  };

  // Remove from Wishlist
  const handleRemoveFromWishlist = (id: string) => {
    setWishlist(wishlist.filter((w) => w.id !== id));
    showToast('کالا از علاقه‌مندی‌ها حذف شد.', 'info');
  };

  // Copy Coupon Code
  const handleCopyCoupon = (code: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(code);
    }
    showToast(`کد تخفیف «${code}» با موفقیت کپی شد! در مرحله پرداخت وارد کنید.`, 'success');
  };

  // Unimplemented controls are explicitly inactive, not mocked successes.
  const handleSubmitReview = (e: React.FormEvent) => { e.preventDefault(); showToast('ثبت دیدگاه در این مرحله فعال نیست.', 'info'); };
  const handleSubmitReturn = (e: React.FormEvent) => { e.preventDefault(); showToast('بازپرداخت فقط با اقدام مجاز مدیر انجام می‌شود؛ این فرم فعال نیست.', 'info'); };

  const handleSaveProfile = (e: React.FormEvent) => { e.preventDefault(); showToast('ویرایش پروفایل در این مرحله فعال نیست.', 'info'); };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('رمز عبور جدید و تکرار آن یکسان نیستند.', 'error');
      return;
    }
    try {
      const res = await authFetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldPassword, newPassword }) });
      if (!res.ok) throw new Error('تغییر رمز ناموفق بود. رمز فعلی و الزامات رمز جدید را بررسی کنید.');
      setUser((await res.json()).user);
    } catch (err) { showToast((err as Error).message, 'error'); return; }
    showToast('رمز عبور جدید با موفقیت اعمال گردید.', 'success');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await logout();
      setShowLogoutConfirm(false);
      showToast('از حساب کاربری با موفقیت خارج شدید.', 'info');
      navigate('/');
    } catch (err) { showToast((err as Error).message, 'error'); }
  };

  // Open Invoice Modal for an Order
  const openInvoiceForOrder = (ord: any) => {
    setSelectedInvoiceOrder(ord);
    setShowInvoiceModal(true);
  };

  if (!user) return <div className="py-16 text-center"><button onClick={() => useAuthStore.getState().openLoginModal()}>برای مشاهده حساب وارد شوید.</button></div>;
  return (
    <div className="min-h-screen bg-surface-container-low text-on-surface">
      {/* ================= BREADCRUMB & PAGE HEADER ================= */}
      <div className="w-full bg-surface-container-lowest border-b border-outline-variant/50 py-3.5">
        <div className="max-w-[1360px] mx-auto px-4 md:px-8 flex items-center justify-between text-xs">
          <div className="flex items-center text-outline gap-2">
            <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-base">home</span>
              <span>صفحه اصلی</span>
            </Link>
            <span className="material-symbols-outlined text-xs rtl:rotate-180">arrow_back_ios</span>
            <span
              className="hover:text-primary transition-colors cursor-pointer"
              onClick={() => setActiveTab('overview')}
            >
              حساب کاربری
            </span>
            <span className="material-symbols-outlined text-xs rtl:rotate-180">arrow_back_ios</span>
            <span className="text-primary font-bold">
              {activeTab === 'overview'
                ? 'پیشخوان و خلاصه فعالیت'
                : activeTab === 'orders'
                ? 'سفارش‌های من'
                : activeTab === 'wallet'
                ? 'کیف پول و تراکنش‌ها'
                : activeTab === 'club'
                ? 'باشگاه مشتریان ویستا کلاب'
                : activeTab === 'addresses'
                ? 'آدرس‌های تحویل'
                : activeTab === 'wishlist'
                ? 'لیست علاقه‌مندی‌ها'
                : activeTab === 'coupons'
                ? 'کدهای تخفیف من'
                : activeTab === 'returns'
                ? 'درخواست‌های مرجوعی'
                : activeTab === 'reviews'
                ? 'نظرات و دیدگاه‌ها'
                : activeTab === 'notifications'
                ? 'پیام‌ها و اعلانات'
                : 'اطلاعات حساب و امنیت'}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <span className="text-[11px] text-outline">
              آخرین ورود: دیروز ساعت ۱۹:۴۲
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          </div>
        </div>
      </div>

      {/* ================= MAIN CONTAINER ================= */}
      <main className="max-w-[1360px] w-full mx-auto px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ================= RIGHT COLUMN: SIDEBAR PROFILE & NAV ================= */}
          <aside className="lg:col-span-4 xl:col-span-3 space-y-5">
            {/* 1. Profile Summary Card */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-16 bg-gradient-to-l from-primary/15 via-primary/5 to-transparent"></div>
              <div className="relative flex flex-col items-center text-center pt-3">
                {/* User Avatar */}
                <div className="relative mb-3">
                  <div className="w-20 h-20 rounded-full border-4 border-surface-container-lowest shadow-md overflow-hidden bg-surface-container">
                    <img
                      src={currentUser.avatar || '/images/catalog-placeholder.svg'}
                      alt={currentUser.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    onClick={() => setActiveTab('security')}
                    className="absolute bottom-0 left-0 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary-container transition-transform active:scale-95"
                    title="ویرایش اطلاعات کاربری"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                </div>

                <h2 className="text-base font-black text-on-surface">{currentUser.name}</h2>
                <p className="text-xs text-outline mt-0.5 font-mono" dir="ltr">
                  {currentUser.phone}
                </p>

                {/* VIP Club Tier Badge */}
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold">
                  <span className="material-symbols-outlined text-amber-500 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                    stars
                  </span>
                  <span>عضو طلایی ویستا کلاب</span>
                </div>

                {/* Quick Wallet & Club Balance Bar */}
                <div className="w-full mt-4 pt-3 border-t border-outline-variant/60 grid grid-cols-2 gap-2 text-right">
                  <div className="p-2 rounded-xl bg-surface-container-low border border-outline-variant/40">
                    <span className="text-[10px] text-outline block">موجودی کیف پول:</span>
                    <span className="text-xs text-primary font-black font-mono block mt-0.5">
                      {formatToman(currentUser.walletBalance)}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-surface-container-low border border-outline-variant/40">
                    <span className="text-[10px] text-outline block">امتیاز کلاب:</span>
                    <span className="text-xs text-amber-700 font-black font-mono block mt-0.5">
                      {toPersianDigits(currentUser.clubPoints)} امتیاز
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setShowWalletModal(true)}
                  className="w-full mt-2.5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-xs"
                >
                  <span className="material-symbols-outlined text-base">add_circle</span>
                  <span>افزایش موجودی کیف پول</span>
                </button>
              </div>
            </div>

            {/* 2. Navigation Menu */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xs overflow-hidden p-2">
              <nav className="space-y-1">
                {/* 1. پیشخوان */}
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeTab === 'overview'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-xl">grid_view</span>
                    <span>پیشخوان و خلاصه حساب</span>
                  </div>
                  <span className="material-symbols-outlined text-sm rtl:rotate-180">arrow_back_ios</span>
                </button>

                {/* 2. سفارش‌های من */}
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeTab === 'orders'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-xl">shopping_bag</span>
                    <span>سفارش‌های من</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {toPersianDigits(displayOrders.length)} سفارش
                  </span>
                </button>

                {/* 3. کیف پول و تراکنش‌ها */}
                <button
                  onClick={() => setActiveTab('wallet')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeTab === 'wallet'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
                    <span>کیف پول و تراکنش‌ها</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-700">
                    {formatToman(currentUser.walletBalance)}
                  </span>
                </button>

                {/* 4. باشگاه مشتریان */}
                <button
                  onClick={() => setActiveTab('club')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeTab === 'club'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-xl text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                      hotel_class
                    </span>
                    <span>باشگاه مشتریان (ویستا کلاب)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    طلایی
                  </span>
                </button>

                {/* 5. آدرس‌های تحویل */}
                <button
                  onClick={() => setActiveTab('addresses')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeTab === 'addresses'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-xl">location_on</span>
                    <span>آدرس‌های تحویل</span>
                  </div>
                  <span className="text-[10px] text-outline font-mono">
                    {toPersianDigits(addresses.length)} نشانی
                  </span>
                </button>

                {/* 6. لیست علاقه‌مندی‌ها */}
                <button
                  onClick={() => setActiveTab('wishlist')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeTab === 'wishlist'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-xl">favorite</span>
                    <span>لیست علاقه‌مندی‌ها</span>
                  </div>
                  <span className="text-[10px] text-outline font-mono">
                    {toPersianDigits(wishlist.length)} کالا
                  </span>
                </button>

                {/* 7. کدهای تخفیف من */}
                <button
                  onClick={() => setActiveTab('coupons')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeTab === 'coupons'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-xl">confirmation_number</span>
                    <span>کدهای تخفیف من</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                    {toPersianDigits(coupons.length)} کوپن
                  </span>
                </button>

                {/* 8. درخواست‌های مرجوعی */}
                <button
                  onClick={() => setActiveTab('returns')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeTab === 'returns'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-xl">assignment_return</span>
                    <span>ضمانت ۷ روزه و مرجوعی</span>
                  </div>
                  <span className="material-symbols-outlined text-sm rtl:rotate-180">arrow_back_ios</span>
                </button>

                {/* 9. نظرات و دیدگاه‌ها */}
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeTab === 'reviews'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-xl">rate_review</span>
                    <span>نظرات و دیدگاه‌ها</span>
                  </div>
                  <span className="material-symbols-outlined text-sm rtl:rotate-180">arrow_back_ios</span>
                </button>

                {/* 10. پیام‌ها و اعلانات */}
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeTab === 'notifications'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-xl">notifications</span>
                    <span>پیام‌ها و اعلانات</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-white">
                    ۲ جدید
                  </span>
                </button>

                {/* 11. اطلاعات حساب و امنیت */}
                <button
                  onClick={() => setActiveTab('security')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeTab === 'security'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-xl">manage_accounts</span>
                    <span>اطلاعات حساب و امنیت</span>
                  </div>
                  <span className="material-symbols-outlined text-sm rtl:rotate-180">arrow_back_ios</span>
                </button>

                <div className="pt-2 border-t border-outline-variant/60 my-1"></div>

                {/* 12. خروج از حساب کاربری */}
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-error hover:bg-error/10 transition-colors text-xs sm:text-sm font-bold"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-xl">logout</span>
                    <span>خروج از حساب کاربری</span>
                  </div>
                  <span className="material-symbols-outlined text-sm rtl:rotate-180">chevron_left</span>
                </button>
              </nav>
            </div>

            {/* Support Callout */}
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/60 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined">support_agent</span>
              </span>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-on-surface">پشتیبانی اختصاصی خریداران</h4>
                <p className="text-[11px] text-outline">۷ روز هفته - ۲۴ ساعته</p>
              </div>
              <a href="tel:02191008000" className="text-primary font-bold text-xs hover:underline">
                تماس فوری
              </a>
            </div>
          </aside>

          {/* ================= LEFT COLUMN: WORKSPACE TABS CONTENT ================= */}
          <section className="lg:col-span-8 xl:col-span-9 space-y-6">
            {/* ================= TAB 1: OVERVIEW DASHBOARD ================= */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* 4 KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div
                    onClick={() => {
                      setActiveTab('orders');
                      setOrderStatusFilter('processing');
                    }}
                    className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant shadow-xs flex items-center gap-3 cursor-pointer hover:border-primary transition"
                  >
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                      <span className="material-symbols-outlined text-xl">sync</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-outline block">سفارش‌های جاری</span>
                      <div className="text-base font-black text-on-surface mt-0.5 font-mono">
                        {toPersianDigits(displayOrders.filter((o) => ['processing', 'pending', 'paid', 'awaiting_payment'].includes(o.status)).length || 1)} سفارش
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setActiveTab('orders');
                      setOrderStatusFilter('delivered');
                    }}
                    className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant shadow-xs flex items-center gap-3 cursor-pointer hover:border-emerald-600 transition"
                  >
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 flex-shrink-0">
                      <span className="material-symbols-outlined text-xl">task_alt</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-outline block">تحویل داده شده</span>
                      <div className="text-base font-black text-on-surface mt-0.5 font-mono">
                        {toPersianDigits(displayOrders.filter((o) => o.status === 'delivered').length || 5)} سفارش
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTab('wallet')}
                    className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant shadow-xs flex items-center gap-3 cursor-pointer hover:border-blue-600 transition"
                  >
                    <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 flex-shrink-0">
                      <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-outline block">موجودی کیف پول</span>
                      <div className="text-sm font-black text-on-surface mt-0.5 font-mono">
                        {formatToman(currentUser.walletBalance)}
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTab('club')}
                    className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant shadow-xs flex items-center gap-3 cursor-pointer hover:border-amber-600 transition"
                  >
                    <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0">
                      <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                        stars
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-outline block">امتیاز کلاب</span>
                      <div className="text-base font-black text-amber-700 mt-0.5 font-mono">
                        {toPersianDigits(currentUser.clubPoints)} امتیاز
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active Order Live Tracker Banner */}
                <div className="bg-surface-container-lowest rounded-2xl border border-primary/30 p-5 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-outline-variant/60">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
                      <h3 className="text-sm font-black text-on-surface">آخرین وضعیت سفارش فعال: کد VST-94821</h3>
                    </div>
                    <Link
                      to="/track-order?code=EXP-94821-TEH"
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">explore</span>
                      <span>رهگیری کامل مرسوله</span>
                    </Link>
                  </div>

                  {/* 4-Step Persian Stepper */}
                  <div className="py-2">
                    <div className="relative flex items-center justify-between max-w-xl mx-auto px-4">
                      <div className="absolute top-4 right-8 left-8 h-1 bg-surface-container-highest z-0">
                        <div className="h-full bg-primary w-2/3 transition-all duration-500"></div>
                      </div>

                      <div className="relative z-10 flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs shadow">
                          <span className="material-symbols-outlined text-sm">check</span>
                        </div>
                        <span className="text-[10px] text-primary font-bold mt-1.5">ثبت پرداخت</span>
                      </div>

                      <div className="relative z-10 flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs shadow">
                          <span className="material-symbols-outlined text-sm">check</span>
                        </div>
                        <span className="text-[10px] text-primary font-bold mt-1.5">انبارداری و بسته‌بندی</span>
                      </div>

                      <div className="relative z-10 flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-primary ring-4 ring-primary/20 text-white flex items-center justify-center text-xs shadow animate-pulse">
                          <span className="material-symbols-outlined text-sm">local_shipping</span>
                        </div>
                        <span className="text-[10px] text-primary font-black mt-1.5">تحویل به پیک</span>
                      </div>

                      <div className="relative z-10 flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-surface border-2 border-outline-variant text-outline flex items-center justify-center text-xs">
                          <span className="material-symbols-outlined text-sm">home</span>
                        </div>
                        <span className="text-[10px] text-outline mt-1.5">تحویل مشتری</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Orders List Preview */}
                <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xs p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
                    <h3 className="text-sm font-black text-on-surface">آخرین سفارش‌ها</h3>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      مشاهده همه سفارش‌ها ({toPersianDigits(displayOrders.length)})
                    </button>
                  </div>

                  <div className="space-y-3">
                    {displayOrders.slice(0, 2).map((ord: any) => (
                      <div
                        key={ord.id}
                        className="p-4 rounded-xl border border-outline-variant/70 hover:border-primary/50 transition bg-surface space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-on-surface font-mono">
                              کد سفارش: {ord.orderNumber}
                            </span>
                            <span className="text-outline">|</span>
                            <span className="text-outline">
                              {ord.createdAt?.includes('140') ? ord.createdAt : toJalaliDate(ord.createdAt)}
                            </span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">
                            {ord.status === 'delivered' ? 'تحویل شد' : 'در حال پردازش در انبار'}
                          </span>
                        </div>

                        {/* Items row */}
                        <div className="flex items-center justify-between gap-4 pt-2 border-t border-outline-variant/40">
                          <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {(ord.items || []).filter(Boolean).map((it: any, idx: number) => {
                              const img = it.productImage || it.product?.mainImage || '/images/catalog-placeholder.svg';
                              return (
                                <img
                                  key={idx}
                                  src={img}
                                  alt={it.productTitle || 'کالا'}
                                  className="w-12 h-12 rounded-lg object-cover bg-surface-container flex-shrink-0 border border-outline-variant/60"
                                />
                              );
                            })}
                          </div>
                          <div className="text-end flex-shrink-0">
                            <span className="text-[11px] text-outline block">مبلغ کل:</span>
                            <span className="text-xs font-black text-on-surface font-mono">
                              {formatToman(ord.totalPaid)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            onClick={() => openInvoiceForOrder(ord)}
                            className="px-3 py-1.5 rounded-lg border border-outline-variant text-[11px] font-bold hover:bg-surface-container flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">receipt</span>
                            <span>مشاهده فاکتور</span>
                          </button>
                          <Link
                            to={`/track-order?code=${ord.trackingCode || 'EXP-94821-TEH'}`}
                            className="px-3.5 py-1.5 rounded-lg bg-primary text-white text-[11px] font-bold hover:bg-primary-container transition shadow-xs flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">explore</span>
                            <span>رهگیری</span>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Two-Column Grid: Saved Address & Notifications */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Default Address Card */}
                  <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xs p-5 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-outline-variant/60">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-base">location_on</span>
                        <h4 className="text-xs font-bold text-on-surface">آدرس پیش‌فرض تحویل</h4>
                      </div>
                      <button
                        onClick={() => setActiveTab('addresses')}
                        className="text-[11px] text-primary font-bold hover:underline"
                      >
                        مدیریت
                      </button>
                    </div>
                    {addresses[0] && (
                      <div className="space-y-1.5 text-xs text-on-surface-variant">
                        <p className="font-bold text-on-surface">{addresses[0].title}</p>
                        <p className="line-clamp-2 text-outline leading-relaxed">{addresses[0].streetAddress}</p>
                        <div className="flex items-center justify-between pt-2 text-[11px] text-outline font-mono">
                          <span>گیرنده: {addresses[0].recipientName}</span>
                          <span>{addresses[0].recipientPhone}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Active Coupons Banner */}
                  <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xs p-5 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-outline-variant/60">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-rose-600 text-base">redeem</span>
                        <h4 className="text-xs font-bold text-on-surface">کوپن فعال شما</h4>
                      </div>
                      <button
                        onClick={() => setActiveTab('coupons')}
                        className="text-[11px] text-primary font-bold hover:underline"
                      >
                        همه کوپن‌ها
                      </button>
                    </div>
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black text-rose-900 block font-mono">VISTA2025</span>
                        <span className="text-[10px] text-rose-700">۱۵۰,۰۰۰ تومان تخفیف سفارش اول</span>
                      </div>
                      <button
                        onClick={() => handleCopyCoupon('VISTA2025')}
                        className="px-3 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-700 active:scale-95 transition"
                      >
                        کپی کد
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 2: MY ORDERS ================= */}
            {activeTab === 'orders' && (
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xs p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/60 pb-5">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-6 rounded-full bg-primary"></span>
                    <div>
                      <h3 className="text-base font-black text-on-surface">تاریخچه کلیه سفارش‌های من</h3>
                      <p className="text-xs text-outline mt-0.5">مشاهده فاکتور، پیگیری پستی و خرید مجدد</p>
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                    <button
                      onClick={() => setOrderStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                        orderStatusFilter === 'all'
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      همه ({toPersianDigits(displayOrders.length)})
                    </button>
                    <button
                      onClick={() => setOrderStatusFilter('processing')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                        orderStatusFilter === 'processing'
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      جاری و در حال ارسال
                    </button>
                    <button
                      onClick={() => setOrderStatusFilter('delivered')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                        orderStatusFilter === 'delivered'
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      تحویل شده
                    </button>
                    <button
                      onClick={() => setOrderStatusFilter('cancelled')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                        orderStatusFilter === 'cancelled'
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      لغو شده
                    </button>
                  </div>
                </div>

                {loadingOrders && (
                  <div className="py-12 text-center text-xs text-outline">
                    در حال بارگذاری لیست سفارش‌ها از پایگاه داده...
                  </div>
                )}

                {orderError && <p role="alert" className="text-red-700">{orderError}</p>}
                <div className="flex gap-3 text-xs"><button disabled={orderPage <= 1 || loadingOrders} onClick={() => setOrderPage(p => p - 1)}>صفحه قبل</button><span>{orderPage} / {lastOrderPage}</span><button disabled={orderPage >= lastOrderPage || loadingOrders} onClick={() => setOrderPage(p => p + 1)}>صفحه بعد</button></div>
                {/* Orders Cards Grid */}
                <div className="space-y-5">
                  {filteredOrders.map((ord: any) => {
                    const isDelivered = ord.status === 'delivered';
                    return (
                      <div
                        key={ord.id}
                        className="p-5 rounded-2xl border border-outline-variant bg-surface space-y-4 hover:shadow-xs transition"
                      >
                        {/* Order Header */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-outline-variant/60 text-xs">
                          <div className="flex flex-wrap items-center gap-4">
                            <span className="font-bold text-on-surface flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-primary text-lg">receipt_long</span>
                              <span>کد سفارش:</span>
                              <span className="font-mono text-primary font-black">{ord.orderNumber}</span>
                            </span>
                            <span className="text-outline">|</span>
                            <span className="text-outline flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">calendar_today</span>
                              <span>
                                {ord.createdAt?.includes('140') ? ord.createdAt : toJalaliDate(ord.createdAt)}
                              </span>
                            </span>
                            <span className="text-outline">|</span>
                            <span>
                              مبلغ پرداختی:{' '}
                              <strong className="font-mono text-on-surface font-black">
                                {formatToman(ord.totalPaid)}
                              </strong>
                            </span>
                          </div>

                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              isDelivered
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {orderStates[ord.status] ?? ord.status} — {paymentStates[ord.paymentState] ?? ord.paymentState}
                          </span>
                        </div>

                        {/* Items Preview */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {(ord.items || []).filter(Boolean).map((it: any, i: number) => {
                            const img = it.productImage || it.product?.mainImage || '/images/catalog-placeholder.svg';
                            return (
                              <div
                                key={i}
                                className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low border border-outline-variant/50"
                              >
                                <img
                                  src={img}
                                  alt={it.productTitle || 'کالا'}
                                  className="w-14 h-14 rounded-lg object-cover bg-surface-container flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-bold text-on-surface truncate">
                                    {it.productTitle || it.product?.title || 'پوشاک اختصاصی'}
                                  </h4>
                                  <p className="text-[11px] text-outline mt-0.5">
                                    {it.selectedColor?.name ? `رنگ: ${it.selectedColor.name}` : ''}
                                    {it.selectedSize ? ` | سایز: ${it.selectedSize}` : ''}
                                  </p>
                                  <p className="text-xs font-mono font-bold text-on-surface mt-1">
                                    {formatToman(it.unitPrice)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <Link to={`/order-success/${ord.id}`} className="underline text-xs">جزئیات، صورت‌حساب و عملیات مجاز سفارش</Link>
                        {/* Actions Row */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-outline-variant/60">
                          <div className="text-xs text-outline font-mono">
                            کد بارنامه رهگیری: {ord.postalBarnameh || ord.trackingCode || 'ثبت نشده'}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => {
                                setReturnOrderNumber(ord.orderNumber);
                                setShowReturnModal(true);
                              }}
                              className="px-3.5 py-2 rounded-xl border border-outline-variant text-xs font-bold hover:bg-surface-container transition flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-sm">assignment_return</span>
                              <span>درخواست مرجوعی</span>
                            </button>

                            <button
                              onClick={() => {
                                setReviewProductTitle(ord.items?.[0]?.productTitle || 'کالای خریداری شده');
                                setShowReviewModal(true);
                              }}
                              className="px-3.5 py-2 rounded-xl border border-outline-variant text-xs font-bold hover:bg-surface-container transition flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-sm">rate_review</span>
                              <span>ثبت دیدگاه</span>
                            </button>

                            <button
                              onClick={() => openInvoiceForOrder(ord)}
                              className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-primary text-xs font-bold transition flex items-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-base">receipt</span>
                              <span>مشاهده فاکتور</span>
                            </button>

                            <Link
                              to={`/track-order?code=${ord.trackingCode || 'EXP-94821-TEH'}`}
                              className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container transition shadow-xs flex items-center gap-1.5 active:scale-95"
                            >
                              <span className="material-symbols-outlined text-base">explore</span>
                              <span>رهگیری زنده</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ================= TAB 3: WALLET & TRANSACTIONS ================= */}
            {activeTab === 'wallet' && (
              <div className="space-y-6">
                {/* Balance Hero Card */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-primary to-primary-container text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-white/80 font-bold block">موجودی نقدی کیف پول دیجی‌استایل:</span>
                    <div className="text-2xl sm:text-3xl font-black font-mono">
                      {formatToman(currentUser.walletBalance)} تومان
                    </div>
                    <span className="text-xs text-white/90 block">
                      فقط پرداخت کامل با موجودی کافی؛ شارژ آنلاین و کش‌بک فعال نیست.
                    </span>
                  </div>

                  <button
                    onClick={() => setShowWalletModal(true)}
                    className="px-6 py-3 rounded-xl bg-white text-primary text-xs font-black shadow-md hover:bg-surface-container transition active:scale-95 flex items-center gap-2 self-start sm:self-auto"
                  >
                    <span className="material-symbols-outlined text-base">add_circle</span>
                    <span>افزایش موجودی</span>
                  </button>
                </div>

                {/* Transactions Table */}
                <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xs p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-6 rounded-full bg-primary"></span>
                      <h3 className="text-sm font-black text-on-surface">تاریخچه تراکنش‌ها در این مرحله به رابط متصل نیست</h3>
                    </div>
                    <span className="text-xs text-outline font-mono">
                      نمایش تاریخچه فعال نیست
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-surface-container-low text-on-surface font-bold border-b border-outline-variant/60">
                        <tr>
                          <th className="p-3">شرح تراکنش</th>
                          <th className="p-3">کد پیگیری</th>
                          <th className="p-3 text-center">تاریخ و ساعت</th>
                          <th className="p-3 text-left">مبلغ (تومان)</th>
                          <th className="p-3 text-center">وضعیت</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/30">
                        {transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-surface">
                            <td className="p-3 font-medium text-on-surface flex items-center gap-2">
                              <span
                                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                  tx.type === 'deposit'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : tx.type === 'cashback'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                <span className="material-symbols-outlined text-sm">
                                  {tx.type === 'deposit'
                                    ? 'add'
                                    : tx.type === 'cashback'
                                    ? 'stars'
                                    : 'remove'}
                                </span>
                              </span>
                              <span>{tx.title}</span>
                            </td>
                            <td className="p-3 font-mono text-outline">{tx.trackingCode}</td>
                            <td className="p-3 text-center text-outline font-mono">{tx.date}</td>
                            <td className="p-3 text-left font-mono font-bold">
                              <span
                                className={
                                  tx.type === 'payment' ? 'text-rose-600' : 'text-emerald-700'
                                }
                              >
                                {tx.type === 'payment' ? '-' : '+'}
                                {formatToman(tx.amount)}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                موفق
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'club' && <p>فرمول وفاداری و تبدیل امتیاز در این مرحله تایید نشده و فعال نیست.</p>}

            {/* ================= TAB 5: SAVED ADDRESSES ================= */}
            {activeTab === 'addresses' && (
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xs p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-outline-variant/60 pb-5">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-6 rounded-full bg-primary"></span>
                    <div>
                      <h3 className="text-base font-black text-on-surface">آدرس‌های تحویل من</h3>
                      <p className="text-xs text-outline mt-0.5">مدیریت نشانی‌های تحویل سفارش‌های اینترنتی</p>
                    </div>
                  </div>

                  <button
                    onClick={openCreateAddress}
                    className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container shadow-xs transition active:scale-95 flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base">add_location_alt</span>
                    <span>افزودن آدرس جدید</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`rounded-2xl p-5 flex flex-col justify-between transition relative ${
                        addr.isDefault
                          ? 'border-2 border-primary bg-primary/5 shadow-xs'
                          : 'border border-outline-variant bg-surface hover:border-outline'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-xl">
                              {addr.type === 'office' ? 'apartment' : 'home'}
                            </span>
                            <span className="text-sm font-black text-on-surface">{addr.title}</span>
                          </div>
                          {addr.isDefault && (
                            <span className="px-2.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">
                              پیش‌فرض ارسال
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          {addr.streetAddress}
                        </p>

                        <div className="pt-2 border-t border-outline-variant/50 text-xs text-outline space-y-1">
                          <div className="flex items-center gap-2">
                            <span>کد پستی:</span>
                            <span className="font-mono text-on-surface font-bold">{addr.postalCode}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>گیرنده:</span>
                            <span className="text-on-surface font-medium">{addr.recipientName}</span>
                            <span className="font-mono text-outline">({addr.recipientPhone})</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-outline-variant/50 text-xs">
                        {!addr.isDefault ? (
                          <button
                            onClick={() => handleSetDefaultAddress(addr.id)}
                            className="text-primary font-bold hover:underline flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            <span>انتخاب به عنوان پیش‌فرض</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-primary font-bold">نشانی اصلی</span>
                        )}

                        <div className="flex items-center gap-3 font-bold">
                          <button
                            onClick={() => openEditAddress(addr)}
                            className="text-outline hover:text-primary flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                            <span>ویرایش</span>
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="text-error hover:underline flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                            <span>حذف</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ================= TAB 6: WISHLIST ================= */}
            {activeTab === 'wishlist' && (
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xs p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-outline-variant/60 pb-5">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-6 rounded-full bg-primary"></span>
                    <div>
                      <h3 className="text-base font-black text-on-surface">کالاهای مورد علاقه</h3>
                      <p className="text-xs text-outline mt-0.5">محصولات نشان‌شده برای خرید آسان در آینده</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-surface-container text-xs font-bold text-on-surface">
                    {toPersianDigits(wishlist.length)} کالا
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {wishlist.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl border border-outline-variant bg-surface flex items-center gap-4 hover:shadow-xs transition"
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-20 h-20 rounded-xl object-cover bg-surface-container flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <span className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">
                          {item.brand}
                        </span>
                        <h4 className="text-xs font-bold text-on-surface truncate">{item.title}</h4>
                        <p className="text-[11px] text-outline">
                          رنگ: {item.color} | سایز: {item.size}
                        </p>
                        <div className="flex items-center gap-2 pt-1 font-mono">
                          <span className="text-xs font-black text-on-surface">
                            {formatToman(item.salePrice || item.price)}
                          </span>
                          {item.discountPercent && (
                            <span className="text-[10px] text-rose-700 bg-rose-100 px-1.5 rounded font-bold">
                              ٪{toPersianDigits(item.discountPercent)} تخفیف
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleMoveToCart(item)}
                          className="p-2.5 rounded-xl bg-primary text-white hover:bg-primary-container transition shadow-xs flex items-center justify-center active:scale-95"
                          title="انتقال به سبد خرید"
                        >
                          <span className="material-symbols-outlined text-base">shopping_bag</span>
                        </button>
                        <button
                          onClick={() => handleRemoveFromWishlist(item.id)}
                          className="p-2.5 rounded-xl bg-surface-container text-error hover:bg-error/10 transition flex items-center justify-center active:scale-95"
                          title="حذف از لیست"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ================= TAB 7: COUPONS & VOUCHERS ================= */}
            {activeTab === 'coupons' && (
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xs p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-outline-variant/60 pb-5">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-6 rounded-full bg-rose-600"></span>
                    <div>
                      <h3 className="text-base font-black text-on-surface">کدهای تخفیف و بن‌های خرید من</h3>
                      <p className="text-xs text-outline mt-0.5">کوپن‌های اختصاصی فعال برای سبد خرید شما</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {coupons.map((cp) => (
                    <div
                      key={cp.id}
                      className="p-5 rounded-2xl border border-rose-200 bg-rose-50/50 space-y-3 relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-rose-950">{cp.title}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 font-mono">
                          تا {cp.expiryDate}
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-rose-200 shadow-xs">
                        <div>
                          <span className="text-sm font-black text-primary font-mono tracking-wider block">
                            {cp.code}
                          </span>
                          <span className="text-[10px] text-outline">
                            حداقل خرید: {formatToman(cp.minPurchase)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleCopyCoupon(cp.code)}
                          className="px-4 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition active:scale-95 flex items-center gap-1 shadow-xs"
                        >
                          <span className="material-symbols-outlined text-sm">content_copy</span>
                          <span>کپی کد</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ================= TAB 8: WARRANTY & RETURNS ================= */}
            {activeTab === 'returns' && (
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xs p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/60 pb-5">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-6 rounded-full bg-primary"></span>
                    <div>
                      <h3 className="text-base font-black text-on-surface">ضمانت ۷ روزه و تاریخچه مرجوعی کالا</h3>
                      <p className="text-xs text-outline mt-0.5">درخواست استرداد وجه و تعویض سایز پوشاک بدون قید و شرط</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowReturnModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container shadow-xs transition active:scale-95 flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base">assignment_return</span>
                    <span>ثبت درخواست مرجوعی جدید</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {returns.map((ret) => (
                    <div
                      key={ret.id}
                      className="p-4 rounded-xl border border-outline-variant bg-surface space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-on-surface">کد سفارش: {ret.orderNumber}</span>
                          <span className="text-outline">|</span>
                          <span className="text-outline font-mono">ثبت شده در: {ret.date}</span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {ret.status === 'approved' ? 'تأیید شده و واریز به کیف پول' : 'در حال بررسی کارشناس'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <img
                          src={ret.productImage}
                          alt=""
                          className="w-14 h-14 rounded-lg object-cover bg-surface-container flex-shrink-0"
                        />
                        <div className="space-y-0.5 text-xs">
                          <h4 className="font-bold text-on-surface">{ret.productTitle}</h4>
                          <p className="text-outline text-[11px]">علت درخواست: {ret.reason}</p>
                          <p className="text-emerald-700 font-mono font-bold">
                            مبلغ عودت: {formatToman(ret.refundAmount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ================= TAB 9: REVIEWS ================= */}
            {activeTab === 'reviews' && (
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xs p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-outline-variant/60 pb-5">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-6 rounded-full bg-primary"></span>
                    <div>
                      <h3 className="text-base font-black text-on-surface">دیدگاه‌ها و نظرات من</h3>
                      <p className="text-xs text-outline mt-0.5">تجربه استفاده و امتیازدهی به سفارش‌های گذشته</p>
                    </div>
                  </div>
                  <span className="text-xs text-outline font-medium">۲ دیدگاه تأیید شده</span>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-outline-variant bg-surface space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-on-surface">اورکت پشمی کلاسیک مردانه زارا</span>
                        <div className="flex text-amber-500 text-xs">★★★★★</div>
                      </div>
                      <span className="text-[11px] text-outline font-mono">۱۵ اردیبهشت ۱۴۰۳</span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      جنس پارچه فوتر ترک عالی و دوخت تمیز. رنگ شتری دقیقاً با تصویر سایت همخوانی داشت. سایز لارج کاملاً اندازه بود.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-outline-variant bg-surface space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-on-surface">کت تک اسپرت مردانه ماسیمو دوتی</span>
                        <div className="flex text-amber-500 text-xs">★★★★☆</div>
                      </div>
                      <span className="text-[11px] text-outline font-mono">۲۸ فروردین ۱۴۰۳</span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      کیفیت و تن‌خور بسیار شیک. کاور کت و چوب‌لباسی همراه بسته عالی بود. ممنون از بسته‌بندی محکم دیجی‌استایل.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 10: NOTIFICATIONS ================= */}
            {activeTab === 'notifications' && (
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xs p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-outline-variant/60 pb-5">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-6 rounded-full bg-primary"></span>
                    <div>
                      <h3 className="text-base font-black text-on-surface">پیام‌ها و اعلانات سامانه</h3>
                      <p className="text-xs text-outline mt-0.5">وضعیت پیگیری سفارشات، امتیازات و کدهای تخفیف</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
                      showToast('تمامی پیام‌ها خوانده شدند.', 'success');
                    }}
                    className="text-xs text-primary font-bold hover:underline"
                  >
                    خوانده‌شدن همه
                  </button>
                </div>

                <div className="space-y-3">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 rounded-xl border transition flex items-start gap-3.5 ${
                        notif.isRead
                          ? 'border-outline-variant/60 bg-surface'
                          : 'border-primary/40 bg-primary/5 shadow-xs'
                      }`}
                    >
                      <span
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          notif.type === 'order'
                            ? 'bg-blue-100 text-blue-700'
                            : notif.type === 'discount'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xl">
                          {notif.type === 'order' ? 'local_shipping' : notif.type === 'discount' ? 'redeem' : 'stars'}
                        </span>
                      </span>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-on-surface flex items-center gap-2">
                            <span>{notif.title}</span>
                            {!notif.isRead && (
                              <span className="w-2 h-2 rounded-full bg-secondary"></span>
                            )}
                          </h4>
                          <span className="text-[10px] text-outline font-mono">{notif.date}</span>
                        </div>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ================= TAB 11: SECURITY & PROFILE ================= */}
            {activeTab === 'security' && (
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xs p-6 space-y-8">
                {/* Personal Info Form */}
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="flex items-center gap-3 border-b border-outline-variant/60 pb-4">
                    <span className="w-2.5 h-6 rounded-full bg-primary"></span>
                    <h3 className="text-base font-black text-on-surface">اطلاعات هویتی و شماره شبا بانکی</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="font-bold text-on-surface">نام و نام خانوادگی</label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-on-surface">کد ملی (جهت صدور فاکتور رسمی مالیاتی)</label>
                      <input
                        type="text"
                        required
                        value={editNationalCode}
                        onChange={(e) => setEditNationalCode(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-on-surface">شماره تلفن همراه</label>
                      <input
                        type="text"
                        required
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-on-surface">پست الکترونیک (ایمیل)</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="font-bold text-on-surface">
                        شماره شبا بانکی (جهت عودت آنی مبالغ مرجوعی کالا)
                      </label>
                      <input
                        type="text"
                        value={editSheba}
                        onChange={(e) => setEditSheba(e.target.value)}
                        placeholder="IR000000000000000000000000"
                        className="w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono text-left focus:outline-none focus:border-primary"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-container transition active:scale-95 shadow-xs"
                  >
                    ذخیره تغییرات هویتی
                  </button>
                </form>

                {/* Change Password Form */}
                <form onSubmit={handleChangePassword} className="space-y-4 pt-4 border-t border-outline-variant/60">
                  <div className="flex items-center gap-3 pb-2">
                    <span className="w-2.5 h-6 rounded-full bg-primary"></span>
                    <h3 className="text-base font-black text-on-surface">تغییر کلمه عبور</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="font-bold text-on-surface">کلمه عبور فعلی</label>
                      <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-on-surface">کلمه عبور جدید</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="حداقل ۶ نویسه"
                        className="w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-on-surface">تکرار کلمه عبور جدید</label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="تکرار رمز عبور"
                        className="w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-surface-container-high text-primary hover:bg-primary hover:text-white font-bold text-xs transition active:scale-95 border border-outline-variant"
                  >
                    به‌روزرسانی کلمه عبور
                  </button>
                </form>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ================= MODAL 1: WALLET RECHARGE ================= */}
      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-2xl">account_balance_wallet</span>
                <h3 className="font-bold text-sm text-on-surface">افزایش اعتبار کیف پول دیجی‌استایل</h3>
              </div>
              <button
                onClick={() => setShowWalletModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-outline"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleChargeWallet} className="space-y-4 text-xs">
              <div>
                <label className="block text-outline mb-2">مبالغ پیشنهادی شارژ (تومان):</label>
                <div className="grid grid-cols-2 gap-2">
                  {[200000, 500000, 1000000, 2000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setWalletChargeAmount(amt)}
                      className={`py-2 px-3 rounded-xl border font-mono font-bold transition ${
                        walletChargeAmount === amt
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-outline-variant bg-surface text-on-surface hover:border-primary/50'
                      }`}
                    >
                      {formatToman(amt)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-outline font-bold">مبلغ دلخواه (تومان):</label>
                <input
                  type="number"
                  min="50000"
                  step="50000"
                  value={walletChargeAmount}
                  onChange={(e) => setWalletChargeAmount(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low text-outline text-[11px] flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">verified_user</span>
                <span>اتصال امن به درگاه شاپرک بانکی سامان کیش (SEP) و تسویه آنی</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWalletModal(false)}
                  className="px-4 py-2 rounded-xl text-outline hover:bg-surface-container font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary-container shadow transition active:scale-95"
                >
                  پرداخت و شارژ آنی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: OFFICIAL TAX INVOICE ================= */}
      {showInvoiceModal && selectedInvoiceOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-outline-variant space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-2xl">receipt_long</span>
                <h3 className="font-bold text-sm text-on-surface">
                  صورت‌حساب سفارش {selectedInvoiceOrder.orderNumber}
                </h3>
              </div>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-outline"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Printable Invoice Container */}
            <div className="space-y-4 text-xs" id="printable-tax-invoice">
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/60 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-outline block text-[11px]">فروشنده:</span>
                  <span className="font-bold text-on-surface">
                    صورت‌حساب ثبت‌شده سفارش
                  </span>
                  <span className="text-outline block text-[11px] mt-0.5 font-mono">
                    اطلاعات حقوقی فروشنده هنوز تایید و پیکربندی نشده است.
                  </span>
                </div>
                <div className="text-left font-mono">
                  <span className="text-outline block text-[11px]">شماره فاکتور:</span>
                  <span className="font-bold text-primary">
                    INV-{selectedInvoiceOrder.orderNumber}
                  </span>
                  <span className="text-outline block text-[11px] mt-0.5">
                    {selectedInvoiceOrder.createdAt?.includes('140')
                      ? selectedInvoiceOrder.createdAt
                      : toJalaliDate(selectedInvoiceOrder.createdAt)}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-outline-variant rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-surface-container-high text-on-surface font-bold border-b border-outline-variant">
                    <tr>
                      <th className="p-2.5">ردیف</th>
                      <th className="p-2.5">شرح کالا</th>
                      <th className="p-2.5 text-center">تعداد</th>
                      <th className="p-2.5 text-left font-mono">قیمت واحد (تومان)</th>
                      <th className="p-2.5 text-left font-mono">مبلغ کل (تومان)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40">
                    {(selectedInvoiceOrder.items || []).filter(Boolean).map((it: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-mono text-center">{toPersianDigits(idx + 1)}</td>
                        <td className="p-2.5">{it.productTitle || it.product?.title || 'کالای سفارشی'}</td>
                        <td className="p-2.5 text-center font-mono">{toPersianDigits(it.quantity || 1)}</td>
                        <td className="p-2.5 text-left font-mono">
                          {formatToman(it.unitPrice)}
                        </td>
                        <td className="p-2.5 text-left font-mono font-bold">
                          {formatToman(it.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <FinancialSummary quote={selectedInvoiceOrder.invoiceData ?? null} />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-outline-variant/60">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-container shadow transition flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">print</span>
                <span>چاپ صورت‌حساب</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: ADD / EDIT ADDRESS ================= */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-outline-variant space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-2xl">add_location_alt</span>
                <h3 className="font-bold text-sm text-on-surface">
                  {editingAddress ? 'ویرایش نشانی پستی' : 'ثبت نشانی تحویل جدید'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddressModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-outline"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-on-surface">عنوان آدرس (مثال: منزل، دفتر کار)</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-on-surface">نام و نام خانوادگی تحویل‌گیرنده</label>
                  <input
                    type="text"
                    required
                    value={formRecipient}
                    onChange={(e) => setFormRecipient(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-on-surface">شماره تماس تحویل‌گیرنده</label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-on-surface">کد پستی ۱۰ رقمی (بدون خط تیره)</label>
                <input
                  type="text"
                  required
                  value={formPostal}
                  onChange={(e) => setFormPostal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-on-surface">نشانی دقیق پستی (خیابان، کوچه، پلاک، واحد)</label>
                <textarea
                  required
                  rows={3}
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-none focus:border-primary leading-relaxed"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formIsDefault}
                  onChange={(e) => setFormIsDefault(e.target.checked)}
                  className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4"
                />
                <span className="text-on-surface font-bold">انتخاب به عنوان آدرس پیش‌فرض ارسال</span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="px-4 py-2 rounded-xl text-outline hover:bg-surface-container font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-primary text-white font-bold hover:bg-primary-container shadow transition active:scale-95"
                >
                  ذخیره نشانی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: SUBMIT REVIEW ================= */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-2xl">rate_review</span>
                <h3 className="font-bold text-sm text-on-surface">ثبت دیدگاه برای کالا</h3>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-outline"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-surface-container-low text-on-surface font-bold">
                {reviewProductTitle}
              </div>

              <div>
                <label className="block text-outline mb-2">امتیاز شما به کیفیت و سایزبندی:</label>
                <div className="flex items-center gap-2 text-2xl text-amber-400">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="hover:scale-110 transition"
                    >
                      {star <= reviewRating ? '★' : '☆'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-on-surface">متن دیدگاه و نقد شما:</label>
                <textarea
                  required
                  rows={4}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="درباره کیفیت دوخت، جنس پارچه و دقت سایز توضیح دهید..."
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-none focus:border-primary leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 rounded-xl text-outline hover:bg-surface-container font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-primary text-white font-bold hover:bg-primary-container shadow transition active:scale-95"
                >
                  ارسال نظر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 5: RETURN REQUEST ================= */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-2xl">assignment_return</span>
                <h3 className="font-bold text-sm text-on-surface">
                  درخواست مرجوعی سفارش {returnOrderNumber}
                </h3>
              </div>
              <button
                onClick={() => setShowReturnModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-outline"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitReturn} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-on-surface">دلیل مرجوعی کالا:</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="عدم تطابق سایز">عدم تطابق سایز با مشخصات</option>
                  <option value="ایراد یا زدگی در پارچه">ایراد یا زدگی در پارچه یا دوخت</option>
                  <option value="تفاوت رنگ با تصویر">تفاوت فاحش رنگ کالا با تصویر وب‌سایت</option>
                  <option value="انصراف از خرید">انصراف از خرید (ضمانت ۷ روزه بدون قید و شرط)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-on-surface">توضیحات تکمیلی:</label>
                <textarea
                  required
                  rows={3}
                  value={returnDescription}
                  onChange={(e) => setReturnDescription(e.target.value)}
                  placeholder="لطفاً توضیحات را برای هماهنگی با مامور پیک جهت جمع‌آوری مرسوله بنویسید..."
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-none focus:border-primary leading-relaxed"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                طبق ضمانت بازگشت ۷ روزه ویستا، مامور پیک در بازه ۲۴ ساعته کالا را تحویل گرفته و وجه بلافاصله به کیف پول یا شماره شبا شما عودت داده می‌شود.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="px-4 py-2 rounded-xl text-outline hover:bg-surface-container font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-primary text-white font-bold hover:bg-primary-container shadow transition active:scale-95"
                >
                  ثبت درخواست عودت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 6: LOGOUT CONFIRMATION ================= */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-outline-variant space-y-4 animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-2xl">logout</span>
            </div>
            <h3 className="font-bold text-base text-on-surface">خروج از حساب کاربری</h3>
            <p className="text-xs text-outline leading-relaxed">
              آیا اطمینان دارید که می‌خواهید از حساب کاربری خود در دیجی‌استایل خارج شوید؟
            </p>
            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-5 py-2.5 rounded-xl border border-outline-variant text-xs font-bold hover:bg-surface-container"
              >
                انصراف
              </button>
              <button
                onClick={handleLogout}
                className="px-6 py-2.5 rounded-xl bg-error text-white text-xs font-bold hover:bg-error/90 transition shadow-sm active:scale-95"
              >
                بله، خارج شو
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
