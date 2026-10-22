import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { CartStatus } from './FinancialSummary';
import { formatToman, toPersianDigits } from '../../lib/persian';

export const MiniCartDrawer: React.FC = () => {
  const navigate = useNavigate();
  const {
    items,
    isMiniCartOpen,
    closeMiniCart,
    removeItem,
    updateQuantity,
    getGrandTotal,
    pricing,
    getItemsCount,
  } = useCartStore();

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMiniCartOpen) {
        closeMiniCart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMiniCartOpen, closeMiniCart]);

  // Lock body scroll when open
  useEffect(() => {
    if (isMiniCartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMiniCartOpen]);

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isMiniCartOpen
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div
        onClick={closeMiniCart}
        className="absolute inset-0 bg-inverse-surface/60 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer Panel (Anchored to Left in RTL mode or slide out) */}
      <div
        className={`fixed top-0 bottom-0 left-0 w-full max-w-md bg-surface-container-lowest border-r border-outline-variant shadow-2xl z-50 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isMiniCartOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">
              shopping_bag
            </span>
            <h3 className="text-headline-sm font-headline-sm font-bold text-on-surface">
              پیش‌نمایش سبد خرید سریع
            </h3>
            <span className="bg-primary text-on-primary text-xs font-bold px-2 py-0.5 rounded-full">
              {toPersianDigits(getItemsCount())}
            </span>
          </div>
          <button
            onClick={closeMiniCart}
            className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
            title="بستن سبد"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Scrollable Items List */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4 divide-y divide-outline-variant/40">
          <CartStatus />{items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-outline">
              <span className="material-symbols-outlined text-6xl text-outline-variant mb-3">
                remove_shopping_cart
              </span>
              <p className="text-body-md font-body-md font-bold text-on-surface">
                سبد خرید شما در حال حاضر خالی است
              </p>
              <p className="text-label-sm font-label-sm mt-1">
                می‌توانید از بین کالکشن‌های جدید، کالاهای مورد علاقه خود را انتخاب کنید.
              </p>
              <button
                onClick={() => {
                  closeMiniCart();
                  navigate('/shop');
                }}
                className="mt-4 px-4 py-2 bg-primary text-on-primary rounded-xl text-label-md font-bold hover:bg-primary-container transition-colors"
              >
                مشاهده محصولات
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={`${item.productId}-${item.selectedColor?.hex}-${item.selectedSize}`} className="flex gap-3 pt-3 first:pt-0">
                <div className="w-16 h-20 rounded-lg bg-surface-container overflow-hidden shrink-0 border border-outline-variant/60">
                  <img
                    src={item.productImage}
                    alt={item.productTitle}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-grow flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <h4 className="text-body-sm font-body-sm font-bold text-on-surface line-clamp-1">
                        {item.productTitle}
                      </h4>
                      <p className="text-label-sm font-label-sm text-outline mt-0.5">
                        {item.selectedColor?.name && `${item.selectedColor.name} • `}
                        {item.selectedSize && `سایز ${item.selectedSize}`}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        removeItem(item.productId, item.selectedColor?.hex, item.selectedSize)
                      }
                      className="text-outline hover:text-secondary p-1"
                      title="حذف از سبد"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border border-outline-variant rounded-lg bg-surface overflow-hidden h-7">
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            item.quantity + 1,
                            item.selectedColor?.hex,
                            item.selectedSize
                          )
                        }
                        className="w-7 h-full flex items-center justify-center hover:bg-surface-container text-on-surface transition-colors"
                      >
                        <span className="material-symbols-outlined text-xs">add</span>
                      </button>
                      <span className="w-8 text-center text-xs font-bold font-persian-nums text-on-surface">
                        {toPersianDigits(item.quantity)}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            item.quantity - 1,
                            item.selectedColor?.hex,
                            item.selectedSize
                          )
                        }
                        className="w-7 h-full flex items-center justify-center hover:bg-surface-container text-on-surface transition-colors"
                      >
                        <span className="material-symbols-outlined text-xs">remove</span>
                      </button>
                    </div>
                    <span className="text-label-md font-label-md font-bold text-primary font-persian-nums">
                      {formatToman(pricing ? item.serverLine?.line_total : null)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Subtotal & Action Buttons */}
        {items.length > 0 && (
          <div className="p-4 border-t border-outline-variant bg-surface-container-low space-y-3">
            <div className="flex items-center justify-between text-body-md font-body-md">
              <span className="text-on-surface-variant">مجموع قابل پرداخت:</span>
              <span className="text-headline-sm font-headline-sm font-extrabold text-primary font-persian-nums">
                {formatToman(getGrandTotal())}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                to="/cart"
                onClick={closeMiniCart}
                className="h-11 rounded-xl border border-outline-variant bg-surface hover:bg-surface-container text-on-surface font-bold text-label-md flex items-center justify-center transition-colors shadow-xs"
              >
                مشاهده کامل سبد
              </Link>
              <Link
                to="/checkout"
                onClick={closeMiniCart}
                className="h-11 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-label-md flex items-center justify-center transition-colors shadow-sm"
              >
                تسویه حساب سریع
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
