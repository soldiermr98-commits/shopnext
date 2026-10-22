// ===== ADMIN MEDIA LIBRARY PAGE =====
// Visual asset manager for product pictures, lookbook imagery, sliders, and logos with CDN URL copy

import React, { useState } from 'react';
import { useToastStore } from '../../store/toastStore';
import { toPersianDigits } from '../../lib/persian';

interface MediaAsset {
  id: string;
  title: string;
  category: 'product' | 'banner' | 'blog' | 'logo';
  url: string;
  size: string;
  dimensions: string;
  format: 'JPEG' | 'PNG' | 'WEBP';
  uploadedAt: string;
}

const INITIAL_MEDIA: MediaAsset[] = [
  {
    id: 'm-1',
    title: 'اورکت پشمی کلاسیک مردانه زارا',
    category: 'product',
    url: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=800&q=80',
    size: '۲۴۰ کیلوبایت',
    dimensions: '800 × 1000',
    format: 'WEBP',
    uploadedAt: '۱۴۰۳/۰۲/۲۴',
  },
  {
    id: 'm-2',
    title: 'بارانی کمردار زنانه مانگو',
    category: 'product',
    url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
    size: '۱۸۰ کیلوبایت',
    dimensions: '800 × 1000',
    format: 'WEBP',
    uploadedAt: '۱۴۰۳/۰۲/۲۴',
  },
  {
    id: 'm-3',
    title: 'کت تک اسپرت تویید ماسیمو دوتی',
    category: 'product',
    url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
    size: '۳۱۰ کیلوبایت',
    dimensions: '800 × 1000',
    format: 'JPEG',
    uploadedAt: '۱۴۰۳/۰۲/۲۲',
  },
  {
    id: 'm-4',
    title: 'نیم‌بوت چرم مردانه دست‌دوز مشهد',
    category: 'product',
    url: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?auto=format&fit=crop&w=800&q=80',
    size: '۲۲۰ کیلوبایت',
    dimensions: '800 × 1000',
    format: 'WEBP',
    uploadedAt: '۱۴۰۳/۰۲/۲۰',
  },
  {
    id: 'm-5',
    title: 'بنر کالکشن زمستان ۲۰۲۵',
    category: 'banner',
    url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80',
    size: '۵۴۰ کیلوبایت',
    dimensions: '1600 × 600',
    format: 'JPEG',
    uploadedAt: '۱۴۰۳/۰۲/۱۵',
  },
  {
    id: 'm-6',
    title: 'بنر جشنواره کت‌های رسمی زارا',
    category: 'banner',
    url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80',
    size: '۴۸۰ کیلوبایت',
    dimensions: '1600 × 600',
    format: 'JPEG',
    uploadedAt: '۱۴۰۳/۰۲/۱۵',
  },
  {
    id: 'm-7',
    title: 'لوگوی رسمی برند دیجی‌استایل',
    category: 'logo',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCKyyLWggWCe-CKyfifTQeBV-Bn1g2BPVPzjrJXgqGBpKtijzaGSsjj7DhE35xSAcP-X2SLBZTOwxuMsiCiS4Y2WB3uaTR7oR-d_uUmpJkrhUvglQjDjIqhbuMUf3oBdX8P13JGrr0gDg2RMq3tOcBnpC-o7TzFVho2B1WyAwkQVl3APSmX4CExxoy18jvbX4UL3lkIwAH42K3fqOmaRzYTtiqpeDV9GINTEBON9ufBDNyetQkFdHex0w',
    size: '۴۵ کیلوبایت',
    dimensions: '512 × 512',
    format: 'PNG',
    uploadedAt: '۱۴۰۳/۰۱/۰۱',
  },
  {
    id: 'm-8',
    title: 'تصویر شاخص مقاله نگهداری از چرم طبیعی',
    category: 'blog',
    url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80',
    size: '۱۹۵ کیلوبایت',
    dimensions: '800 × 500',
    format: 'WEBP',
    uploadedAt: '۱۴۰۳/۰۲/۱۸',
  },
];

