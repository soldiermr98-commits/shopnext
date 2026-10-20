// Sanctum stateful SPA transport: session cookie is HttpOnly; only XSRF is read.
let csrfRequest: Promise<void> | null = null;

function xsrfToken(): string | null {
  const value = document.cookie.split(';').map(part => part.trim()).find(part => part.startsWith('XSRF-TOKEN='));
  return value ? decodeURIComponent(value.slice('XSRF-TOKEN='.length)) : null;
}

async function initializeCsrf(force = false): Promise<void> {
  if (!force && xsrfToken()) return;
  if (!csrfRequest) csrfRequest = (async () => {
    const response = await fetch('/sanctum/csrf-cookie', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    if (!response.ok || !xsrfToken()) throw new Error('CSRF initialization failed.');
  })().finally(() => { csrfRequest = null; });
  return csrfRequest;
}

export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  if (!url.startsWith('/') || url.startsWith('//')) throw new Error('Only same-origin relative API paths are supported.');
  const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes((init.method || 'GET').toUpperCase());
  if (unsafe) await initializeCsrf();
  const send = () => {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (unsafe) headers.set('X-XSRF-TOKEN', xsrfToken() || '');
    return fetch(url, { ...init, headers, credentials: 'same-origin' });
  };
  const response = await send();
  // Laravel rejects 419 before performing the action; retry that rejection once only.
  // 401 is a genuine guest/expired-session state, never a JWT-refresh or mock success.
  if (response.status !== 419 || !unsafe) return response;
  await initializeCsrf(true);
  return send();
}
