// ===== STOREFRONT PRODUCT DETAIL PAGE =====
// Pixel-faithful product details screen with gallery thumbnails, color/size variants, tabs, and sticky mobile purchase bar

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Product, ProductVariant } from '../../../shared/types';
import { formatToman, toPersianDigits } from '../../lib/persian';
import { Breadcrumb } from '../../components/shared/Breadcrumb';
import { useCartStore } from '../../store/cartStore';
import { useToastStore } from '../../store/toastStore';

export const ProductDetailPage: React.FC = () => {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'specs' | 'desc' | 'reviews'>('specs');

  const { addItem, openMiniCart } = useCartStore();
  const { showToast } = useToastStore();

  useEffect(() => {
    if (!idOrSlug) return;
    setLoading(true); setProduct(null); setSelectedVariant(null);
    api
      .getProduct(idOrSlug)
      .then((res) => {
        setProduct(res.product);
        setRelated(res.related);
        setActiveImage(res.product.mainImage);
        if (res.product.variants && res.product.variants.length > 0) {
          setSelectedVariant(res.product.variants[0]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [idOrSlug]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <span className="text-sm text-on-surface-variant font-medium">در حال بارگذاری اطلاعات محصول...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-on-surface">محصول مورد نظر یافت نشد</h2>
        <Link to="/shop" className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-sm inline-block">
          بازگشت به فروشگاه
        </Link>
      </div>
    );
  }

  const currentPrice = selectedVariant?.salePrice ?? selectedVariant?.price ?? product.salePrice ?? product.price;
  const originalPrice = selectedVariant?.price ?? product.price;
  const hasDiscount = Boolean(product.salePrice || selectedVariant?.salePrice);
  const allImages = [product.mainImage, ...(product.galleryImages || [])];

  const handleAddToCart = () => {
    addItem(product, quantity, selectedVariant || undefined);

    openMiniCart();
  };

  return (
    <div className="space-y-8 pb-24 md:pb-16">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'فروشگاه', href: '/shop' },
          { label: product.brand || 'برندها', href: `/shop?brand=${encodeURIComponent(product.brand)}` },
          { label: product.title, isCurrent: true },
        ]}
      />

      {/* Main Showcase Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start bg-surface rounded-3xl p-4 sm:p-8 border border-outline-variant/60 shadow-xs">
        {/* Gallery (Col 1-5) */}
        <div className="md:col-span-5 space-y-4">
          {/* Active Big Image */}
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-surface-container-high border border-outline-variant/60 shadow-sm">
            <img
              src={activeImage}
              alt={product.title}
              className="w-full h-full object-cover object-center"
            />
            {product.discountPercent && (
              <span className="absolute top-3 end-3 bg-secondary text-white text-xs font-black px-2.5 py-1 rounded-full shadow">
                {toPersianDigits(product.discountPercent)}٪ تخفیف
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {allImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 transition ${
                    activeImage === img ? 'border-primary shadow-sm scale-95' : 'border-outline-variant/60 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details & Selection (Col 6-12) */}
        <div className="md:col-span-7 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary px-2.5 py-1 rounded-md bg-primary/10">
                برند رسمی: {product.brand}
              </span>
              <span className="text-xs text-on-surface-variant font-mono">
                کد کالا: {product.sku}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-on-surface leading-snug">
              {product.title}
            </h1>

            {/* Rating & Fast Delivery badges */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
              <div className="flex items-center gap-1 text-amber-500 font-bold">
                <span className="material-symbols-outlined text-sm fill-1">star</span>
                <span>{toPersianDigits(product.rating || 5.0)}</span>
                <span className="text-on-surface-variant font-normal">({toPersianDigits(product.reviewsCount || 24)} نظر کاربران)</span>
              </div>
              <span className="text-outline-variant">•</span>
              <div className="flex items-center gap-1 text-emerald-600 font-bold">
                <span className="material-symbols-outlined text-sm">local_shipping</span>
                <span>ارسال رایگان برای خریدهای بالای ۴۰۰ هزار تومان</span>
              </div>
            </div>
          </div>

          {/* Variations (Color / Size) */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-outline-variant/60">
              {/* Colors */}
              {product.variants[0].colorName && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-on-surface">
                    رنگ انتخابی: <span className="text-primary">{selectedVariant?.colorName}</span>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(v)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                          selectedVariant?.id === v.id
                            ? 'border-primary bg-primary/10 text-primary shadow-xs'
                            : 'border-outline-variant hover:border-outline'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs"
                          style={{ backgroundColor: v.colorHex || '#000' }}
                        />
                        <span>{v.colorName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sizes */}
              {product.variants[0].size && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface">
                      سایز: <span className="text-primary">{selectedVariant?.size}</span>
                    </span>
                    <button className="text-[11px] text-primary underline font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">straighten</span>
                      راهنمای سایز
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(v)}
                        className={`min-w-[48px] py-1.5 px-3 rounded-xl border text-xs font-black transition ${
                          selectedVariant?.id === v.id
                            ? 'border-primary bg-primary text-white shadow-xs'
                            : 'border-outline-variant hover:border-primary'
                        }`}
                      >
                        {v.size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pricing & Add to Cart Box */}
          <div className="rounded-2xl p-5 bg-surface-container-low border border-outline-variant/60 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-on-surface-variant font-bold">مبلغ قابل پرداخت:</span>
              <div className="text-end">
                {hasDiscount && (
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-xs text-on-surface-variant line-through font-mono">
                      {formatToman(originalPrice)}
                    </span>
                    <span className="bg-secondary text-white text-[11px] font-black px-1.5 py-0.5 rounded">
                      {toPersianDigits(product.discountPercent || 15)}٪
                    </span>
                  </div>
                )}
                <span className="text-2xl font-black text-on-surface font-mono">
                  {formatToman(currentPrice)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              {/* Quantity Stepper */}
              <div className="flex items-center border border-outline-variant rounded-xl bg-surface p-1">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-container-high transition text-on-surface"
                >
                  <span className="material-symbols-outlined text-sm">remove</span>
                </button>
                <span className="w-10 text-center font-black text-sm font-mono">
                  {toPersianDigits(quantity)}
                </span>
                <button
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-container-high transition text-on-surface"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                </button>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className={`flex-1 py-3 px-6 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-95 ${
                  product.stock > 0
                    ? 'bg-primary text-white hover:bg-primary-container'
                    : 'bg-surface-container-high text-on-surface-variant cursor-not-allowed opacity-60'
                }`}
              >
                <span className="material-symbols-outlined text-lg">shopping_cart</span>
                <span>{product.stock > 0 ? 'افزودن به سبد خرید' : 'اتمام موجودی'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Specifications & Reviews */}
      <div className="bg-surface rounded-3xl p-6 border border-outline-variant/60 space-y-6 shadow-xs">
        <div className="flex border-b border-outline-variant/60 gap-8">
          <button
            onClick={() => setActiveTab('specs')}
            className={`pb-3 font-black text-sm relative transition ${
              activeTab === 'specs' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            مشخصات فنی و جزئیات
            {activeTab === 'specs' && <span className="absolute bottom-0 start-0 w-full h-0.5 bg-primary rounded-full" />}
          </button>
          <button
            onClick={() => setActiveTab('desc')}
            className={`pb-3 font-black text-sm relative transition ${
              activeTab === 'desc' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            معرفی و نقد تخصصی
            {activeTab === 'desc' && <span className="absolute bottom-0 start-0 w-full h-0.5 bg-primary rounded-full" />}
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 font-black text-sm relative transition ${
              activeTab === 'reviews' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            نظرات خریداران ({toPersianDigits(product.reviewsCount || 24)})
            {activeTab === 'reviews' && <span className="absolute bottom-0 start-0 w-full h-0.5 bg-primary rounded-full" />}
          </button>
        </div>

        {activeTab === 'specs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
            {product.specifications && product.specifications.length > 0 ? (
              product.specifications.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low text-xs">
                  <span className="text-on-surface-variant font-bold">{s.name || s.key}:</span>
                  <span className="text-on-surface font-semibold">{s.value}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-on-surface-variant">مشخصات استانداردی برای این کالا ثبت شده است.</p>
            )}
          </div>
        )}

        {activeTab === 'desc' && (
          <div className="prose max-w-4xl text-sm leading-relaxed text-on-surface space-y-4">
            <p>{product.fullDescription}</p>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-6 max-w-3xl">
            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/60 flex items-center justify-between">
              <div>
                <span className="text-xs text-on-surface-variant font-bold">امتیاز این کالا:</span>
                <div className="text-2xl font-black text-amber-500 flex items-center gap-1 font-mono">
                  <span>{toPersianDigits(product.rating || 5.0)}</span>
                  <span className="material-symbols-outlined text-xl fill-1">star</span>
                </div>
              </div>
              <button
                onClick={() => showToast('برای ثبت نظر لطفاً وارد حساب کاربری خود شوید.', 'info')}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container transition"
              >
                ثبت نظر جدید
              </button>
            </div>

            <div className="space-y-4">
              {[
                { name: 'محمد حسینی', rating: 5, date: '۲۳ دی ۱۴۰۳', text: 'کیفیت دوخت و جنس پارچه فوق‌العاده است. کاملاً مطابق عکس و توضیحات بود.' },
                { name: 'فاطمه موسوی', rating: 4, date: '۱۸ دی ۱۴۰۳', text: 'رنگش دقیقاً همون چیزی بود که می‌خواستم. بسته‌بندی شیک و ارسال به موقع.' },
              ].map((r, i) => (
                <div key={i} className="p-4 rounded-xl border border-outline-variant/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-on-surface">{r.name}</span>
                    <span className="text-on-surface-variant">{r.date}</span>
                  </div>
                  <div className="flex text-amber-500 text-xs">
                    {Array.from({ length: r.rating }).map((_, j) => (
                      <span key={j} className="material-symbols-outlined text-xs fill-1">star</span>
                    ))}
                  </div>
                  <p className="text-xs text-on-surface leading-relaxed">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-lg font-black text-on-surface flex items-center gap-2">
            <span className="w-2.5 h-6 bg-primary rounded-full inline-block" />
            کالاهای مشابه و پیشنهادی
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {related.map((p) => (
              <Link
                key={p.id}
                to={`/product/${p.slug || p.id}`}
                className="bg-surface rounded-2xl p-3 border border-outline-variant/60 hover:shadow-md transition space-y-2 block"
              >
                <div className="aspect-[3/4] rounded-xl overflow-hidden bg-surface-container-high">
                  <img src={p.mainImage} alt="" className="w-full h-full object-cover" />
                </div>
                <h4 className="text-xs font-bold text-on-surface line-clamp-1">{p.title}</h4>
                <span className="text-xs font-black text-on-surface font-mono">{formatToman(p.price)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* STICKY BOTTOM BAR FOR MOBILE */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md border-t border-outline-variant p-3 md:hidden flex items-center justify-between gap-4 shadow-lg">
        <div className="flex flex-col">
          <span className="text-[10px] text-on-surface-variant font-medium">مبلغ کالا:</span>
          <span className="text-sm font-black text-primary font-mono">{formatToman(currentPrice)}</span>
        </div>
        <button
          onClick={handleAddToCart}
          disabled={product.stock <= 0}
          className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow active:scale-95"
        >
          <span className="material-symbols-outlined text-sm">shopping_cart</span>
          <span>{product.stock > 0 ? 'افزودن به سبد' : 'ناموجود'}</span>
        </button>
      </div>
    </div>
  );
};