export const AdminMediaPage: React.FC = () => {
  const { showToast } = useToastStore();
  const [mediaList, setMediaList] = useState<MediaAsset[]>(INITIAL_MEDIA);
  const [activeFilter, setActiveFilter] = useState<'all' | 'product' | 'banner' | 'blog' | 'logo'>('all');
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadCategory, setUploadCategory] = useState<'product' | 'banner' | 'blog' | 'logo'>('product');

  const filteredMedia = activeFilter === 'all'
    ? mediaList
    : mediaList.filter((m) => m.category === activeFilter);

  // Copy URL to clipboard
  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast('لینک مستقیم تصویر در کلیپ‌بورد کپی شد.', 'success');
  };

  // Add new media
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadUrl.trim()) {
      showToast('لطفاً عنوان و آدرس تصویر را وارد کنید.', 'error');
      return;
    }

    const newAsset: MediaAsset = {
      id: `m-${Date.now()}`,
      title: uploadTitle,
      category: uploadCategory,
      url: uploadUrl,
      size: '۲۵۰ کیلوبایت',
      dimensions: '800 × 800',
      format: 'WEBP',
      uploadedAt: 'لحظاتی پیش',
    };

    setMediaList([newAsset, ...mediaList]);
    showToast('رسانه جدید به کتابخانه اضافه شد.', 'success');
    setUploadModalOpen(false);
    setUploadTitle('');
    setUploadUrl('');
  };

  // Delete Media
  const handleDeleteMedia = (id: string) => {
    setMediaList(mediaList.filter((m) => m.id !== id));
    if (selectedAsset?.id === id) setSelectedAsset(null);
    showToast('رسانه حذف گردید.', 'info');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-outline mb-1 font-mono">
            <span>پنل مدیریت</span>
            <span>/</span>
            <span className="text-primary font-bold">کتابخانه چندرسانه‌ای</span>
          </div>
          <h1 className="text-xl font-black text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">photo_library</span>
            <span>مدیریت فایل‌ها، عکس‌ها و رسانه‌های دیجیتال</span>
          </h1>
        </div>

        <button
          onClick={() => setUploadModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container shadow transition flex items-center gap-1.5 active:scale-95"
        >
          <span className="material-symbols-outlined text-lg">cloud_upload</span>
          <span>بارگذاری رسانه جدید</span>
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
        {[
          { id: 'all', label: 'همه فایل‌ها', count: mediaList.length },
          { id: 'product', label: 'عکس محصولات', count: mediaList.filter((m) => m.category === 'product').length },
          { id: 'banner', label: 'بنرها و اسلایدرها', count: mediaList.filter((m) => m.category === 'banner').length },
          { id: 'blog', label: 'تصاویر وبلاگ', count: mediaList.filter((m) => m.category === 'blog').length },
          { id: 'logo', label: 'لوگو و نمادها', count: mediaList.filter((m) => m.category === 'logo').length },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id as any)}
            className={`px-3.5 py-1.5 rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
              activeFilter === f.id
                ? 'bg-primary text-white shadow-sm'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span>{f.label}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 font-mono">
              {toPersianDigits(f.count)}
            </span>
          </button>
        ))}
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredMedia.map((asset) => (
          <div
            key={asset.id}
            onClick={() => setSelectedAsset(asset)}
            className="group bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-xs hover:border-primary transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="relative aspect-square overflow-hidden bg-gray-100">
              <img
                src={asset.url}
                alt={asset.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <span className="absolute top-2 start-2 px-2 py-0.5 rounded bg-black/60 text-white text-[9px] font-bold backdrop-blur-xs">
                {asset.format}
              </span>
            </div>

            <div className="p-3 space-y-1">
              <h4 className="text-xs font-bold text-on-surface truncate" title={asset.title}>
                {asset.title}
              </h4>
              <div className="flex items-center justify-between text-[10px] text-outline font-mono">
                <span>{asset.dimensions}</span>
                <span>{asset.size}</span>
              </div>
            </div>

            <div className="px-3 pb-3 pt-0 flex items-center justify-between gap-2 border-t border-outline-variant/40 pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyUrl(asset.url);
                }}
                className="text-primary hover:text-primary-container text-[11px] font-bold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">content_copy</span>
                <span>کپی لینک</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteMedia(asset.id);
                }}
                className="text-error hover:opacity-80 p-1"
                title="حذف"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ASSET DETAIL MODAL */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-outline-variant space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <h3 className="font-bold text-sm text-on-surface truncate max-w-xs">{selectedAsset.title}</h3>
              <button
                onClick={() => setSelectedAsset(null)}
                className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-outline"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="max-h-64 overflow-hidden rounded-xl bg-gray-100 flex items-center justify-center border border-outline-variant/60">
              <img src={selectedAsset.url} alt={selectedAsset.title} className="max-h-64 object-contain" />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-surface-container-low p-3 rounded-xl border border-outline-variant/60 font-mono">
              <div>
                <span className="text-outline text-[11px] block">ابعاد تصویر:</span>
                <span className="font-bold text-on-surface">{selectedAsset.dimensions} px</span>
              </div>
              <div>
                <span className="text-outline text-[11px] block">حجم فایل:</span>
                <span className="font-bold text-on-surface">{selectedAsset.size}</span>
              </div>
              <div>
                <span className="text-outline text-[11px] block">فرمت فایل:</span>
                <span className="font-bold text-on-surface">{selectedAsset.format}</span>
              </div>
              <div>
                <span className="text-outline text-[11px] block">تاریخ بارگذاری:</span>
                <span className="font-bold text-on-surface">{selectedAsset.uploadedAt}</span>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-on-surface">آدرس مستقیم CDN</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={selectedAsset.url}
                  className="flex-1 px-3 py-2 rounded-xl border border-outline-variant bg-surface font-mono text-xs text-outline select-all"
                />
                <button
                  onClick={() => handleCopyUrl(selectedAsset.url)}
                  className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-container shadow"
                >
                  کپی
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-outline-variant/60">
              <button
                onClick={() => handleDeleteMedia(selectedAsset.id)}
                className="text-error font-bold text-xs hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                <span>حذف دائمی از سرور</span>
              </button>
              <button
                onClick={() => setSelectedAsset(null)}
                className="px-4 py-2 rounded-xl border border-outline-variant hover:bg-surface-container text-xs font-bold"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <h3 className="font-bold text-sm text-on-surface">بارگذاری رسانه در کتابخانه دیجیتال</h3>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-outline"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-on-surface">عنوان تصویر / فایل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: اورکت پشمی سرمه‌ای، بنر تخفیف..."
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-on-surface">دسته‌بندی رسانه</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface"
                >
                  <option value="product">تصویر محصول</option>
                  <option value="banner">بنر تبلیغاتی</option>
                  <option value="blog">تصویر مقاله وبلاگ</option>
                  <option value="logo">لوگو و نماد رسمی</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-on-surface">آدرس اینترنتی (Image URL) *</label>
                <input
                  type="url"
                  required
                  placeholder="https://images.unsplash.com/..."
                  value={uploadUrl}
                  onChange={(e) => setUploadUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono"
                />
              </div>

              <div className="p-4 rounded-xl border-2 border-dashed border-outline-variant/80 text-center space-y-1 text-outline">
                <span className="material-symbols-outlined text-3xl text-primary">add_photo_alternate</span>
                <p className="text-xs">پشتیبانی از فرمت‌های WEBP, JPG, PNG با حداکثر حجم ۱۰ مگابایت</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-outline hover:bg-surface-container"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary-container shadow transition"
                >
                  ثبت و ذخیره در کتابخانه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
