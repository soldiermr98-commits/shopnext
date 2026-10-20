// ===== ADMIN ACTIVITY LOGS PAGE =====
// Audit trail of administrative operations, login events, and inventory changes

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { ActivityLog } from '../../../shared/types';
import { toJalaliDate } from '../../lib/persian';

export const AdminLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin.getLogs().then((res) => {
      setLogs(res);
      setLoading(false);
    }).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-on-surface">گزارش وقایع و لاگ‌های امنیتی سیستم (Audit Logs)</h1>
        <p className="text-xs text-on-surface-variant mt-0.5">
          ثبت تغییرات موجودی، تغییر وضعیت سفارش‌ها و ورود مدیران به همراه آدرس IP
        </p>
      </div>

      <div className="bg-surface rounded-2xl border border-outline-variant/60 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/50 text-on-surface font-black">
                <th className="p-3 text-start">زمان رویداد</th>
                <th className="p-3 text-start">کاربر عامل</th>
                <th className="p-3 text-center">ماژول</th>
                <th className="p-3 text-start">شرح عملیات</th>
                <th className="p-3 text-start">جزئیات رویداد</th>
                <th className="p-3 text-center">آدرس IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-on-surface-variant">
                    در حال بارگذاری لاگ‌های امنیتی...
                  </td>
                </tr>
              ) : logs.map((l) => (
                <tr key={l.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low transition">
                  <td className="p-3 font-mono text-on-surface-variant">{toJalaliDate(l.createdAt)}</td>
                  <td className="p-3 font-bold text-on-surface">
                    <div>{l.userName}</div>
                    <span className="text-[10px] text-primary">{l.userRole}</span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-container-high text-on-surface">
                      {l.module}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-on-surface">{l.action}</td>
                  <td className="p-3 text-on-surface-variant line-clamp-1 max-w-sm">{l.details}</td>
                  <td className="p-3 text-center font-mono text-on-surface-variant">{l.ipAddress || '127.0.0.1'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
