// ===== STOREFRONT SHOP & CATALOG PAGE =====
// Pixel-faithful shop catalog with sidebar filters, price slider, sort controls, and responsive grid

import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Product, Category } from '../../../shared/types';
import { formatToman, toPersianDigits } from '../../lib/persian';
import { Breadcrumb } from '../../components/shared/Breadcrumb';
import { useCartStore } from '../../store/cartStore';
import { useToastStore } from '../../store/toastStore';

export const ShopPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Filters state from URL query
  const categoryParam = searchParams.get('category') || '';
  const brandParam = searchParams.get('brand') || '';
  const sortParam = searchParams.get('sort') || 'newest';
  const searchParam = searchParams.get('search') || '';
  const inStockParam = searchParams.get('inStock') === 'true';
  const filterParam = searchParams.get('filter') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const { addItem } = useCartStore();
  const { showToast } = useToastStore();

  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .getProducts({
        category: categoryParam,
        brand: brandParam,
        sort: sortParam,
        search: searchParam,
        inStock: inStockParam,
        featured: filterParam === 'featured',
        page: pageParam,
        limit: 12,
      })
      .then((res) => {
        setProducts(res.products);
        setTotal(res.total);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [categoryParam, brandParam, sortParam, searchParam, inStockParam, filterParam, pageParam]);

  const updateParam = (key: string, val: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (val === null || val === '') {
      next.delete(key);
    } else {
      next.set(key, val);
    }
    next.set('page', '1'); // reset page on filter change
    setSearchParams(next);
  };

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    addItem(product, 1);

  };

  const currentCategory = categories.find((c) => c.id === categoryParam);

  const brandsList = ['هاکوپیان', 'چرم مشهد', 'درسا', 'پاتن جامه', 'زاگرس پوش', 'مارال چرم', 'سلسله', 'بادی اسپینر'];

  return (
    <div className="space-y-6 pb-16">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'فروشگاه دیجی‌استایل', href: '/shop' },
          ...(currentCategory ? [{ label: currentCategory.title, isCurrent: true }] : [{ label: 'تمام محصولات', isCurrent: true }]),
        ]}
        trailingBadge={
          <span className="text-xs text-on-surface-variant font-medium">
            {toPersianDigits(total)} کالا یافت شد
          </span>
        }
      />

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* SIDEBAR FILTERS (Desktop) */}
        <aside className="hidden lg:block w-72 flex-shrink-0 space-y-6 bg-surface-container-low p-5 rounded-2xl border border-outline-variant/60">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/50">
            <h3 className="font-black text-sm text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">tune</span>
              فیلترهای جستجو
            </h3>
            {(categoryParam || brandParam || inStockParam || searchParam) && (
              <button
                onClick={() => setSearchParams({})}
                className="text-[11px] text-red-600 font-bold hover:underline"
              >
                حذف همه
              </button>
            )}
          </div>

          {/* Categories */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-on-surface">دسته‌بندی‌ها</h4>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 text-xs">
              <button
                onClick={() => updateParam('category', null)}
                className={`w-full text-start px-2.5 py-1.5 rounded-lg transition font-medium flex items-center justify-between ${
                  !categoryParam ? 'bg-primary text-white font-bold' : 'text-on-surface hover:bg-surface'
                }`}
              >
                <span>همه دسته‌ها</span>
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => updateParam('category', c.id)}
                  className={`w-full text-start px-2.5 py-1.5 rounded-lg transition font-medium flex items-center justify-between ${
                    categoryParam === c.id ? 'bg-primary text-white font-bold' : 'text-on-surface hover:bg-surface'
                  }`}
                >
                  <span>{c.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Brands */}
          <div className="space-y-3 pt-3 border-t border-outline-variant/50">
            <h4 className="text-xs font-bold text-on-surface">برندهای برتر</h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
              {brandsList.map((b) => (
                <label key={b} className="flex items-center gap-2 cursor-pointer hover:text-primary transition">
                  <input
                    type="radio"
                    name="brandFilter"
                    checked={brandParam === b}
                    onChange={() => updateParam('brand', brandParam === b ? null : b)}
                    className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <span>{b}</span>
                </label>
              ))}
            </div>
          </div>

          {/* In Stock Only Switch */}
          <div className="pt-3 border-t border-outline-variant/50 flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface">فقط کالاهای موجود</span>
            <input
              type="checkbox"
              checked={inStockParam}
              onChange={(e) => updateParam('inStock', e.target.checked ? 'true' : null)}
              className="w-4 h-4 text-primary rounded focus:ring-primary cursor-pointer"
            />
          </div>
        </aside>

        {/* MAIN PRODUCT LIST */}
        <div className="flex-1 w-full space-y-4">
          {/* Top Sort & Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-surface-container-low border border-outline-variant/60">
            <div className="flex items-center gap-2">
              {/* Mobile filter toggle */}
              <button
                onClick={() => setIsMobileFiltersOpen(true)}
                className="lg:hidden flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface border border-outline-variant text-xs font-bold text-on-surface"
              >
                <span className="material-symbols-outlined text-sm">tune</span>
                <span>فیلترها</span>
              </button>

              <span className="hidden sm:inline text-xs text-on-surface-variant font-bold">مرتب‌سازی بر اساس:</span>
              <div className="flex flex-wrap gap-1 text-xs">
                {[
                  { id: 'newest', label: 'جدیدترین' },
                  { id: 'popular', label: 'محبوب‌ترین' },
                  { id: 'price_asc', label: 'ارزان‌ترین' },
                  { id: 'price_desc', label: 'گران‌ترین' },
                  { id: 'discount', label: 'بیشترین تخفیف' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => updateParam('sort', s.id)}
                    className={`px-3 py-1.5 rounded-lg transition font-medium ${
                      sortParam === s.id
                        ? 'bg-primary text-white font-bold shadow-xs'
                        : 'text-on-surface-variant hover:bg-surface'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs text-on-surface-variant font-mono">
              نمایش {toPersianDigits(products.length)} از {toPersianDigits(total)} محصول
            </span>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-surface rounded-2xl p-3 border border-outline-variant animate-pulse space-y-3">
                  <div className="aspect-[3/4] bg-surface-container-high rounded-xl" />
                  <div className="h-4 bg-surface-container-high rounded w-3/4" />
                  <div className="h-4 bg-surface-container-high rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="bg-surface rounded-2xl p-3 border border-outline-variant/60 hover:border-primary/50 hover:shadow-lg transition-all flex flex-col justify-between group"
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
                      {p.stock <= 0 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-xs">
                          ناموجود
                        </div>
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
                        <span className="text-on-surface-variant font-normal">({toPersianDigits(p.reviewsCount || 10)})</span>
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
                      disabled={p.stock <= 0}
                      onClick={(e) => handleQuickAdd(e, p)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition active:scale-90 border border-outline-variant/50 ${
                        p.stock > 0
                          ? 'bg-surface-container-high text-primary hover:bg-primary hover:text-white'
                          : 'bg-surface-container-low text-on-surface-variant opacity-50 cursor-not-allowed'
                      }`}
                      title={p.stock > 0 ? 'افزودن به سبد خرید' : 'ناموجود'}
                    >
                      <span className="material-symbols-outlined text-lg">shopping_bag</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-surface-container-low rounded-2xl border border-outline-variant/60 space-y-3">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant">search_off</span>
              <h3 className="text-base font-bold text-on-surface">کالایی با این مشخصات یافت نشد</h3>
              <p className="text-xs text-on-surface-variant">فیلترهای انتخابی خود را تغییر دهید یا واژه دیگری جستجو فرمایید.</p>
              <button
                onClick={() => setSearchParams({})}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container transition"
              >
                مشاهده همه کالاها
              </button>
            </div>
          )}

          {/* Pagination */}
          {total > 12 && (
            <div className="flex justify-center items-center gap-2 pt-6">
              {Array.from({ length: Math.ceil(total / 12) }).map((_, idx) => {
                const pageNum = idx + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => updateParam('page', String(pageNum))}
                    className={`w-9 h-9 rounded-xl font-bold text-xs transition ${
                      pageParam === pageNum
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high border border-outline-variant'
                    }`}
                  >
                    {toPersianDigits(pageNum)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MOBILE FILTERS BOTTOM SHEET */}
      {isMobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-xs lg:hidden">
          <div className="bg-surface rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 space-y-5 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
              <h3 className="text-base font-black text-on-surface">فیلترهای کاتالوگ</h3>
              <button
                onClick={() => setIsMobileFiltersOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-on-surface">دسته‌بندی</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => { updateParam('category', null); setIsMobileFiltersOpen(false); }}
                  className={`p-2.5 rounded-xl border text-center font-bold ${
                    !categoryParam ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant'
                  }`}
                >
                  همه دسته‌ها
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { updateParam('category', c.id); setIsMobileFiltersOpen(false); }}
                    className={`p-2.5 rounded-xl border text-center font-bold ${
                      categoryParam === c.id ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant'
                    }`}
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3">
              <button
                onClick={() => setIsMobileFiltersOpen(false)}
                className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm shadow"
              >
                اعمال فیلترها و مشاهده کالاها
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
