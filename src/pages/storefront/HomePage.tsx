// ===== STOREFRONT HOME PAGE =====
// Pixel-faithful recreation of Stitch designs with Persian hero slider, categories, special offers countdown, bestsellers, brands, and magazine

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Product, Category, BlogPost } from '../../../shared/types';
import { formatToman, toPersianDigits } from '../../lib/persian';
import { useCartStore } from '../../store/cartStore';
import { useToastStore } from '../../store/toastStore';

export const HomePage: React.FC = () => {
  const [banners, setBanners] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [discountedProducts, setDiscountedProducts] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 35, seconds: 48 });

  const { addItem } = useCartStore();
  const { showToast } = useToastStore();

  useEffect(() => {
    // Countdown timer for special offers
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Fetch home data
    api.getBanners().then(setBanners).catch(console.error);
    api.getCategories().then(setCategories).catch(console.error);
    api.getProducts({ featured: true, limit: 8 }).then((res) => setFeaturedProducts(res.products)).catch(console.error);
    api.getProducts({ sort: 'discount', limit: 8 }).then((res) => setDiscountedProducts(res.products)).catch(console.error);
    api.getProducts({ sort: 'newest', limit: 8 }).then((res) => setNewArrivals(res.products)).catch(console.error);
    api.getBlogs().then(setBlogs).catch(console.error);
  }, []);

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    addItem(product, 1);
    showToast(`«${product.title}» به سبد خرید افزوده شد.`, 'success');
  };

  return (
    <div className="space-y-12 pb-16">
      {/* 1. HERO SLIDER */}
      <section className="relative overflow-hidden rounded-2xl bg-surface-container-low shadow-sm border border-outline-variant/60">
        {banners.length > 0 ? (
          <div className="relative h-[340px] sm:h-[420px] md:h-[480px] w-full overflow-hidden">
            {banners.map((banner, idx) => (
              <div
                key={banner.id}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  idx === activeBannerIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                <img
                  src={banner.image}
                  alt={banner.title}
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/80 via-black/40 to-transparent flex items-center p-6 md:p-14 text-white">
                  <div className="max-w-xl space-y-4">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary text-white tracking-wide">
                      پیشنهاد ویژه فصل
                    </span>
                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-black leading-tight drop-shadow-sm">
                      {banner.title}
                    </h1>
                    <p className="text-sm sm:text-base text-gray-200 line-clamp-2 leading-relaxed">
                      {banner.subtitle}
                    </p>
                    <div className="pt-2">
                      <Link
                        to={banner.link || '/shop'}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-gray-900 font-bold hover:bg-gray-100 transition shadow-lg active:scale-95 text-sm"
                      >
                        <span>مشاهده و خرید</span>
                        <span className="material-symbols-outlined text-sm rtl:rotate-180">arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Slider Dots */}
            <div className="absolute bottom-4 start-1/2 -translate-x-1/2 z-20 flex gap-2">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveBannerIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === activeBannerIndex ? 'w-8 bg-white' : 'w-2 bg-white/50'
                  }`}
                  aria-label={`اسلاید ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="h-[380px] flex items-center justify-center text-on-surface-variant">
            <div className="animate-pulse flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <span className="text-sm font-medium">در حال بارگذاری شگفت‌انگیزها...</span>
            </div>
          </div>
        )}
      </section>

      {/* 2. CATEGORIES CIRCULAR GRID */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-black text-on-surface flex items-center gap-2">
            <span className="w-2.5 h-6 bg-primary rounded-full inline-block" />
            دسته‌بندی‌های محبوب
          </h2>
          <Link to="/shop" className="text-xs md:text-sm text-primary font-bold hover:underline flex items-center gap-1">
            مشاهده همه
            <span className="material-symbols-outlined text-sm rtl:rotate-180">chevron_right</span>
          </Link>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-3 sm:gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/shop?category=${cat.id}`}
              className="group flex flex-col items-center text-center p-2 rounded-2xl hover:bg-surface-container-high transition border border-transparent hover:border-outline-variant/50"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-surface-container-high p-1 shadow-sm group-hover:scale-105 transition-transform duration-300 border border-outline-variant/40">
                {cat.image ? (
                  <img src={cat.image} alt={cat.title} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                    <span className="material-symbols-outlined">category</span>
                  </div>
                )}
              </div>
              <span className="mt-2 text-xs md:text-sm font-bold text-on-surface group-hover:text-primary transition line-clamp-1">
                {cat.title}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. SPECIAL OFFERS / SHOKOFTO-ANGIZ WITH COUNTDOWN (Stitch Banner) */}
      <section className="rounded-2xl p-4 sm:p-6 bg-gradient-to-l from-red-700 via-rose-600 to-red-800 text-white shadow-xl overflow-hidden">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Header & Countdown */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-center sm:items-start text-center sm:text-start gap-4 flex-shrink-0">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold">
                <span className="material-symbols-outlined text-sm text-yellow-300">local_fire_department</span>
                <span>تخفیف شگفت‌انگیز روز</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black">پیشنهادهای طلایی</h3>
              <p className="text-xs text-white/80">فرصت را از دست ندهید! تخفیف‌ها تا پایان موجودی</p>
            </div>

            {/* Jalali Countdown box */}
            <div className="flex items-center gap-2 text-gray-900 font-black">
              <div className="flex flex-col items-center bg-white rounded-xl p-2 min-w-[50px] shadow">
                <span className="text-lg font-mono text-red-600">{toPersianDigits(timeLeft.hours)}</span>
                <span className="text-[10px] text-gray-500 font-normal">ساعت</span>
              </div>
              <span className="text-white font-bold text-lg">:</span>
              <div className="flex flex-col items-center bg-white rounded-xl p-2 min-w-[50px] shadow">
                <span className="text-lg font-mono text-red-600">{toPersianDigits(timeLeft.minutes)}</span>
                <span className="text-[10px] text-gray-500 font-normal">دقیقه</span>
              </div>
              <span className="text-white font-bold text-lg">:</span>
              <div className="flex flex-col items-center bg-white rounded-xl p-2 min-w-[50px] shadow">
                <span className="text-lg font-mono text-red-600">{toPersianDigits(timeLeft.seconds)}</span>
                <span className="text-[10px] text-gray-500 font-normal">ثانیه</span>
              </div>
            </div>

            <Link
              to="/shop?filter=sale"
              className="px-4 py-2 rounded-xl bg-white text-red-700 font-black text-xs hover:bg-gray-100 transition shadow active:scale-95 flex items-center gap-1"
            >
              <span>مشاهده همه شگفت‌انگیزها</span>
              <span className="material-symbols-outlined text-xs rtl:rotate-180">arrow_forward</span>
            </Link>
          </div>

          {/* Product Carousel Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full">
            {discountedProducts.slice(0, 4).map((product) => (
              <div
                key={product.id}
                className="bg-surface rounded-xl p-3 text-on-surface shadow hover:shadow-md transition flex flex-col justify-between group border border-outline-variant/30"
              >
                <Link to={`/product/${product.slug || product.id}`} className="space-y-2 block">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-surface-container-high">
                    <img
                      src={product.mainImage}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {product.discountPercent && (
                      <span className="absolute top-2 end-2 bg-secondary text-on-secondary text-[11px] font-black px-2 py-0.5 rounded-full shadow">
                        {toPersianDigits(product.discountPercent)}٪
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-on-surface line-clamp-2 h-8 leading-tight">
                    {product.title}
                  </h4>
                </Link>

                <div className="mt-2 pt-2 border-t border-outline-variant/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      {product.salePrice ? (
                        <>
                          <span className="text-[11px] text-on-surface-variant line-through font-mono">
                            {formatToman(product.price)}
                          </span>
                          <span className="text-sm font-black text-secondary font-mono">
                            {formatToman(product.salePrice)}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-black text-on-surface font-mono">
                          {formatToman(product.price)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleQuickAdd(e, product)}
                      title="افزودن سریع به سبد"
                      className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary-container transition active:scale-90 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-base">add_shopping_cart</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. PROMO BANNERS 2-COL */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/shop?category=cat-men"
          className="relative h-44 sm:h-52 rounded-2xl overflow-hidden group shadow-sm border border-outline-variant/50"
        >
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCKyyLWggWCe-CKyfifTQeBV-Bn1g2BPVPzjrJXgqGBpKtijzaGSsjj7DhE35xSAcP-X2SLBZTOwxuMsiCiS4Y2WB3uaTR7oR-d_uUmpJkrhUvglQjDjIqhbuMUf3oBdX8P13JGrr0gDg2RMq3tOcBnpC-o7TzFVho2B1WyAwkQVl3APSmX4CExxoy18jvbX4UL3lkIwAH42K3fqOmaRzYTtiqpeDV9GINTEBON9ufBDNyetQkFdHex0w"
            alt="کالکشن پاییزه و زمستانه مردانه"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/75 to-transparent flex flex-col justify-end p-6 text-white">
            <span className="text-xs font-bold text-yellow-300">استایل کلاسیک و معاصر</span>
            <h3 className="text-xl font-black mt-1">کت و کاپشن‌های زمستانه مردانه</h3>
            <span className="mt-2 text-xs font-medium underline flex items-center gap-1">
              مشاهده مجموعه <span className="material-symbols-outlined text-xs rtl:rotate-180">arrow_forward</span>
            </span>
          </div>
        </Link>

        <Link
          to="/shop?category=cat-leather"
          className="relative h-44 sm:h-52 rounded-2xl overflow-hidden group shadow-sm border border-outline-variant/50"
        >
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAuqbuA4ZEn1-HmsFigNDBdGpflyZ1l67Jla6nxKmMdIdxdYXqMSOrnq9xEMc_QGwqKchKnffpeUKvZal6c-xrHIUZZRDQ_Kw_zQHfb9xSuCE0BbOyd3MqZlagPmyqJfSOMHBKC1vJlwXXgHgHoxsw9_f1wRqhsBNL8uXIQUG1_taV0xMJeBtOi337jON9ZTma-Sm2Zs0NUmAnpzESmtTBAtTZ8PjIZxJmuhOZxxbeTCZsiGnJhGYerCA"
            alt="چرم طبیعی مشهد و تبریز"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/75 to-transparent flex flex-col justify-end p-6 text-white">
            <span className="text-xs font-bold text-yellow-300">اصالت و ماندگاری</span>
            <h3 className="text-xl font-black mt-1">کیف و کفش دست‌دوز چرم طبیعی</h3>
            <span className="mt-2 text-xs font-medium underline flex items-center gap-1">
              مشاهده محصولات <span className="material-symbols-outlined text-xs rtl:rotate-180">arrow_forward</span>
            </span>
          </div>
        </Link>
      </section>

      {/* 5. BEST SELLERS GRID */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
          <div>
            <h2 className="text-lg md:text-xl font-black text-on-surface flex items-center gap-2">
              <span className="w-2.5 h-6 bg-secondary rounded-full inline-block" />
              پرفروش‌ترین‌های این هفته
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">انتخاب‌های اول شیک‌پوشان دیجی‌استایل</p>
          </div>
          <Link to="/shop?sort=popular" className="text-xs md:text-sm text-primary font-bold hover:underline flex items-center gap-1">
            مشاهده همه
            <span className="material-symbols-outlined text-sm rtl:rotate-180">chevron_right</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {featuredProducts.map((p) => (
            <div
              key={p.id}
              className="bg-surface rounded-2xl p-3 border border-outline-variant/50 hover:border-primary/40 hover:shadow-lg transition-all flex flex-col justify-between group"
            >
              <Link to={`/product/${p.slug || p.id}`} className="space-y-2 block">
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-surface-container-high">
                  <img
                    src={p.mainImage}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {p.discountPercent && (
                    <span className="absolute top-2 end-2 bg-secondary text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow">
                      {toPersianDigits(p.discountPercent)}٪
                    </span>
                  )}
                  {p.brand && (
                    <span className="absolute bottom-2 start-2 bg-surface/90 backdrop-blur-xs text-[10px] font-bold px-2 py-0.5 rounded text-on-surface-variant border border-outline-variant/40">
                      {p.brand}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[11px] text-amber-500 font-bold">
                    <span className="material-symbols-outlined text-xs fill-1">star</span>
                    <span>{toPersianDigits(p.rating || 5.0)}</span>
                    <span className="text-on-surface-variant font-normal">({toPersianDigits(p.reviewsCount || 12)})</span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-on-surface line-clamp-2 h-10 leading-snug group-hover:text-primary transition">
                    {p.title}
                  </h3>
                </div>
              </Link>

              <div className="mt-3 pt-2 border-t border-outline-variant/40 flex items-center justify-between">
                <div className="flex flex-col">
                  {p.salePrice ? (
                    <>
                      <span className="text-[11px] text-on-surface-variant line-through font-mono">
                        {formatToman(p.price)}
                      </span>
                      <span className="text-sm font-black text-secondary font-mono">
                        {formatToman(p.salePrice)}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-black text-on-surface font-mono">
                      {formatToman(p.price)}
                    </span>
                  )}
                </div>

                <button
                  onClick={(e) => handleQuickAdd(e, p)}
                  className="w-9 h-9 rounded-xl bg-surface-container-high text-primary hover:bg-primary hover:text-white transition flex items-center justify-center active:scale-90 border border-outline-variant/50"
                  title="افزودن به سبد خرید"
                >
                  <span className="material-symbols-outlined text-lg">shopping_bag</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. OFFICIAL BRANDS STRIP */}
      <section className="rounded-2xl p-6 bg-surface-container-low border border-outline-variant/50 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base md:text-lg font-black text-on-surface">برندهای برتر و اصیل ایرانی و بین‌المللی</h3>
          <span className="text-xs text-on-surface-variant font-medium">ضمانت ۱۰۰٪ اصالت فیزیکی کالا</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 text-center">
          {[
            { name: 'هاکوپیان', en: 'Hacoupian' },
            { name: 'چرم مشهد', en: 'Mashhad Leather' },
            { name: 'درسا', en: 'Dorsa' },
            { name: 'پاتن جامه', en: 'Patan Jameh' },
            { name: 'زاگرس پوش', en: 'Zagros Poosh' },
            { name: 'مارال چرم', en: 'Maral Leather' },
          ].map((brand, i) => (
            <Link
              key={i}
              to={`/shop?brand=${encodeURIComponent(brand.name)}`}
              className="p-4 rounded-xl bg-surface border border-outline-variant/40 hover:border-primary hover:shadow-sm transition flex flex-col items-center justify-center gap-1 group"
            >
              <span className="material-symbols-outlined text-primary text-2xl group-hover:scale-110 transition-transform">verified</span>
              <span className="text-xs font-black text-on-surface mt-1">{brand.name}</span>
              <span className="text-[10px] text-on-surface-variant">{brand.en}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 7. MAGAZINE / BLOG HIGHLIGHTS */}
      {blogs.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
            <div>
              <h2 className="text-lg md:text-xl font-black text-on-surface flex items-center gap-2">
                <span className="w-2.5 h-6 bg-primary rounded-full inline-block" />
                مجله مد و سبک زندگی دیجی‌استایل
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">راهنمای ست لباس، ترندهای روز و مراقبت از پوشاک</p>
            </div>
            <Link to="/blog" className="text-xs md:text-sm text-primary font-bold hover:underline flex items-center gap-1">
              آرشیو مقالات
              <span className="material-symbols-outlined text-sm rtl:rotate-180">chevron_right</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {blogs.slice(0, 3).map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="bg-surface rounded-2xl overflow-hidden border border-outline-variant/50 hover:shadow-md transition group flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-[16/10] overflow-hidden bg-surface-container-high">
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
                      <span className="px-2 py-0.5 rounded bg-surface-container-high font-bold text-primary">
                        {post.category}
                      </span>
                      <span>•</span>
                      <span>زمان مطالعه: {post.readTime}</span>
                    </div>
                    <h3 className="text-sm font-black text-on-surface line-clamp-2 group-hover:text-primary transition leading-snug">
                      {post.title}
                    </h3>
                    <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                      {post.excerpt}
                    </p>
                  </div>
                </div>
                <div className="p-4 pt-0 text-xs font-bold text-primary flex items-center gap-1">
                  <span>ادامه مطلب</span>
                  <span className="material-symbols-outlined text-xs rtl:rotate-180">arrow_forward</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 8. NEWSLETTER SUBSCRIBE */}
      <section className="rounded-2xl p-6 sm:p-8 bg-surface-container-low border border-outline-variant text-center space-y-4 max-w-3xl mx-auto shadow-sm">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
          <span className="material-symbols-outlined text-2xl">mail</span>
        </div>
        <div className="space-y-1">
          <h3 className="text-lg sm:text-xl font-black text-on-surface">عضویت در خبرنامه تخفیف‌های ویژه ویستا استایل</h3>
          <p className="text-xs sm:text-sm text-on-surface-variant">
            با عضویت در خبرنامه، از حراج‌های میان‌فصل و کدهای تخفیف اختصاصی زودتر از دیگران باخبر شوید.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            showToast('ایمیل شما با موفقیت در خبرنامه ثبت گردید.', 'success');
          }}
          className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto pt-2"
        >
          <input
            type="email"
            required
            placeholder="آدرس ایمیل خود را وارد کنید..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-outline-variant bg-surface text-sm focus:outline-none focus:border-primary text-start"
            dir="ltr"
          />
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-container transition active:scale-95 shadow"
          >
            عضویت
          </button>
        </form>
      </section>
    </div>
  );
};
