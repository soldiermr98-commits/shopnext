import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { ToastContainer } from '../shared/ToastContainer';
import { PasswordChangeForm } from '../shared/PasswordChangeForm';
import { toPersianDigits } from '../../lib/persian';

// Admin Page Components
import { AdminDashboardPage } from '../../pages/admin/AdminDashboardPage';
import { AdminProductsPage } from '../../pages/admin/AdminProductsPage';
import { AdminCategoriesPage } from '../../pages/admin/AdminCategoriesPage';
import { AdminOrdersPage } from '../../pages/admin/AdminOrdersPage';
import { AdminCustomersPage } from '../../pages/admin/AdminCustomersPage';
import { AdminMarketingPage } from '../../pages/admin/AdminMarketingPage';
import { AdminContentPage } from '../../pages/admin/AdminContentPage';
import { AdminMediaPage } from '../../pages/admin/AdminMediaPage';
import { AdminThemePage } from '../../pages/admin/AdminThemePage';
import { AdminPaymentPage } from '../../pages/admin/AdminPaymentPage';
import { AdminSmsPage } from '../../pages/admin/AdminSmsPage';
import { AdminSettingsPage } from '../../pages/admin/AdminSettingsPage';
import { AdminLogsPage } from '../../pages/admin/AdminLogsPage';

