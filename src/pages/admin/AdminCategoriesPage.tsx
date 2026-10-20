// ===== ADMIN CATEGORIES & BRANDS PAGE =====
// Full management of store categories hierarchy and fashion brands with CRUD actions and live filters

import React, { useState, useEffect } from 'react';
import { useToastStore } from '../../store/toastStore';
import { api } from '../../lib/api';
import { Category } from '../../../shared/types';
import { toPersianDigits } from '../../lib/persian';

interface Brand {
  id: string;
  name: string;
  slug: string;
  country: string;
  logo?: string;
  isOfficial: boolean;
  productsCount: number;
}

const INITIAL_BRANDS: Brand[] = [
  { id: 'b-zara', name: 'زارا (Zara)', slug: 'zara', country: 'اسپانیا', isOfficial: true, productsCount: 14 },
  { id: 'b-mango', name: 'مانگو (Mango)', slug: 'mango', country: 'اسپانیا', isOfficial: true, productsCount: 8 },
  { id: 'b-mashhad', name: 'چرم مشهد', slug: 'mashhad-leather', country: 'ایران', isOfficial: true, productsCount: 9 },
  { id: 'b-patan', name: 'پاتن جامه', slug: 'patan-jameh', country: 'ایران', isOfficial: true, productsCount: 12 },
  { id: 'b-dorsa', name: 'چرم درسا (Dorsa)', slug: 'dorsa', country: 'ایران', isOfficial: true, productsCount: 7 },
  { id: 'b-massimo', name: 'ماسیمو دوتی (Massimo Dutti)', slug: 'massimo-dutti', country: 'ایتالیا', isOfficial: true, productsCount: 6 },
  { id: 'b-koton', name: 'کوتون (Koton)', slug: 'koton', country: 'ترکیه', isOfficial: true, productsCount: 5 },
  { id: 'b-pierre', name: 'پیر کاردین (Pierre Cardin)', slug: 'pierre-cardin', country: 'فرانسه', isOfficial: true, productsCount: 4 },
];

