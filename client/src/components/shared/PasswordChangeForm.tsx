// Mandatory first-login password rotation; the server enforces the restriction independently.
import React, { useState } from 'react';
import { authFetch } from '../../lib/authFetch';
import { useAuthStore } from '../../store/authStore';
export function PasswordChangeForm() {
  const [oldPassword, setOld] = useState(''), [newPassword, setNew] = useState('');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const setUser = useAuthStore(s => s.setUser);
  return <form className="max-w-md mx-auto p-8 space-y-4" onSubmit={async e => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const res = await authFetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldPassword, newPassword }) });
      if (!res.ok) throw new Error('تغییر رمز ناموفق بود. رمز فعلی و الزامات رمز جدید را بررسی کنید.');
      setUser((await res.json()).user); setOld(''); setNew('');
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }}>
    <h1 className="text-xl font-bold">تغییر رمز عبور الزامی است</h1>
    <label className="block">رمز فعلی<input className="block border p-2" type="password" autoComplete="current-password" required value={oldPassword} onChange={e => setOld(e.target.value)} /></label>
    <label className="block">رمز جدید (حداقل ۱۴ نویسه)<input className="block border p-2" type="password" autoComplete="new-password" minLength={14} required value={newPassword} onChange={e => setNew(e.target.value)} /></label>
    {error && <p role="alert">{error}</p>}
    <button className="p-2 bg-primary text-white rounded" disabled={busy}>ذخیرهٔ رمز جدید</button>
  </form>;
}
