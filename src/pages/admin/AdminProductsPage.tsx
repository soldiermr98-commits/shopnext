// ===== ADMIN PRODUCTS MANAGEMENT PAGE =====
// Products table with CRUD actions, search, category filters, quick edit, and Persian form validation

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Product, Category } from '../../../shared/types';
import { formatToman, toPersianDigits } from '../../lib/persian';
import { useToastStore } from '../../store/toastStore';

export const AdminProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { showToast } = useToastStore();

  const loadProducts = () => {
    setLoading(true);
    api.admin
      .getProducts({ search: searchTerm, category: selectedCategory, limit: 100 })
      .then((res) => {
        setProducts(res.products);
        setTotal(res.total);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts();
  };

  const handleOpenAdd = () => {
    setEditingProduct({
      title: '',
      slug: `product-${Date.now()}`,
      sku: `DK-${Math.floor(100000 + Math.random() * 900000)}`,
      brand: 'هاکوپیان',
      price: 1500000,
      salePrice: undefined,
      discountPercent: undefined,
      stock: 10,
      lowStockThreshold: 3,
      type: 'simple',
      status: 'published',
      featured: false,
      shortDescription: '',
      fullDescription: 'توضیحات جامع محصول و راهنمای نگهداری...',
      mainImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCKyyLWggWCe-CKyfifTQeBV-Bn1g2BPVPzjrJXgqGBpKtijzaGSsjj7DhE35xSAcP-X2SLBZTOwxuMsiCiS4Y2WB3uaTR7oR-d_uUmpJkrhUvglQjDjIqhbuMUf3oBdX8P13JGrr0gDg2RMq3tOcBnpC-o7TzFVho2B1WyAwkQVl3APSmX4CExxoy18jvbX4UL3lkIwAH42K3fqOmaRzYTtiqpeDV9GINTEBON9ufBDNyetQkFdHex0w',
      categoryIds: [categories[0]?.id || 'cat-men'],
      tags: ['مد_روز', 'کالکشن_جدید'],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct({ ...product });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`آیا از حذف محصول «${title}» اطمینان دارید؟`)) return;
    try {
      await api.admin.deleteProduct(id);
      showToast('محصول با موفقیت حذف گردید.', 'success');
      loadProducts();
    } catch (err: any) {
      showToast(err.message || 'خطا در حذف کالا', 'error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.title || !editingProduct.price) {
      showToast('لطفاً عنوان و قیمت محصول را وارد نمایید.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (editingProduct.id) {
        await api.admin.updateProduct(editingProduct.id, editingProduct);
        showToast('محصول با موفقیت به‌روزرسانی شد.', 'success');
      } else {
        await api.admin.createProduct(editingProduct);
        showToast('محصول جدید با موفقیت ذخیره گردید.', 'success');
      }
      setIsModalOpen(false);
      loadProducts();
    } catch (err: any) {
      showToast(err.message || 'خطا در ذخیره‌سازی کالا', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-on-surface">مدیریت کاتالوگ و انبارداری محصولات</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            مجموع {toPersianDigits(total)} کالا در پایگاه داده ثبت شده است
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-xs flex items-center gap-1.5 shadow hover:bg-primary-container transition active:scale-95"
        >
          <span className="material-symbols-outlined text-base">add</span>
          <span>افزودن محصول جدید</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-surface border border-outline-variant/60 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجو بر اساس عنوان، برند یا بارکد (SKU)..."
            className="flex-1 px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-xs focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface font-bold text-xs border border-outline-variant hover:bg-surface-container"
          >
            جستجو
          </button>
        </form>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-on-surface-variant">دسته‌بندی:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-bold focus:outline-none focus:border-primary"
          >
            <option value="">همه دسته‌ها</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-surface rounded-2xl border border-outline-variant/60 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/50 text-on-surface font-black">
                <th className="p-3 text-start w-16">تصویر</th>
                <th className="p-3 text-start">عنوان و برند</th>
                <th className="p-3 text-center">کد کالا (SKU)</th>
                <th className="p-3 text-center">قیمت (تومان)</th>
                <th className="p-3 text-center">موجودی انبار</th>
                <th className="p-3 text-center">وضعیت</th>
                <th className="p-3 text-center w-28">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-on-surface-variant">
                    در حال بارگذاری لیست محصولات...
                  </td>
                </tr>
              ) : products.length > 0 ? (
                products.map((p) => (
                  <tr key={p.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low transition">
                    <td className="p-3">
                      <img
                        src={p.mainImage}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover bg-surface-container-high border border-outline-variant/40"
                      />
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-on-surface line-clamp-1 max-w-xs">{p.title}</div>
                      <div className="text-[11px] text-on-surface-variant">برند: {p.brand}</div>
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-on-surface-variant">{p.sku}</td>
                    <td className="p-3 text-center font-mono font-bold">
                      {p.salePrice ? (
                        <div className="flex flex-col">
                          <span className="line-through text-on-surface-variant text-[10px]">{formatToman(p.price)}</span>
                          <span className="text-secondary font-black">{formatToman(p.salePrice)}</span>
                        </div>
                      ) : (
                        <span>{formatToman(p.price)}</span>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] ${
                        p.stock <= (p.lowStockThreshold || 5)
                          ? 'bg-red-100 text-red-800 font-black'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {toPersianDigits(p.stock)} عدد
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                        منتشر شده
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-primary hover:text-white transition flex items-center justify-center text-on-surface-variant"
                          title="ویرایش"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.title)}
                          className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-red-600 hover:text-white transition flex items-center justify-center text-on-surface-variant"
                          title="حذف"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-on-surface-variant">
                    محصولی با فیلترهای انتخابی یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 border border-outline-variant shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
              <h2 className="text-base font-black text-on-surface">
                {editingProduct.id ? 'ویرایش کالا' : 'افزودن محصول جدید به فروشگاه'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-on-surface">عنوان محصول *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.title || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-on-surface">کد محصول (SKU) *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.sku || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-mono focus:outline-none focus:border-primary"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-on-surface">برند *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.brand || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-on-surface">قیمت اصلی (تومان) *</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.price || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-mono focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-on-surface">قیمت تخفیف‌خورده (تومان)</label>
                  <input
                    type="number"
                    value={editingProduct.salePrice || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, salePrice: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-mono focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-on-surface">موجودی انبار *</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.stock || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-mono focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-on-surface">آدرس تصویر اصلی (URL) *</label>
                <input
                  type="url"
                  required
                  value={editingProduct.mainImage || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, mainImage: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-mono focus:outline-none focus:border-primary text-start"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-on-surface">توضیحات و مشخصات *</label>
                <textarea
                  rows={3}
                  required
                  value={editingProduct.fullDescription || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, fullDescription: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-3 border-t border-outline-variant flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-outline-variant text-on-surface font-bold hover:bg-surface-container-low transition"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary-container transition active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? 'در حال ذخیره‌سازی...' : 'ذخیره محصول'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
