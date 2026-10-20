// ===== ADMIN CUSTOMERS MANAGEMENT PAGE =====
// Customer accounts list with Gold membership status, wallet balances, club points, and national codes

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { User } from '../../../shared/types';
import { formatToman, toPersianDigits, toJalaliDate } from '../../lib/persian';

export const AdminCustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin.getCustomers().then((res) => {
      setCustomers(res);
      setLoading(false);
    }).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-on-surface">باشگاه مشتریان و کاربران سامانه</h1>
        <p className="text-xs text-on-surface-variant mt-0.5">
          لیست خریداران، وضعیت عضویت طلایی، موجودی کیف پول و امتیازات دیجی‌کلاب
        </p>
      </div>

      <div className="bg-surface rounded-2xl border border-outline-variant/60 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/50 text-on-surface font-black">
                <th className="p-3 text-start">نام و نام خانوادگی</th>
                <th className="p-3 text-start">شماره همراه</th>
                <th className="p-3 text-center">کد ملی</th>
                <th className="p-3 text-center">سطح کاربری</th>
                <th className="p-3 text-center">موجودی کیف پول</th>
                <th className="p-3 text-center">امتیاز باشگاه</th>
                <th className="p-3 text-center">تاریخ عضویت</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-on-surface-variant">
                    در حال بارگذاری اطلاعات کاربران...
                  </td>
                </tr>
              ) : customers.map((c) => (
                <tr key={c.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low transition">
                  <td className="p-3 font-bold text-on-surface flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                      {c.name.slice(0, 1)}
                    </div>
                    <span>{c.name}</span>
                  </td>
                  <td className="p-3 font-mono text-on-surface-variant">{c.phone}</td>
                  <td className="p-3 text-center font-mono text-on-surface-variant">{c.nationalCode || '—'}</td>
                  <td className="p-3 text-center">
                    {c.role === 'super_admin' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                        مدیر ارشد سامانه
                      </span>
                    ) : c.isGoldMember ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        ★ مشتری طلایی
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-surface-container-high text-on-surface-variant">
                        مشتری عادی
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-primary">
                    {formatToman(c.walletBalance || 0)}
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-amber-600">
                    {toPersianDigits(c.clubPoints || 0)} امتیاز
                  </td>
                  <td className="p-3 text-center font-mono text-on-surface-variant">
                    {toJalaliDate(c.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
