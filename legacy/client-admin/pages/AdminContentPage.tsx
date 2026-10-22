// ===== ADMIN CONTENT & BLOG POSTS PAGE =====
// Manage blog articles, fashion magazine posts, and informational static pages

import React, { useState, useEffect } from 'react';
import { useToastStore } from '../../store/toastStore';
import { api } from '../../lib/api';
import { BlogPost } from '../../../shared/types';
import { toPersianDigits } from '../../lib/persian';

interface StaticPageItem {
  id: string;
  slug: string;
  title: string;
  lastUpdated: string;
  isPublished: boolean;
}

const INITIAL_STATIC_PAGES: StaticPageItem[] = [
  { id: 'p-1', slug: 'about', title: 'درباره ما و داستان برند ویستا', lastUpdated: '۱۴۰۳/۰۲/۱۰', isPublished: true },
  { id: 'p-2', slug: 'contact', title: 'تماس با ما و شعب حضوری', lastUpdated: '۱۴۰۳/۰۲/۱۵', isPublished: true },
  { id: 'p-3', slug: 'faq', title: 'پرسش‌های متداول خریداران', lastUpdated: '۱۴۰۳/۰۱/۲۰', isPublished: true },
  { id: 'p-4', slug: 'terms', title: 'قوانین و ضمانت ۷ روزه بازگشت کالا', lastUpdated: '۱۴۰۳/۰۲/۰۱', isPublished: true },
];

