import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { toPersianDigits } from '../../lib/persian';

export const TopNavBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { openMiniCart, getItemsCount } = useCartStore();
  const { user, setLoginModalOpen, logout } = useAuthStore();
  const { isDarkMode, toggleDarkMode } = useThemeStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Global Ctrl+K keyboard shortcut listener for search focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('global-live-search');
        if (searchInput) {
          searchInput.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close user menu on route change
  useEffect(() => {
    setUserMenuOpen(false);
  }, [location.pathname]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const cartCount = getItemsCount();

  return (
    <>
      {/* Top Announcement Bar */}
      <aside aria-label="اعلان ویژه" className="bg-primary text-on-primary py-1.5 px-margin-desktop text-center text-label-sm font-label-sm relative z-50">
        <div className="max-w-[1320px] mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-secondary-fixed">
            <span className="material-symbols-outlined text-[16px]">local_shipping</span>
            <span>ارسال رایگان برای خریدهای بالای ۱,۲۰۰,۰۰۰ تومان به سراسر کشور</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-surface-variant text-label-sm hidden sm:inline">پشتیبانی ۲۴ ساعته: ۰۲۱-۹۱۰۰۸۰۰۰</span>
            <span className="text-outline-variant hidden sm:inline">|</span>
            <Link to="/shop?collection=spring-2025" className="text-tertiary-fixed hover:underline flex items-center gap-1 text-label-sm font-medium">
              <span>کالکشن بهاره ۲۰۲۵</span>
              <span className="material-symbols-outlined text-[14px] rotate-180">arrow_forward</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Sticky Navigation Header */}
      <header className="sticky top-0 z-40 w-full bg-surface-container-lowest border-b border-outline-variant shadow-sm transition-all">
        <div className="max-w-[1320px] mx-auto px-margin-mobile md:px-margin-desktop py-2.5">
          <div className="flex items-center justify-between gap-4">
            {/* Right: Brand Logo & Live Search */}
            <div className="flex items-center gap-6 flex-1">
              <Link to="/" className="text-headline-lg font-headline-lg font-extrabold text-primary tracking-tight flex items-center gap-2 group">
                <span className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    shopping_bag
                  </span>
                </span>
                <span className="text-xl sm:text-2xl font-black">دیجی‌استایل</span>
              </Link>

              {/* Live Search Bar */}
              <form onSubmit={handleSearchSubmit} className="hidden md:flex relative flex-1 max-w-lg items-center">
                <input
                  id="global-live-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجوی برند، پوشاک، پیراهن، کفش یا کد کالا..."
                  className="w-full h-11 bg-surface-container-low text-on-surface rounded-xl pr-11 pl-14 text-body-sm border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner"
                />
                <span className="material-symbols-outlined absolute right-3.5 text-outline text-xl pointer-events-none">
                  search
                </span>
                <kbd className="absolute left-3 py-0.5 px-2 text-[10px] bg-surface-container text-outline rounded border border-outline-variant font-mono">
                  ⌘K
                </kbd>
              </form>
            </div>

            {/* Left: Trailing Actions Cluster */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"
                title={isDarkMode ? 'حالت روز' : 'حالت شب'}
              >
                <span className="material-symbols-outlined text-xl">
                  {isDarkMode ? 'light_mode' : 'dark_mode'}
                </span>
              </button>

              {/* Wishlist Link */}
              <Link
                to="/wishlist"
                className="w-10 h-10 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors relative"
                title="علاقه‌مندی‌ها"
              >
                <span className="material-symbols-outlined text-xl">favorite</span>
                <span className="absolute top-2 left-2 w-2 h-2 rounded-full bg-secondary"></span>
              </Link>

              {/* User Account / Profile Pill */}
              <div className="relative">
                {user ? (
                  <div>
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors border border-outline-variant/60"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed overflow-hidden ring-2 ring-primary/20">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-primary text-xl">person</span>
                        )}
                      </div>
                      <div className="hidden sm:flex flex-col text-right">
                        <span className="text-label-md font-bold text-on-surface leading-tight">
                          {user.name}
                        </span>
                        <span className="text-[11px] text-primary leading-none">
                          {user.isGoldMember ? 'عضو طلایی' : user.role === 'super_admin' ? 'مدیر ارشد' : 'مشتری'}
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant text-base">
                        expand_more
                      </span>
                    </button>

                    {/* User Dropdown Menu */}
                    {userMenuOpen && (
                      <div className="absolute left-0 mt-2 w-56 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant py-2 z-50">
                        <div className="px-4 py-2 border-b border-outline-variant/60">
                          <p className="text-body-sm font-bold text-on-surface">{user.name}</p>
                          <p className="text-label-sm text-outline font-persian-nums">{user.phone}</p>
                        </div>
                        <Link
                          to="/account"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-body-sm text-on-surface hover:bg-surface-container transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg text-primary">dashboard</span>
                          <span>پیشخوان حساب کاربری</span>
                        </Link>
                        <Link
                          to="/account#orders"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-body-sm text-on-surface hover:bg-surface-container transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg text-primary">shopping_bag</span>
                          <span>سفارش‌های من</span>
                        </Link>
                        <Link
                          to="/account#addresses"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-body-sm text-on-surface hover:bg-surface-container transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg text-primary">location_on</span>
                          <span>آدرس‌های من</span>
                        </Link>
                        <Link
                          to="/account"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-body-sm text-on-surface hover:bg-surface-container transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg text-secondary">favorite</span>
                          <span>لیست علاقه‌مندی‌ها</span>
                        </Link>
                        {['super_admin', 'admin', 'shop_manager', 'content_editor', 'support'].includes(user.role) && (
                          <Link
                            to="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-body-sm text-primary font-bold hover:bg-primary/5 transition-colors border-t border-outline-variant/60"
                          >
                            <span className="material-symbols-outlined text-lg text-primary">admin_panel_settings</span>
                            <span>ورود به پنل مدیریت</span>
                          </Link>
                        )}
                        <div className="border-t border-outline-variant/60 my-1"></div>
                        <button
                          onClick={() => {
                            logout();
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-body-sm text-error hover:bg-error-container/30 transition-colors text-right"
                        >
                          <span className="material-symbols-outlined text-lg">logout</span>
                          <span>خروج از حساب</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setLoginModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-label-md font-bold text-on-surface hover:bg-surface-container border border-outline-variant transition-colors"
                  >
                    <span className="material-symbols-outlined text-xl">person</span>
                    <span className="hidden sm:inline">ورود / ثبت‌نام</span>
                  </button>
                )}
              </div>

              {/* Shopping Bag Trigger Button */}
              <button
                onClick={openMiniCart}
                className="flex items-center gap-2 h-11 px-4 rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-all shadow-sm active:scale-95"
                title="سبد خرید"
              >
                <span className="material-symbols-outlined text-xl">shopping_bag</span>
                <span className="text-label-md font-bold whitespace-nowrap hidden sm:inline">
                  سبد خرید ({toPersianDigits(cartCount)})
                </span>
                <span className="sm:hidden font-bold font-persian-nums text-xs bg-secondary text-white rounded-full px-1.5 py-0.5">
                  {toPersianDigits(cartCount)}
                </span>
              </button>

              {/* Admin Portal Fast Shortcut Button */}
              <Link
                to="/admin"
                className="hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container-high text-primary hover:bg-surface-container font-label-md font-bold border border-outline-variant transition-colors"
                title="پنل مدیریت فروشگاه"
              >
                <span className="material-symbols-outlined text-lg">settings_suggest</span>
                <span>پنل ادمین</span>
              </Link>
            </div>
          </div>

          {/* Sub Navigation Bar for Product Categories */}
          <nav className="hidden md:flex items-center gap-8 mt-2.5 pt-2 border-t border-outline-variant/50 text-body-sm font-medium">
            <Link to="/shop?category=men" className="text-on-surface-variant hover:text-primary pb-1 transition-colors">
              پوشاک مردانه
            </Link>
            <Link to="/shop?category=women" className="text-on-surface-variant hover:text-primary pb-1 transition-colors">
              پوشاک زنانه
            </Link>
            <Link to="/shop?category=shoes-bags" className="text-on-surface-variant hover:text-primary pb-1 transition-colors">
              کیف و کفش
            </Link>
            <Link to="/shop?category=accessories" className="text-on-surface-variant hover:text-primary pb-1 transition-colors">
              اکسسوری
            </Link>
            <Link
              to="/shop?discount=true"
              className="text-secondary font-bold hover:text-secondary-container pb-1 transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-base">local_fire_department</span>
              <span>تخفیف‌های ویژه</span>
            </Link>
            <Link to="/blog" className="text-on-surface-variant hover:text-primary pb-1 transition-colors">
              وبلاگ
            </Link>
            <Link to="/track-order" className="text-on-surface-variant hover:text-primary pb-1 transition-colors mr-auto flex items-center gap-1">
              <span className="material-symbols-outlined text-base">local_shipping</span>
              <span>پیگیری سفارش</span>
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
};
