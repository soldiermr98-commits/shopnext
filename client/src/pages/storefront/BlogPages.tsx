// ===== STOREFRONT BLOG & MAGAZINE PAGES =====
// Articles list and single post reader with styled typography and breadcrumbs

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { BlogPost } from '../../../shared/types';
import { toJalaliDate } from '../../lib/persian';
import { Breadcrumb } from '../../components/shared/Breadcrumb';

export const BlogListPage: React.FC = () => {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getBlogs().then((res) => {
      setBlogs(res);
      setLoading(false);
    }).catch(console.error);
  }, []);

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto">
      <Breadcrumb items={[{ label: 'مجله دیجی‌استایل', isCurrent: true }]} />

      <div className="text-center space-y-2 max-w-xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-black text-on-surface">مجله مد و سبک زندگی معاصر</h1>
        <p className="text-xs sm:text-sm text-on-surface-variant">
          راهنمای خرید، تحلیل ترندهای پوشاک، اصول ست کردن رنگ‌ها و مراقبت تخصصی از البسه چرمی و پشمی
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-on-surface-variant">در حال بارگذاری مقالات...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {blogs.map((b) => (
            <Link
              key={b.id}
              to={`/blog/${b.slug}`}
              className="bg-surface rounded-2xl overflow-hidden border border-outline-variant/60 hover:shadow-lg transition group flex flex-col justify-between"
            >
              <div>
                <div className="aspect-[16/10] overflow-hidden bg-surface-container-high">
                  <img src={b.coverImage} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-5 space-y-2.5">
                  <div className="flex items-center gap-2 text-[11px] text-on-surface-variant font-medium">
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">{b.category}</span>
                    <span>•</span>
                    <span>زمان مطالعه: {b.readTime}</span>
                  </div>
                  <h2 className="text-sm font-black text-on-surface line-clamp-2 leading-snug group-hover:text-primary transition">
                    {b.title}
                  </h2>
                  <p className="text-xs text-on-surface-variant line-clamp-3 leading-relaxed">
                    {b.excerpt}
                  </p>
                </div>
              </div>
              <div className="p-5 pt-0 flex items-center justify-between text-xs text-primary font-bold">
                <span>خواندن کامل مقاله</span>
                <span className="material-symbols-outlined text-xs rtl:rotate-180">arrow_forward</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.getBlog(slug).then((res) => {
      setPost(res);
      setLoading(false);
    }).catch(console.error);
  }, [slug]);

  if (loading) {
    return <div className="py-20 text-center text-xs text-on-surface-variant">در حال بارگذاری مقاله...</div>;
  }

  if (!post) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-lg font-bold text-on-surface">مقاله مورد نظر یافت نشد</h2>
        <Link to="/blog" className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold inline-block">
          بازگشت به مقالات
        </Link>
      </div>
    );
  }

  return (
    <article className="space-y-8 pb-16 max-w-3xl mx-auto">
      <Breadcrumb
        items={[
          { label: 'مجله دیجی‌استایل', href: '/blog' },
          { label: post.category, href: '/blog' },
          { label: post.title, isCurrent: true },
        ]}
      />

      <div className="space-y-4">
        <div className="flex items-center gap-3 text-xs text-on-surface-variant font-medium">
          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{post.category}</span>
          <span>•</span>
          <span>نویسنده: {post.author}</span>
          <span>•</span>
          <span>زمان مطالعه: {post.readTime}</span>
          <span>•</span>
          <span>تاریخ انتشار: {toJalaliDate(post.createdAt)}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-on-surface leading-snug">
          {post.title}
        </h1>

        <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-surface-container-high border border-outline-variant/60 shadow-sm">
          <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
        </div>
      </div>

      <div className="text-sm leading-loose text-on-surface space-y-4 font-normal bg-surface p-6 sm:p-8 rounded-3xl border border-outline-variant/60 shadow-xs">
        {post.content.split('\n\n').map((paragraph: string, idx: number) => (
          <p key={idx}>{paragraph}</p>
        ))}

        {post.tags && post.tags.length > 0 && (
          <div className="pt-6 border-t border-outline-variant/50 flex flex-wrap gap-2 text-xs">
            <span className="font-bold text-on-surface-variant">برچسب‌ها:</span>
            {post.tags.map((tag: string, i: number) => (
              <span key={i} className="px-2.5 py-1 rounded-lg bg-surface-container-high text-on-surface font-medium">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
};