export const AdminCategoriesPage: React.FC = () => {
  const { showToast } = useToastStore();
  const [activeTab, setActiveTab] = useState<'categories' | 'brands'>('categories');

  // Categories State
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Category Form State
  const [catTitle, setCatTitle] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catParentId, setCatParentId] = useState('');
  const [catIcon, setCatIcon] = useState('category');
  const [catFeatured, setCatFeatured] = useState(false);
  const [catOrder, setCatOrder] = useState(1);

  // Brands State
  const [brands, setBrands] = useState<Brand[]>(INITIAL_BRANDS);
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  // Brand Form State
  const [brandName, setBrandName] = useState('');
  const [brandSlug, setBrandSlug] = useState('');
  const [brandCountry, setBrandCountry] = useState('ایران');
  const [brandOfficial, setBrandOfficial] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getCategories()
      .then((res) => setCategories(res))
      .catch((err) => console.warn('Categories load notice:', err))
      .finally(() => setLoading(false));
  }, []);

  // Open Create Category Modal
  const openCreateCategory = () => {
    setEditingCategory(null);
    setCatTitle('');
    setCatSlug('');
    setCatParentId('');
    setCatIcon('category');
    setCatFeatured(false);
    setCatOrder(categories.length + 1);
    setCategoryModalOpen(true);
  };

  // Open Edit Category Modal
  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatTitle(cat.title);
    setCatSlug(cat.slug);
    setCatParentId(cat.parentId || '');
    setCatIcon(cat.icon || 'category');
    setCatFeatured(!!cat.featured);
    setCatOrder(cat.order || 1);
    setCategoryModalOpen(true);
  };

  // Save Category
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catTitle.trim()) {
      showToast('عنوان دسته‌بندی الزامی است.', 'error');
      return;
    }

    if (editingCategory) {
      setCategories(
        categories.map((c) =>
          c.id === editingCategory.id
            ? {
                ...c,
                title: catTitle,
                slug: catSlug || catTitle.toLowerCase().replace(/\s+/g, '-'),
                parentId: catParentId || undefined,
                icon: catIcon,
                featured: catFeatured,
                order: catOrder,
              }
            : c
        )
      );
      showToast('دسته‌بندی با موفقیت ویرایش شد.', 'success');
    } else {
      const newCat: Category = {
        id: `cat-${Date.now()}`,
        title: catTitle,
        slug: catSlug || `category-${Date.now()}`,
        parentId: catParentId || undefined,
        icon: catIcon,
        featured: catFeatured,
        order: catOrder,
      };
      setCategories([...categories, newCat]);
      showToast('دسته‌بندی جدید با موفقیت اضافه شد.', 'success');
    }

    setCategoryModalOpen(false);
  };

  // Delete Category
  const handleDeleteCategory = (id: string) => {
    setCategories(categories.filter((c) => c.id !== id));
    showToast('دسته‌بندی مورد نظر حذف شد.', 'info');
  };

  // Open Create Brand Modal
  const openCreateBrand = () => {
    setEditingBrand(null);
    setBrandName('');
    setBrandSlug('');
    setBrandCountry('ایران');
    setBrandOfficial(true);
    setBrandModalOpen(true);
  };

  // Open Edit Brand Modal
  const openEditBrand = (b: Brand) => {
    setEditingBrand(b);
    setBrandName(b.name);
    setBrandSlug(b.slug);
    setBrandCountry(b.country);
    setBrandOfficial(b.isOfficial);
    setBrandModalOpen(true);
  };

  // Save Brand
  const handleSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) {
      showToast('نام برند الزامی است.', 'error');
      return;
    }

    if (editingBrand) {
      setBrands(
        brands.map((b) =>
          b.id === editingBrand.id
            ? {
                ...b,
                name: brandName,
                slug: brandSlug || brandName.toLowerCase().replace(/\s+/g, '-'),
                country: brandCountry,
                isOfficial: brandOfficial,
              }
            : b
        )
      );
      showToast('برند با موفقیت به‌روزرسانی شد.', 'success');
    } else {
      const newB: Brand = {
        id: `b-${Date.now()}`,
        name: brandName,
        slug: brandSlug || `brand-${Date.now()}`,
        country: brandCountry,
        isOfficial: brandOfficial,
        productsCount: 0,
      };
      setBrands([...brands, newB]);
      showToast('برند جدید به فروشگاه اضافه شد.', 'success');
    }

    setBrandModalOpen(false);
  };

  // Delete Brand
  const handleDeleteBrand = (id: string) => {
    setBrands(brands.filter((b) => b.id !== id));
    showToast('برند با موفقیت حذف شد.', 'info');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-outline mb-1 font-mono">
            <span>پنل مدیریت</span>
            <span>/</span>
            <span className="text-primary font-bold">دسته‌بندی و برندها</span>
          </div>
          <h1 className="text-xl font-black text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">category</span>
            <span>مدیریت دسته‌بندی‌ها و برندهای تجاری</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'categories' ? (
            <button
              onClick={openCreateCategory}
              className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container shadow transition flex items-center gap-1.5 active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              <span>افزودن دسته‌بندی جدید</span>
            </button>
          ) : (
            <button
              onClick={openCreateBrand}
              className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container shadow transition flex items-center gap-1.5 active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              <span>ثبت برند جدید</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/60 pb-1 text-xs font-bold">
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 ${
            activeTab === 'categories'
              ? 'bg-primary text-white shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-base">folder</span>
          <span>دسته‌بندی‌های کالا ({toPersianDigits(categories.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('brands')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 ${
            activeTab === 'brands'
              ? 'bg-primary text-white shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-base">verified</span>
          <span>برندهای معتبر ({toPersianDigits(brands.length)})</span>
        </button>
      </div>

      {/* TAB 1: CATEGORIES TABLE & TREE */}
      {activeTab === 'categories' && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-outline-variant/60 flex items-center justify-between">
            <h3 className="font-bold text-xs text-on-surface">ساختار درختی دسته‌بندی‌های ویترین فروشگاه</h3>
            <span className="text-[11px] text-outline">چینش ترتیبی بر اساس اولویت نمایش در منو</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-surface-container-high text-on-surface font-bold border-b border-outline-variant">
                <tr>
                  <th className="p-3 text-center">آیکون</th>
                  <th className="p-3">عنوان دسته‌بندی</th>
                  <th className="p-3 font-mono">اسلاگ (URL)</th>
                  <th className="p-3">دسته‌بندی والد</th>
                  <th className="p-3 text-center">ترتیب</th>
                  <th className="p-3 text-center">ویژه در خانه</th>
                  <th className="p-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {categories.map((cat) => {
                  const parentCat = categories.find((c) => c.id === cat.parentId);
                  return (
                    <tr key={cat.id} className="hover:bg-surface-container-low transition">
                      <td className="p-3 text-center">
                        <span className="w-8 h-8 rounded-lg bg-surface-container inline-flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined text-lg">{cat.icon || 'category'}</span>
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-on-surface">{cat.title}</div>
                        {cat.parentId && (
                          <span className="text-[10px] text-outline flex items-center gap-0.5">
                            <span>زیرمجموعه</span>
                            <span className="font-bold text-primary">{parentCat?.title}</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-outline">{cat.slug}</td>
                      <td className="p-3 text-outline">
                        {parentCat ? parentCat.title : <span className="text-gray-400">دسته‌بندی اصلی</span>}
                      </td>
                      <td className="p-3 text-center font-mono font-bold">{toPersianDigits(cat.order || 1)}</td>
                      <td className="p-3 text-center">
                        {cat.featured ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            نمایش ویژه
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                            عادی
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditCategory(cat)}
                            className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-primary transition"
                            title="ویرایش"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="p-1.5 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error transition"
                            title="حذف"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: BRANDS */}
      {activeTab === 'brands' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {brands.map((b) => (
            <div
              key={b.id}
              className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-xs space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm">
                    {b.name.slice(0, 2)}
                  </span>
                  {b.isOfficial && (
                    <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs text-amber-500">verified</span>
                      <span>اصالت ۱۰۰٪</span>
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-xs text-on-surface">{b.name}</h4>
                  <p className="text-[11px] text-outline font-mono mt-0.5">{b.slug}</p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-outline pt-2 border-t border-outline-variant/40">
                  <span>کشور مبدا: <strong className="text-on-surface">{b.country}</strong></span>
                  <span>{toPersianDigits(b.productsCount)} کالا</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/40">
                <button
                  onClick={() => openEditBrand(b)}
                  className="px-2.5 py-1 rounded-lg border border-outline-variant hover:bg-surface-container text-[11px] font-bold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  <span>ویرایش</span>
                </button>
                <button
                  onClick={() => handleDeleteBrand(b.id)}
                  className="p-1 rounded-lg hover:bg-error/10 text-error"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CATEGORY MODAL */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <h3 className="font-bold text-sm text-on-surface">
                {editingCategory ? 'ویرایش دسته‌بندی کالا' : 'افزودن دسته‌بندی جدید'}
              </h3>
              <button
                onClick={() => setCategoryModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-outline"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-on-surface">عنوان دسته‌بندی *</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: پوشاک آقایان، پالتو..."
                  value={catTitle}
                  onChange={(e) => setCatTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-on-surface">اسلاگ (URL)</label>
                  <input
                    type="text"
                    placeholder="men, coats..."
                    value={catSlug}
                    onChange={(e) => setCatSlug(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-on-surface">آیکون متریال</label>
                  <input
                    type="text"
                    placeholder="dry_cleaning, checkroom..."
                    value={catIcon}
                    onChange={(e) => setCatIcon(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-on-surface">دسته‌بندی والد</label>
                <select
                  value={catParentId}
                  onChange={(e) => setCatParentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface"
                >
                  <option value="">بدون والد (دسته‌بندی اصلی)</option>
                  {categories
                    .filter((c) => !editingCategory || c.id !== editingCategory.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={catFeatured}
                    onChange={(e) => setCatFeatured(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant"
                  />
                  <span>نمایش در بخش دسته‌های ویژه صفحه اصلی</span>
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-outline">ترتیب:</span>
                  <input
                    type="number"
                    min="1"
                    value={catOrder}
                    onChange={(e) => setCatOrder(Number(e.target.value))}
                    className="w-16 px-2 py-1 rounded-lg border border-outline-variant text-center font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-outline hover:bg-surface-container"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary-container shadow transition"
                >
                  ذخیره دسته‌بندی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BRAND MODAL */}
      {brandModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <h3 className="font-bold text-sm text-on-surface">
                {editingBrand ? 'ویرایش اطلاعات برند' : 'ثبت برند رسمی جدید'}
              </h3>
              <button
                onClick={() => setBrandModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-outline"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveBrand} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-on-surface">نام برند تجاری *</label>
                <input
                  type="text"
                  required
                  placeholder="زارا، چرم مشهد، پاتن جامه..."
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-on-surface">اسلاگ لاتین (URL)</label>
                  <input
                    type="text"
                    placeholder="zara, mango..."
                    value={brandSlug}
                    onChange={(e) => setBrandSlug(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-on-surface">کشور مبدا برند</label>
                  <input
                    type="text"
                    placeholder="ایران، اسپانیا، ایتالیا..."
                    value={brandCountry}
                    onChange={(e) => setBrandCountry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-bold pt-1">
                <input
                  type="checkbox"
                  checked={brandOfficial}
                  onChange={(e) => setBrandOfficial(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant"
                />
                <span>تضمین اصالت ۱۰۰٪ کالاهای این برند</span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setBrandModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-outline hover:bg-surface-container"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary-container shadow transition"
                >
                  ذخیره برند
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
