// Same-origin, cookie-only session transport. One refresh attempt shared within a browser tab.
let refreshing: Promise<boolean> | null = null;
export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const send = () => fetch(url, { ...init, credentials: 'same-origin' });
  const response = await send();
  if (response.status !== 401 || /\/auth\/(login|register|refresh|logout|otp)/.test(url)) return response;
  if (!refreshing) refreshing = fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' })
    .then(r => r.ok).catch(() => false).finally(() => { refreshing = null; });
  return await refreshing ? send() : response;
}
