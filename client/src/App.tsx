// ===== APP ROUTER & ENTRY COMPONENT =====
// Complete React Router routing tree with Storefront layout, Admin layout, and auth session check

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';

// Layouts
import { StorefrontLayout } from './components/layout/StorefrontLayout';
import { PasswordChangeForm } from './components/shared/PasswordChangeForm';

// Storefront Pages
import { HomePage } from './pages/storefront/HomePage';
import { ShopPage } from './pages/storefront/ShopPage';
import { ProductDetailPage } from './pages/storefront/ProductDetailPage';
import { CartPage } from './pages/storefront/CartPage';
import { CheckoutPage } from './pages/storefront/CheckoutPage';
import { OrderSuccessPage } from './pages/storefront/OrderSuccessPage';
import { OrderTrackingPage } from './pages/storefront/OrderTrackingPage';
import { AccountPage } from './pages/storefront/AccountPage';
import { BlogListPage, BlogPostPage } from './pages/storefront/BlogPages';
import { AboutPage, ContactPage, FAQPage } from './pages/storefront/StaticPages';


// 404 Not Found Page
const NotFoundPage: React.FC = () => (
  <div className="py-24 text-center space-y-4 max-w-md mx-auto">
    <div className="text-7xl font-black text-primary font-mono">۴۰۴</div>
    <h1 className="text-xl font-black text-on-surface">صفحه مورد نظر یافت نشد</h1>
    <p className="text-xs text-on-surface-variant leading-relaxed">
      صفحه‌ای که به دنبال آن بودید تغییر آدرس داده و یا حذف شده است.
    </p>
    <Link
      to="/"
      className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-container transition active:scale-95 shadow"
    >
      <span className="material-symbols-outlined text-sm">home</span>
      <span>بازگشت به صفحه اصلی</span>
    </Link>
  </div>
);

export default function App() {
  const { checkAuth, user } = useAuthStore();
  const { isDarkMode } = useThemeStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  if (user?.mustChangePassword) return <PasswordChangeForm />;

  return (
    <BrowserRouter>
      <Routes>
        {/* Storefront Layout Routes */}
        <Route element={<StorefrontLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/product/:idOrSlug" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-success/:id" element={<OrderSuccessPage />} />
          <Route path="/track-order" element={<OrderTrackingPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/blog" element={<BlogListPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/faq" element={<FAQPage />} />
        </Route>

        {/* Global 404 Catch-All */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
