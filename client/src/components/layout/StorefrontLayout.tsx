import React, { useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { TopNavBar } from '../shared/TopNavBar';
import { Footer } from '../shared/Footer';
import { MiniCartDrawer } from '../shared/MiniCartDrawer';
import { AuthModal } from '../shared/AuthModal';
import { ToastContainer } from '../shared/ToastContainer';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { toPersianDigits } from '../../lib/persian';

export const StorefrontLayout: React.FC = () => {
  const location = useLocation();
  const { getItemsCount, openMiniCart } = useCartStore();
  const { checkAuth } = useAuthStore();
  const { initTheme } = useThemeStore();

  useEffect(() => {
    checkAuth();
    initTheme();
    window.scrollTo(0, 0);
  }, [location.pathname, checkAuth, initTheme]);

  const cartCount = getItemsCount();

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <TopNavBar />
      <MiniCartDrawer />
      <AuthModal />
      <ToastContainer />

      <main className="flex-grow flex flex-col">
        <Outlet />
      </main>

      <Footer />

      {/* Mobile Bottom Navigation Bar (Sticky < 768px) */}
      <nav aria-label="ناوبری موبایل" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant py-1.5 px-4 flex items-center justify-around text-label-sm font-label-sm text-on-surface-variant no-print shadow-lg">
        <Link
          to="/"
          className={`flex flex-col items-center gap-1 p-1 ${
            location.pathname === '/' ? 'text-primary font-bold' : 'hover:text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-2xl">home</span>
          <span>خانه</span>
        </Link>

        <Link
          to="/shop"
          className={`flex flex-col items-center gap-1 p-1 ${
            location.pathname.startsWith('/shop') ? 'text-primary font-bold' : 'hover:text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-2xl">grid_view</span>
          <span>فروشگاه</span>
        </Link>

        {/* Floating Cart Button */}
        <button
          onClick={openMiniCart}
          className="flex flex-col items-center gap-1 p-1 relative text-primary font-bold"
        >
          <div className="relative">
            <span className="material-symbols-outlined text-2xl">shopping_bag</span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-secondary text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {toPersianDigits(cartCount)}
              </span>
            )}
          </div>
          <span>سبد خرید</span>
        </button>

        <Link
          to="/wishlist"
          className={`flex flex-col items-center gap-1 p-1 ${
            location.pathname === '/wishlist' ? 'text-primary font-bold' : 'hover:text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-2xl">favorite</span>
          <span>علاقه‌مندی</span>
        </Link>

        <Link
          to="/account"
          className={`flex flex-col items-center gap-1 p-1 ${
            location.pathname.startsWith('/account') ? 'text-primary font-bold' : 'hover:text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-2xl">person</span>
          <span>حساب من</span>
        </Link>
      </nav>
    </div>
  );
};
