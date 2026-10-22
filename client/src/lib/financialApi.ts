import { authFetch } from './authFetch';
export interface CartInput { product_id: number; variant_id: number | null; quantity: number }
export interface QuoteLine extends CartInput { key: string; title: string; sku: string; unit_price: number; listed_subtotal: number; sale_discount: number; automatic_discount: number; coupon_discount: number; tax_added: number; tax_amount: number; rounding_adjustment: number; line_total: number }
export interface Totals { subtotal: number; items_discount: number; coupon_discount: number; vat_amount: number; included_vat: number; rounding_adjustment: number; merchandise_total: number; shipping_fee: number | null; payable_total: number | null }
export interface Quote { unit: 'TOMAN'; lines: QuoteLine[]; totals: Totals; coupon_code: string | null; coupon_id: number | null; checkout_ready: boolean }
export interface CartResponse { version: number; items: CartInput[]; pricing: Quote | null; errors: Record<string, string[]>; merge_conflict: boolean; pending_guest_items: CartInput[] }
export interface SavedAddress { id: number; title: string; recipient_name: string; recipient_phone: string; province: string; city: string; postal_code: string; street_address: string; zone_code: string | null }
export interface CheckoutInput { version: number; address_id: number; shipping_method: string; payment_method: 'wallet' | 'cod' | 'card_to_card'; coupon: string | null; idempotency_key: string }
export interface ServerOrder { id: number; order_number: string; tracking_code: string; status: string; payment_state: string; payment_method: string; payable_total: number; total_paid: number; rounding_adjustment: number; invoice: Quote | null; items: QuoteLine[]; shipping_address: SavedAddress; created_at: string; receipt_url: string | null; timeline: { action: string; actor_role: string; to_status: string; to_payment_state: string; created_at: string }[] }
export class FinancialError extends Error { constructor(message: string, public status: number, public body: any) { super(message); } }
export async function financialRequest<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
  const multipart = data instanceof FormData;
  const res = await authFetch('/api' + path, { method, headers: multipart ? {} : { 'Content-Type': 'application/json' }, body: data === undefined ? undefined : multipart ? data : JSON.stringify(data) });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = body?.errors ? Object.values(body.errors).flat().find(v => typeof v === 'string') : null;
    // Never expose production SQL/exception messages on server failures.
    throw new FinancialError(res.status >= 500 ? 'خطای سرور؛ نتیجه عملیات را از سفارش‌های خود بررسی کنید.' : String(({ 401: 'برای این عملیات وارد حساب شوید.', 403: 'اجازه این عملیات را ندارید.', 404: 'موردی برای این حساب یافت نشد.' } as Record<number, string>)[res.status] || detail || body?.message || body?.error || 'درخواست انجام نشد.'), res.status, body);
  }
  return body;
}
export const financialApi = {
  cart: () => financialRequest<CartResponse>('/cart'),
  replace: (items: CartInput[], version: number) => financialRequest<CartResponse>('/cart', 'PUT', { items, version }),
  quote: (items: CartInput[], coupon: string | null) => financialRequest<Quote>('/quote', 'POST', { items, coupon }),
  merge: () => financialRequest('/cart/merge', 'POST'),
  options: () => financialRequest<{ addresses: SavedAddress[]; shipping: { method: string; zone: string; cod: boolean }[] }>('/checkout/options'),
  checkoutQuote: (input: CheckoutInput) => financialRequest<Quote>('/checkout/quote', 'POST', input),
  checkout: (input: CheckoutInput) => financialRequest<{ order: ServerOrder }>('/checkout', 'POST', input),
  order: (id: string) => financialRequest<{ order: ServerOrder }>('/orders/' + encodeURIComponent(id)),
  orders: (page = 1) => financialRequest<{ data: ServerOrder[]; current_page: number; last_page: number }>('/orders?page=' + page),
  track: (code: string) => financialRequest<{ order_number: string; status: string; payment_state: string; created_at: string }>('/orders/track/' + encodeURIComponent(code)),
  cancel: (id: string) => financialRequest<{ order: ServerOrder }>('/orders/' + encodeURIComponent(id) + '/cancel', 'POST', { reason: 'لغو توسط مشتری' }),
  receipt: (id: string, file: File) => { const data = new FormData(); data.append('file', file); return financialRequest<{ order: ServerOrder }>('/orders/' + encodeURIComponent(id) + '/receipt', 'POST', data); },
};
export const paymentNames: Record<string, string> = { wallet: 'کیف پول کامل', cod: 'پرداخت هنگام تحویل', card_to_card: 'کارت به کارت؛ نیازمند بررسی رسید' };
export const paymentStates: Record<string, string> = { unpaid: 'پرداخت نشده', pending_verification: 'رسید در انتظار بررسی', paid: 'پرداخت تاییدشده', failed: 'ناموفق', refunded: 'بازگشت مبلغ به کیف پول' };
export const orderStates: Record<string, string> = { pending: 'ثبت اولیه', awaiting_payment: 'در انتظار پرداخت', processing: 'در حال آماده‌سازی', shipped: 'ارسال شده', delivered: 'تحویل داده شده', cancelled: 'لغو شده', failed: 'ناموفق', refunded: 'مسترد شده' };
// SQL dates are UTC, not the browser's local timezone.
export const utcDate = (value: string) => /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d(?:\.\d+)?$/.test(value) ? value.replace(' ', 'T') + 'Z' : value;
