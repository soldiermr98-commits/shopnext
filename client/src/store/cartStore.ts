// No browser cart prices, seeded purchases, JWTs, or local monetary authority.
import { create } from 'zustand';
import type { CartItem, Product, ProductVariant } from '../../shared/types';
import { financialApi, type CartInput, type CartResponse, type Quote, type QuoteLine } from '../lib/financialApi';
import { useAuthStore } from './authStore';
import { useToastStore } from './toastStore';
type Item = CartItem & { serverLine?: QuoteLine };
interface CartStore {
  items: Item[]; rawItems: CartInput[]; version: number; pricing: Quote | null;
  loaded: boolean; busy: boolean; error: string | null; mergeConflict: boolean;
  isMiniCartOpen: boolean; coupon: { code: string } | null; couponCodeInput: string; isApplyingCoupon: boolean; couponError: string | null;
  refresh: () => Promise<void>; retryMerge: () => Promise<void>;
  openMiniCart: () => void; closeMiniCart: () => void; toggleMiniCart: () => void;
  addItem: (p: CartItem | Product, qty?: number, variant?: ProductVariant) => Promise<void>;
  removeItem: (id: string, color?: string, size?: string) => Promise<void>;
  updateQuantity: (id: string, qty: number, color?: string, size?: string) => Promise<void>;
  clearCart: () => Promise<void>; setCouponCodeInput: (code: string) => void;
  applyCoupon: (code?: string) => Promise<boolean>; removeCoupon: () => void;
  getItemsCount: () => number; getSubtotal: () => number | null; getGrandTotal: () => number | null;
}
const key = (i: CartInput) => `${i.product_id}:${i.variant_id ?? 0}`;
let epoch = 0;
let pending: Promise<void> = Promise.resolve();
// Explicitly discard the old demo's untrusted monetary data; never import it.
if (typeof localStorage !== 'undefined') localStorage.removeItem('digistyle_cart');
export const useCartStore = create<CartStore>((set, get) => {
  function receive(c: CartResponse, pricing = c.pricing) {
    set({ rawItems: c.items, version: c.version, pricing, loaded: true, mergeConflict: c.merge_conflict,
      error: Object.values(c.errors).flat().join(' ') || null,
      items: c.items.map(i => { const line = pricing?.lines.find(l => key(l) === key(i)); return { id: key(i), productId: String(i.product_id), quantity: i.quantity, productTitle: line?.title ?? `کالا ${i.product_id}`, productSku: line?.sku, productImage: '/images/catalog-placeholder.svg', selectedVariant: i.variant_id ? { id: String(i.variant_id) } : undefined, serverLine: line }; }),
    });
  }
  async function load(e: number) {
    const cart = await financialApi.cart();
    if (e !== epoch) return;
    receive(cart);
    const code = get().coupon?.code;
    if (code) { try { const quote = await financialApi.quote(cart.items, code); if (e === epoch) receive(cart, quote); } catch (err) { if (e === epoch) set({ pricing: null, couponError: (err as Error).message }); } }
  }
  function mutate(build: (items: CartInput[]) => CartInput[]) {
    const e = epoch;
    const task = async () => {
      if (e !== epoch) return;
      set({ busy: true, error: null, pricing: null });
      try {
        if (!get().loaded) await load(e);
        if (e !== epoch) return;
        const c = await financialApi.replace(build(get().rawItems), get().version);
        if (e !== epoch) return;
        receive(c);
        if (get().coupon) await load(e);
      } catch (err) {
        if (e !== epoch) return;
        const message = (err as Error).message;
        try { await load(e); } catch { /* retain explicit error, never optimistic money */ }
        if (e === epoch) { set({ error: message }); useToastStore.getState().showToast(message, 'error'); }
      } finally { if (e === epoch) set({ busy: false }); }
    };
    pending = pending.then(task, task); return pending;
  }
  return {
    items: [], rawItems: [], version: 0, pricing: null, loaded: false, busy: false, error: null, mergeConflict: false,
    isMiniCartOpen: false, coupon: null, couponCodeInput: '', isApplyingCoupon: false, couponError: null,
    refresh: async () => { const e = epoch; set({ busy: true, pricing: null }); try { await load(e); } catch (err) { if (e === epoch) set({ error: (err as Error).message }); } finally { if (e === epoch) set({ busy: false }); } },
    retryMerge: async () => { try { await financialApi.merge(); } catch (err) { set({ error: (err as Error).message }); } await get().refresh(); },
    openMiniCart: () => set({ isMiniCartOpen: true }), closeMiniCart: () => set({ isMiniCartOpen: false }), toggleMiniCart: () => set({ isMiniCartOpen: !get().isMiniCartOpen }),
    addItem: async (p, qty = 1, variant) => {
      const productId = Number('productId' in p ? p.productId : p.id);
      const v = variant?.id ?? ('selectedVariant' in p ? p.selectedVariant?.id : null);
      const variantId = v == null ? null : Number(v);
      if (!Number.isSafeInteger(productId) || productId < 1 || (variantId !== null && (!Number.isSafeInteger(variantId) || variantId < 1))) { useToastStore.getState().showToast('شناسه واقعی کالا یا تنوع لازم است.', 'error'); return; }
      await mutate(items => { const k = key({ product_id: productId, variant_id: variantId, quantity: qty }); const found = items.find(i => key(i) === k); return found ? items.map(i => key(i) === k ? { ...i, quantity: i.quantity + qty } : i) : [...items, { product_id: productId, variant_id: variantId, quantity: qty }]; });
      if (!get().error) { set({ isMiniCartOpen: true }); useToastStore.getState().showToast('سبد خرید از سرور به‌روزرسانی شد.', 'success'); }
    },
    removeItem: (id) => mutate(items => items.filter(i => key(i) !== id && String(i.product_id) !== id)),
    updateQuantity: (id, quantity) => mutate(items => items.flatMap(i => key(i) === id || String(i.product_id) === id ? quantity > 0 ? [{ ...i, quantity }] : [] : [i])),
    clearCart: () => mutate(() => []),
    setCouponCodeInput: code => set({ couponCodeInput: code, couponError: null }),
    applyCoupon: async code => {
      const e = epoch; const value = (code ?? get().couponCodeInput).trim();
      if (!value || get().busy) return false;
      set({ isApplyingCoupon: true, couponError: null, pricing: null });
      try { const q = await financialApi.quote(get().rawItems, value); if (e !== epoch) return false; set({ coupon: { code: q.coupon_code! }, pricing: q, items: get().items.map(i => ({ ...i, serverLine: q.lines.find(l => key(l) === i.id) })) }); return true; }
      catch (err) { if (e === epoch) set({ couponError: (err as Error).message }); return false; }
      finally { if (e === epoch) set({ isApplyingCoupon: false }); }
    },
    removeCoupon: () => { set({ coupon: null, couponCodeInput: '', couponError: null }); void get().refresh(); },
    getItemsCount: () => get().rawItems.reduce((n, i) => n + i.quantity, 0),
    getSubtotal: () => get().pricing?.totals.subtotal ?? null,
    getGrandTotal: () => get().pricing?.totals.payable_total ?? null,
  };
});
useAuthStore.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id || (previous.isLoading && !state.isLoading)) {
    epoch++;
    useCartStore.setState({ items: [], rawItems: [], pricing: null, loaded: false, error: null, mergeConflict: false, coupon: null, couponCodeInput: '', couponError: null });
    void useCartStore.getState().refresh();
  }
});