interface AdminNavItem {
  id: string;
  title: string;
  path: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
}

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading, checkAuth, logout, openLoginModal } = useAuthStore();
  const { isDarkMode, toggleDarkMode } = useThemeStore();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  const navItems: AdminNavItem[] = [
    { id: 'dashboard', title: 'داشبورد فروشگاه', path: '/admin', icon: 'dashboard' },
    { id: 'products', title: 'مدیریت محصولات', path: '/admin/products', icon: 'inventory_2', badge: '۴۰' },
    { id: 'categories', title: 'دسته‌بندی و برندها', path: '/admin/categories', icon: 'category' },
    { id: 'orders', title: 'سفارش‌ها و فاکتورها', path: '/admin/orders', icon: 'receipt_long', badge: '۱ جدید', badgeColor: 'bg-secondary text-white' },
    { id: 'customers', title: 'مدیریت مشتریان', path: '/admin/customers', icon: 'group', badge: '۱۰' },
    { id: 'marketing', title: 'تخفیف و بازاریابی', path: '/admin/marketing', icon: 'campaign' },
    { id: 'content', title: 'مدیریت وبلاگ و صفحات', path: '/admin/content', icon: 'article' },
    { id: 'media', title: 'کتابخانه چندرسانه‌ای', path: '/admin/media', icon: 'photo_library' },
    { id: 'theme', title: 'طراحی قالب و رنگ زنده', path: '/admin/theme', icon: 'palette' },
    { id: 'payment', title: 'درگاه‌های پرداخت بانکی', path: '/admin/payment', icon: 'credit_card' },
    { id: 'sms', title: 'سرویس پیامک و الگوها', path: '/admin/sms', icon: 'sms' },
    { id: 'settings', title: 'تنظیمات پیکربندی سامانه', path: '/admin/settings', icon: 'settings' },
    { id: 'logs', title: 'لاگ فعالیت‌های سیستمی', path: '/admin/logs', icon: 'history' },
  ];

  const isCurrentActive = (itemPath: string) => {
    const currentPath = location.pathname.toLowerCase().replace(/\/$/, '');
    const targetPath = itemPath.toLowerCase().replace(/\/$/, '');
    if (targetPath === '/admin') {
      return currentPath === '/admin' || currentPath === '';
    }
    return currentPath === targetPath || currentPath.startsWith(targetPath + '/');
  };

  const renderCurrentView = () => {
    const rawPath = location.pathname.toLowerCase().replace(/\/$/, '');
    if (rawPath === '/admin/sms') return <AdminSmsPage />;
    if (rawPath === '/admin/categories') return <AdminCategoriesPage />;
    if (rawPath === '/admin/marketing') return <AdminMarketingPage />;
    if (rawPath === '/admin/content') return <AdminContentPage />;
    if (rawPath === '/admin/media') return <AdminMediaPage />;
    if (rawPath === '/admin/theme') return <AdminThemePage />;
    if (rawPath === '/admin/payment') return <AdminPaymentPage />;
    if (rawPath === '/admin/products') return <AdminProductsPage />;
    if (rawPath === '/admin/orders') return <AdminOrdersPage />;
    if (rawPath === '/admin/customers') return <AdminCustomersPage />;
    if (rawPath === '/admin/settings') return <AdminSettingsPage />;
    if (rawPath === '/admin/logs') return <AdminLogsPage />;
    if (rawPath === '/admin' || rawPath === '') return <AdminDashboardPage />;
    return <Outlet />;
  };

  if (isLoading) return <p role="status">در حال بررسی نشست…</p>;
  if (!user) return <div className="p-8"><Link to="/" onClick={openLoginModal}>برای ورود به فروشگاه بازگردید</Link></div>;
  if (!['super_admin', 'admin', 'shop_manager'].includes(user.role)) return <p role="alert" className="p-8">شما مجوز ورود به پنل را ندارید.</p>;
  if (user.mustChangePassword) return <PasswordChangeForm />;

  return (
    <div className="min-h-screen bg-surface-container-low text-on-surface flex flex-col font-vazir">
      <ToastContainer />

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest border-b border-outline-variant h-16 flex items-center justify-between px-4 sm:px-6 shadow-xs">
        {/* Right side: Sidebar toggles & Brand title */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-surface-container text-on-surface-variant transition-colors"
            title="منوی ناوبری"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:flex p-2 rounded-xl hover:bg-surface-container text-on-surface-variant transition-colors"
            title={sidebarCollapsed ? 'باز کردن منو' : 'بستن منو'}
          >
            <span className="material-symbols-outlined text-2xl">
              {sidebarCollapsed ? 'menu_open' : 'menu'}
            </span>
          </button>

          {/* Admin Title & Logo */}
          <Link to="/admin" className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-lg shadow-sm">
              <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
            </span>
            <div className="flex flex-col">
              <span className="text-body-md font-bold text-primary leading-tight">
                پنل مدیریت دیجی‌استایل
              </span>
              <span className="text-[10px] text-outline leading-none">نسخه ۵.۲ سازمانی</span>
            </div>
          </Link>
        </div>

        {/* Center: Search inside Admin */}
        <div className="hidden lg:flex items-center relative w-72">
          <input
            type="text"
            placeholder="جستجو در سفارش‌ها، کالاها، مشتریان..."
            className="w-full h-9 pr-9 pl-3 text-body-sm bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="material-symbols-outlined absolute right-2.5 text-outline text-lg pointer-events-none">
            search
          </span>
        </div>

        {/* Left side: Quick actions, notifications, theme, profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* View Public Storefront Button */}
          <Link
            to="/"
            target="_blank"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container text-primary hover:bg-surface-container-high border border-outline-variant text-label-md font-bold transition-colors"
            title="مشاهده ظاهر عمومی فروشگاه"
          >
            <span className="material-symbols-outlined text-base">storefront</span>
            <span>نمایش فروشگاه</span>
          </Link>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
            title={isDarkMode ? 'حالت روز' : 'حالت شب'}
          >
            <span className="material-symbols-outlined text-xl">
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors relative"
              title="اعلانات جدید"
            >
              <span className="material-symbols-outlined text-xl">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-secondary"></span>
            </button>

            {notificationsOpen && (
              <div className="absolute left-0 mt-2 w-80 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl p-3 z-50 text-right">
                <div className="flex items-center justify-between pb-2 border-b border-outline-variant/60">
                  <h4 className="font-bold text-body-sm text-on-surface">اعلانات مدیریت</h4>
                  <span className="text-xs text-primary font-bold">۲ پیام جدید</span>
                </div>
                <div className="space-y-2 mt-2">
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                    <p className="font-bold text-primary">سفارش جدید #VST-94821 ثبت شد</p>
                    <p className="text-outline text-[11px] mt-0.5">مبلغ: ۴,۶۸۹,۰۰۰ تومان توسط سهراب مظفری</p>
                  </div>
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                    <p className="font-bold text-amber-800">هشدار موجودی کالای کم</p>
                    <p className="text-outline text-[11px] mt-0.5">پالتو پشمی دوطرفه فوتر تنها ۲ عدد باقی مانده</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Admin User Profile */}
          <div className="relative">
            {user && ['super_admin', 'admin', 'shop_manager', 'content_editor', 'support'].includes(user.role) ? (
              <div>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-container transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-sm">
                    {user.name.charAt(0)}
                  </div>
                  <div className="hidden md:flex flex-col text-right">
                    <span className="text-label-md font-bold text-on-surface leading-tight">
                      {user.name}
                    </span>
                    <span className="text-[10px] text-primary font-semibold">
                      {user.role === 'super_admin' ? 'سوپر ادمین' : 'مدیر سیستم'}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-outline text-base">expand_more</span>
                </button>

                {userDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl py-1 z-50 text-right">
                    <div className="px-3 py-2 border-b border-outline-variant/60 text-xs text-outline">
                      {user.email || user.phone}
                    </div>
                    <Link
                      to="/admin/settings"
                      className="flex items-center gap-2 px-3 py-2 text-body-sm text-on-surface hover:bg-surface-container"
                    >
                      <span className="material-symbols-outlined text-base">settings</span>
                      <span>تنظیمات حساب</span>
                    </Link>
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-body-sm text-error hover:bg-error-container/30 text-right"
                    >
                      <span className="material-symbols-outlined text-base">logout</span>
                      <span>خروج از پنل</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={openLoginModal}
                className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-label-sm font-bold shadow-xs hover:bg-primary-container transition-colors flex items-center gap-1"
                title="ورود به حساب"
              >
                <span className="material-symbols-outlined text-base">vpn_key</span>
                <span>ورود به حساب</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Admin Workspace with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Desktop */}
        <aside
          className={`hidden md:flex flex-col bg-surface-container-lowest border-l border-outline-variant transition-all duration-300 ${
            sidebarCollapsed ? 'w-16' : 'w-64'
          }`}
        >
          <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
            {navItems.map((item) => {
              const active = isCurrentActive(item.path);
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-body-sm font-medium transition-colors group relative ${
                    active
                      ? 'bg-primary text-on-primary font-bold shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                  }`}
                  title={sidebarCollapsed ? item.title : undefined}
                >
                  <span
                    className={`material-symbols-outlined text-xl flex-shrink-0 ${
                      active ? 'text-on-primary' : 'text-outline group-hover:text-primary'
                    }`}
                  >
                    {item.icon}
                  </span>
                  {!sidebarCollapsed && (
                    <div className="flex-1 flex items-center justify-between">
                      <span className="truncate">{item.title}</span>
                      {item.badge && (
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            active
                              ? 'bg-white/20 text-white'
                              : item.badgeColor || 'bg-surface-container text-on-surface-variant'
                          }`}
                        >
                          {toPersianDigits(item.badge)}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Quick Footer in Sidebar */}
          {!sidebarCollapsed && (
            <div className="p-3 border-t border-outline-variant/60 text-xs text-outline text-center">
              <span>سامانه هوشمند فروشگاهی ویستا</span>
              <p className="text-[10px] text-outline-variant mt-0.5">وضعیت پایگاه داده: متصل (SQLite)</p>
            </div>
          )}
        </aside>

        {/* Mobile Sidebar Drawer */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />
            <div className="relative w-72 bg-surface-container-lowest h-full z-10 flex flex-col border-l border-outline-variant shadow-2xl">
              <div className="p-4 border-b border-outline-variant flex items-center justify-between">
                <span className="font-bold text-primary">منوی بخش‌های ادمین</span>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1 text-outline hover:text-on-surface"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {navItems.map((item) => {
                  const active = isCurrentActive(item.path);
                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-body-sm font-medium transition-colors ${
                        active
                          ? 'bg-primary text-on-primary font-bold'
                          : 'text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl">{item.icon}</span>
                      <span className="flex-1">{item.title}</span>
                      {item.badge && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container text-on-surface">
                          {toPersianDigits(item.badge)}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Content Workspace Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {renderCurrentView()}
        </main>
      </div>
    </div>
  );
};