export const AdminContentPage: React.FC = () => {
  const { showToast } = useToastStore();
  const [activeTab, setActiveTab] = useState<'blogs' | 'pages'>('blogs');

  // Blogs State
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [blogModalOpen, setBlogModalOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);

  // Blog Form
  const [postTitle, setPostTitle] = useState('');
  const [postSlug, setPostSlug] = useState('');
  const [postCategory, setPostCategory] = useState('استایل و پوشاک');
  const [postAuthor, setPostAuthor] = useState('تیم تحریریه دیجی‌استایل');
  const [postReadTime, setPostReadTime] = useState('۵ دقیقه');
  const [postImage, setPostImage] = useState('');
  const [postExcerpt, setPostExcerpt] = useState('');
  const [postContent, setPostContent] = useState('');

  // Static Pages State
  const [staticPages, setStaticPages] = useState<StaticPageItem[]>(INITIAL_STATIC_PAGES);

  useEffect(() => {
    setLoading(true);
    api.getBlogs()
      .then((res) => setBlogs(res))
      .catch((err) => console.warn('Blogs load notice:', err))
      .finally(() => setLoading(false));
  }, []);

  // Open Create Blog
  const openCreateBlog = () => {
    setEditingBlog(null);
    setPostTitle('');
    setPostSlug('');
    setPostCategory('استایل و پوشاک');
    setPostAuthor('تیم تحریریه دیجی‌استایل');
    setPostReadTime('۵ دقیقه');
    setPostImage('https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80');
    setPostExcerpt('');
    setPostContent('');
    setBlogModalOpen(true);
  };

  // Open Edit Blog
  const openEditBlog = (b: BlogPost) => {
    setEditingBlog(b);
    setPostTitle(b.title);
    setPostSlug(b.slug);
    setPostCategory(b.category);
    setPostAuthor(b.author);
    setPostReadTime(b.readTime);
    setPostImage(b.coverImage);
    setPostExcerpt(b.excerpt);
    setPostContent(b.content);
    setBlogModalOpen(true);
  };

  // Save Blog
  const handleSaveBlog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim()) {
      showToast('عنوان مقاله الزامی است.', 'error');
      return;
    }

    if (editingBlog) {
      setBlogs(
        blogs.map((b) =>
          b.id === editingBlog.id
            ? {
                ...b,
                title: postTitle,
                slug: postSlug || postTitle.toLowerCase().replace(/\s+/g, '-'),
                category: postCategory,
                author: postAuthor,
                readTime: postReadTime,
                coverImage: postImage,
                excerpt: postExcerpt,
                content: postContent,
              }
            : b
        )
      );
      showToast('مقاله وبلاگ با موفقیت ویرایش شد.', 'success');
    } else {
      const newPost: BlogPost = {
        id: `blog-${Date.now()}`,
        title: postTitle,
        slug: postSlug || `post-${Date.now()}`,
        category: postCategory,
        author: postAuthor,
        readTime: postReadTime,
        coverImage: postImage,
        excerpt: postExcerpt,
        content: postContent,
        tags: ['مد', 'فشن', 'پوشاک'],
        createdAt: new Date().toISOString(),
      };
      setBlogs([newPost, ...blogs]);
      showToast('مقاله جدید منتشر گردید.', 'success');
    }
    setBlogModalOpen(false);
  };

  // Delete Blog
  const handleDeleteBlog = (id: string) => {
    setBlogs(blogs.filter((b) => b.id !== id));
    showToast('مقاله حذف شد.', 'info');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-outline mb-1 font-mono">
            <span>پنل مدیریت</span>
            <span>/</span>
            <span className="text-primary font-bold">مدیریت وبلاگ و صفحات</span>
          </div>
          <h1 className="text-xl font-black text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">article</span>
            <span>مدیریت مجله مد، وبلاگ و صفحات استاتیک</span>
          </h1>
        </div>

        {activeTab === 'blogs' && (
          <button
            onClick={openCreateBlog}
            className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container shadow transition flex items-center gap-1.5 active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">edit_note</span>
            <span>نگارش مقاله جدید</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/60 pb-1 text-xs font-bold">
        <button
          onClick={() => setActiveTab('blogs')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 ${
            activeTab === 'blogs'
              ? 'bg-primary text-white shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-base">auto_stories</span>
          <span>مقالات مجله مد و استایل ({toPersianDigits(blogs.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('pages')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 ${
            activeTab === 'pages'
              ? 'bg-primary text-white shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-base">web</span>
          <span>صفحات اطلاع‌رسانی و استاتیک ({toPersianDigits(staticPages.length)})</span>
        </button>
      </div>

      {/* TAB 1: BLOG POSTS */}
      {activeTab === 'blogs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogs.map((b) => (
            <div
              key={b.id}
              className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="relative h-44 overflow-hidden bg-gray-100">
                  <img src={b.coverImage} alt={b.title} className="w-full h-full object-cover" />
                  <span className="absolute top-2 start-2 px-2.5 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold backdrop-blur-xs">
                    {b.category}
                  </span>
                </div>

                <div className="p-4 space-y-2">
                  <h4 className="font-bold text-sm text-on-surface line-clamp-2 leading-relaxed">{b.title}</h4>
                  <p className="text-xs text-outline line-clamp-2 leading-relaxed">{b.excerpt}</p>
                  <div className="flex items-center justify-between text-[11px] text-outline pt-2 border-t border-outline-variant/40">
                    <span>{b.author}</span>
                    <span>خواندن: {b.readTime}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0 flex items-center justify-between border-t border-outline-variant/40 pt-3">
                <a
                  href={`/blog/${b.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline text-xs font-bold flex items-center gap-1"
                >
                  <span>مشاهده در سایت</span>
                  <span className="material-symbols-outlined text-sm rtl:rotate-180">arrow_forward</span>
                </a>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditBlog(b)}
                    className="px-3 py-1 rounded-lg border border-outline-variant hover:bg-surface-container text-xs font-bold"
                  >
                    ویرایش
                  </button>
                  <button
                    onClick={() => handleDeleteBlog(b.id)}
                    className="p-1 rounded-lg text-error hover:bg-error/10"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: STATIC PAGES */}
      {activeTab === 'pages' && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xs overflow-hidden">
          <table className="w-full text-right text-xs">
            <thead className="bg-surface-container-high text-on-surface font-bold border-b border-outline-variant">
              <tr>
                <th className="p-3">عنوان صفحه</th>
                <th className="p-3 font-mono">مسیر URL</th>
                <th className="p-3 font-mono">آخرین به‌روزرسانی</th>
                <th className="p-3 text-center">وضعیت انتشار</th>
                <th className="p-3 text-center">مشاهده</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {staticPages.map((p) => (
                <tr key={p.id} className="hover:bg-surface-container-low transition">
                  <td className="p-3 font-bold text-on-surface">{p.title}</td>
                  <td className="p-3 font-mono text-[11px] text-primary font-bold">/{p.slug}</td>
                  <td className="p-3 font-mono text-outline">{p.lastUpdated}</td>
                  <td className="p-3 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      منتشر شده
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <a
                      href={`/${p.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 rounded-lg border border-outline-variant hover:bg-surface-container text-xs font-bold inline-flex items-center gap-1"
                    >
                      <span>بازدید</span>
                      <span className="material-symbols-outlined text-xs rtl:rotate-180">open_in_new</span>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* BLOG MODAL */}
      {blogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-outline-variant space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <h3 className="font-bold text-sm text-on-surface">
                {editingBlog ? 'ویرایش مقاله مجله مد' : 'نگارش مقاله جدید در وبلاگ'}
              </h3>
              <button
                onClick={() => setBlogModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-outline"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveBlog} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-on-surface">عنوان مقاله *</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: راهنمای انتخاب پالتو فوتر در زمستان..."
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-on-surface">اسلاگ (URL)</label>
                  <input
                    type="text"
                    value={postSlug}
                    onChange={(e) => setPostSlug(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-on-surface">دسته‌بندی مقاله</label>
                  <input
                    type="text"
                    value={postCategory}
                    onChange={(e) => setPostCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-on-surface">زمان مطالعه</label>
                  <input
                    type="text"
                    value={postReadTime}
                    onChange={(e) => setPostReadTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-on-surface">آدرس اینترنتی تصویر شاخص *</label>
                <input
                  type="url"
                  required
                  value={postImage}
                  onChange={(e) => setPostImage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-on-surface">خلاصه کوتاه پیش‌نمایش</label>
                <textarea
                  rows={2}
                  value={postExcerpt}
                  onChange={(e) => setPostExcerpt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface leading-relaxed"
                ></textarea>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-on-surface">متن کامل مقاله</label>
                <textarea
                  rows={6}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="محتوای متنی مقاله..."
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface leading-relaxed"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setBlogModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-outline hover:bg-surface-container"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary-container shadow transition"
                >
                  انتشار مقاله
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
