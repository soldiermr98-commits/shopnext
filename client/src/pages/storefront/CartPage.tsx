// ===== STOREFRONT CART PAGE =====
// Pixel-faithful Cart screen matching Stitch designs with 3-step progress, free shipping progress bar, and coupon validation

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { formatToman, toPersianDigits } from '../../lib/persian';
import { FinancialSummary, CartStatus } from '../../components/shared/FinancialSummary';
import { CheckoutStepper } from '../../components/shared/CheckoutStepper';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    items,
    removeItem,
    updateQuantity,
    coupon,
    couponCodeInput,
    isApplyingCoupon,
    couponError,
    setCouponCodeInput,
    applyCoupon,
    removeCoupon,
    getSubtotal,
    pricing,
    busy,
  } = useCartStore();


  if (items.length === 0) {
    return (
      <div className="py-16 text-center space-y-6 max-w-md mx-auto"><CartStatus />
        <div className="w-24 h-24 rounded-full bg-surface-container-high text-on-surface-variant mx-auto flex items-center justify-center">
          <span className="material-symbols-outlined text-5xl">shopping_cart</span>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-on-surface">سبد خرید شما خالی است!</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            می‌توانید برای مشاهده محصولات و کالکشن‌های جدید به فروشگاه دیجی‌استایل مراجعه فرمایید.
          </p>
        </div>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow hover:bg-primary-container transition active:scale-95"
        >
          <span>مشاهده و انتخاب کالاها</span>
          <span className="material-symbols-outlined text-sm rtl:rotate-180">arrow_forward</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto">
      {/* Checkout Progress Stepper (Step 1) */}
      <CheckoutStepper currentStep={1} />

      <CartStatus />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cart Items List (Col 1-8) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-base font-black text-on-surface flex items-center gap-2">
              <span>اقلام انتخاب شده</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {toPersianDigits(items.length)} کالا
              </span>
            </h3>
          </div>

          <div className="space-y-3">
            {items.map((item: any) => {
              const unitPrice = pricing ? item.serverLine?.unit_price : null;
              const hasOldPrice = false;
              const oldPrice = null;

              return (
                <div
                  key={item.id || item.productId}
                  className="bg-surface rounded-2xl p-4 border border-outline-variant/60 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shadow-xs"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={item.productImage || item.product?.mainImage || '/images/catalog-placeholder.svg'}
                      alt={item.productTitle || item.product?.title || ''}
                      className="w-20 h-20 rounded-xl object-cover bg-surface-container-high flex-shrink-0 border border-outline-variant/40"
                    />
                    <div className="space-y-1.5">
                      <Link
                        to={`/product/${item.product?.slug || item.productId || item.product?.id}`}
                        className="text-xs sm:text-sm font-black text-on-surface hover:text-primary transition line-clamp-1"
                      >
                        {item.productTitle || item.product?.title || 'کالای انتخابی'}
                      </Link>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-on-surface-variant font-medium">
                        <span>برند: {item.brand || item.product?.brand || 'دیجی‌استایل'}</span>
                        {item.selectedVariant?.colorName && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-black/20"
                                style={{ backgroundColor: item.selectedVariant.colorHex || '#000' }}
                              />
                              {item.selectedVariant.colorName}
                            </span>
                          </>
                        )}
                        {item.selectedVariant?.size && (
                          <>
                            <span>•</span>
                            <span>سایز: {item.selectedVariant.size}</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono">
                        {hasOldPrice && (
                          <span className="text-on-surface-variant line-through text-[11px]">
                            {formatToman(oldPrice)}
                          </span>
                        )}
                        <span className="font-black text-on-surface">
                          {formatToman(unitPrice)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-0 border-outline-variant/40">
                    {/* Stepper */}
                    <div className="flex items-center border border-outline-variant rounded-xl bg-surface-container-low p-1">
                      <button
                        onClick={() => updateQuantity(item.id || item.productId, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-surface-container-high transition text-on-surface"
                      >
                        <span className="material-symbols-outlined text-sm">remove</span>
                      </button>
                      <span className="w-8 text-center font-black text-xs font-mono text-on-surface">
                        {toPersianDigits(item.quantity)}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id || item.productId, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-surface-container-high transition text-on-surface"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                      </button>
                    </div>

                    {/* Total & Delete */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-on-surface font-mono hidden sm:inline">
                        {formatToman(pricing ? item.serverLine?.line_total : null)}
                      </span>
                      <button
                        onClick={() => removeItem(item.id || item.productId)}
                        className="text-on-surface-variant hover:text-red-600 transition p-1"
                        title="حذف از سبد"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Coupon Code Input */}
          <div className="rounded-2xl p-4 bg-surface-container-low border border-outline-variant/60 space-y-3">
            <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-base">sell</span>
              کد تخفیف دارید؟
            </span>

            {coupon ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span>کد «{coupon.code}» اعمال گردید</span>
                </div>
                <button
                  onClick={removeCoupon}
                  className="text-red-600 hover:underline text-[11px]"
                >
                  حذف کد
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCodeInput}
                  onChange={(e) => setCouponCodeInput(e.target.value)}
                  placeholder="مثال: VISTA2025 یا WINTER25"
                  className="flex-1 px-3 py-2 rounded-xl border border-outline-variant bg-surface text-xs focus:outline-none focus:border-primary uppercase font-mono"
                  dir="ltr"
                />
                <button
                  disabled={isApplyingCoupon || !couponCodeInput.trim()}
                  onClick={() => applyCoupon()}
                  className="px-5 py-2 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-container transition active:scale-95 disabled:opacity-50"
                >
                  {isApplyingCoupon ? 'بررسی...' : 'ثبت کد'}
                </button>
              </div>
            )}
            {couponError && <p className="text-xs text-red-600 font-medium">{couponError}</p>}
          </div>
        </div>

        {/* Order Summary (Col 9-12) */}
        <div className="lg:col-span-4 bg-surface rounded-2xl p-6 border border-outline-variant/60 space-y-5 shadow-xs sticky top-24">
          <h3 className="font-black text-sm text-on-surface pb-3 border-b border-outline-variant/50">
            خلاصه فاکتور سفارش
          </h3>

          <FinancialSummary quote={pricing} />

          <button
            disabled={busy || !pricing} onClick={() => navigate('/checkout')}
            className="w-full py-3.5 px-6 rounded-xl bg-primary text-white font-black text-sm flex items-center justify-center gap-2 shadow hover:bg-primary-container transition active:scale-95"
          >
            <span>ادامه فرایند خرید و ثبت آدرس</span>
            <span className="material-symbols-outlined text-sm rtl:rotate-180">arrow_forward</span>
          </button>

          <p className="text-[11px] text-center text-on-surface-variant leading-relaxed">
            موجودی و سهمیه تنها هنگام ثبت موفق سفارش رزرو می‌شوند؛ سبد خرید رزرو نیست.
          </p>
        </div>
      </div>
    </div>
  );
};
