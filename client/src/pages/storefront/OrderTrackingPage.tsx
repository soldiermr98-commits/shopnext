import { financialDate as toJalaliDate } from '../../lib/financialDate';
import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Link, useSearchParams } from 'react-router-dom';
import { financialApi, orderStates, paymentStates, utcDate } from '../../lib/financialApi';

export const OrderTrackingPage: React.FC = () => {
  const { user } = useAuthStore();
  const generation = useRef(0);
  const [owner, setOwner] = useState<string | null>(null);
  const [params] = useSearchParams();
  const [input, setInput] = useState(params.get('code') ?? '');
  const [data, setData] = useState<Awaited<ReturnType<typeof financialApi.track>> | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function track(code: string) {
    const ticket = ++generation.current;
    setBusy(true); setError(''); setData(null);
    try { const result = await financialApi.track(code.trim()); if (ticket === generation.current && useAuthStore.getState().user?.id === user?.id) { setData(result); setOwner(user?.id ?? null); } } catch (e) { if (ticket === generation.current) setError((e as Error).message); } finally { if (ticket === generation.current) setBusy(false); }
  }
  useEffect(() => { generation.current++; setData(null); const code = params.get('code'); if (code && user) { setInput(code); void track(code); } return () => { generation.current++; }; }, [params, user?.id]);
  return <div className="space-y-8 pb-16 max-w-4xl mx-auto"><h1 className="text-xl font-black">پیگیری خصوصی سفارش</h1><p className="text-xs">فقط با ورود به حساب صاحب سفارش؛ کد رهگیری مجوز مشاهده سفارش دیگران نیست.</p>
    <form onSubmit={e => { e.preventDefault(); void track(input); }} className="flex gap-3"><label className="flex-1">کد رهگیری<input className="block w-full border rounded-xl p-3" value={input} onChange={e => setInput(e.target.value)} /></label><button disabled={busy || !input.trim()} className="px-6 rounded-xl bg-primary text-white">پیگیری وضعیت</button></form>
    {error && <p role="alert" className="text-red-700">{error}</p>}{busy && <p role="status">دریافت وضعیت…</p>}
    {data && user && owner === user.id && <div className="bg-surface rounded-3xl p-6 border space-y-3"><h2 className="font-black">{data.order_number}</h2><p>{orderStates[data.status] ?? data.status}</p><p>{paymentStates[data.payment_state] ?? data.payment_state}</p><p>{toJalaliDate(utcDate(data.created_at))}</p></div>}
    <Link to="/account#orders" className="underline">فهرست سفارش‌ها</Link>
  </div>;
};
