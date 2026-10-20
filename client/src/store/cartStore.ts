import { create } from 'zustand';
import { CartItem, Coupon, Product, ProductVariant } from '../../shared/types';
import { api } from '../lib/api';

interface CartStore {
  items: CartItem[];
  isMiniCartOpen: boolean;
  coupon: Coupon | null;
  couponCodeInput: string;
  isApplyingCoupon: boolean;
  couponError: string | null;

  // Actions
  openMiniCart: () => void;
  closeMiniCart: () => void;
  toggleMiniCart: () => void;
  addItem: (itemOrProduct: CartItem | Product, quantity?: number, variant?: ProductVariant) => void;
  removeItem: (idOrProductId: string, colorHex?: string, size?: string) => void;
  updateQuantity: (idOrProductId: string, quantity: number, colorHex?: string, size?: string) => void;
  clearCart: () => void;
  setCouponCodeInput: (code: string) => void;
  applyCoupon: (code?: string) => Promise<boolean>;
  removeCoupon: () => void;

  // Getters
  getItemsCount: () => number;
  getRawSubtotal: () => number;
  getSubtotal: () => number;
  getItemsDiscount: () => number;
  getDiscountTotal: () => number;
  getFinalItemsTotal: () => number;
  getCouponDiscount: () => number;
  getShippingFee: () => number;
  getGrandTotal: () => number;
}

const INITIAL_CART_ITEMS: CartItem[] = [
  {
    id: 'item-init-1',
    productId: 'prod-1',
    productTitle: 'پالتو پشمی دوطرفه فوتر کلاسیک مدل ۲۰۲۵',
    productSku: 'VST-CL-4801',
    productImage: '/images/catalog-placeholder.svg',
    brand: 'هاکوپیان',
    price: 3000000,
    salePrice: 2400000,
    quantity: 1,
    selectedColor: { name: 'سرمه‌ای تیره', hex: '#1b263b' },
    selectedSize: 'L',
    maxStock: 5,
    unit: 'عدد',
    product: {
      id: 'prod-1',
      title: 'پالتو پشمی دوطرفه فوتر کلاسیک مدل ۲۰۲۵',
      mainImage: '/images/catalog-placeholder.svg',
      brand: 'هاکوپیان',
      price: 3000000,
      salePrice: 2400000,
      sku: 'VST-CL-4801',
    },
    selectedVariant: {
      colorName: 'سرمه‌ای تیره',
      colorHex: '#1b263b',
      size: 'L',
      price: 3000000,
      salePrice: 2400000,
    },
  },
  {
    id: 'item-init-2',
    productId: 'prod-2',
    productTitle: 'کفش کتانی چرم طبیعی اسپرت ارگونومیک',
    productSku: 'VST-SH-1092',
    productImage: '/images/catalog-placeholder.svg',
    brand: 'چرم مشهد',
    price: 1980000,
    salePrice: 1683000,
    quantity: 1,
    selectedColor: { name: 'کرم روشن', hex: '#f4ecd8' },
    selectedSize: '۴۲',
    maxStock: 8,
    unit: 'جفت',
    product: {
      id: 'prod-2',
      title: 'کفش کتانی چرم طبیعی اسپرت ارگونومیک',
      mainImage: '/images/catalog-placeholder.svg',
      brand: 'چرم مشهد',
      price: 1980000,
      salePrice: 1683000,
      sku: 'VST-SH-1092',
    },
    selectedVariant: {
      colorName: 'کرم روشن',
      colorHex: '#f4ecd8',
      size: '۴۲',
      price: 1980000,
      salePrice: 1683000,
    },
  },
];

const savedCart = typeof window !== 'undefined' ? localStorage.getItem('digistyle_cart') : null;
const parsedInitialItems: CartItem[] = savedCart ? JSON.parse(savedCart) : INITIAL_CART_ITEMS;

export const useCartStore = create<CartStore>((set, get) => ({
  items: parsedInitialItems,
  isMiniCartOpen: false,
  coupon: {
    id: 'c-1',
    code: 'VISTA2025',
    type: 'fixed',
    value: 150000,
    usedCount: 0,
    isActive: true,
  },
  couponCodeInput: 'VISTA2025',
  isApplyingCoupon: false,
  couponError: null,

  openMiniCart: () => set({ isMiniCartOpen: true }),
  closeMiniCart: () => set({ isMiniCartOpen: false }),
  toggleMiniCart: () => set((state) => ({ isMiniCartOpen: !state.isMiniCartOpen })),

  addItem: (itemOrProduct: any, qty = 1, variant) => {
    set((state) => {
      let newItem: CartItem;

      // Check if it's already a CartItem
      if (itemOrProduct.productId && itemOrProduct.productTitle) {
        newItem = {
          id: itemOrProduct.id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          productId: itemOrProduct.productId,
          productTitle: itemOrProduct.productTitle,
          productSku: itemOrProduct.productSku || '',
          productImage: itemOrProduct.productImage || '',
          brand: itemOrProduct.brand || '',
          price: itemOrProduct.price || 0,
          salePrice: itemOrProduct.salePrice,
          quantity: itemOrProduct.quantity || 1,
          selectedColor: itemOrProduct.selectedColor,
          selectedSize: itemOrProduct.selectedSize,
          maxStock: itemOrProduct.maxStock || 10,
          unit: itemOrProduct.unit || 'عدد',
          product: itemOrProduct.product || {
            id: itemOrProduct.productId,
            title: itemOrProduct.productTitle,
            mainImage: itemOrProduct.productImage,
            brand: itemOrProduct.brand,
            price: itemOrProduct.price,
            salePrice: itemOrProduct.salePrice,
          },
          selectedVariant: itemOrProduct.selectedVariant || (itemOrProduct.selectedColor || itemOrProduct.selectedSize ? {
            colorName: itemOrProduct.selectedColor?.name,
            colorHex: itemOrProduct.selectedColor?.hex,
            size: itemOrProduct.selectedSize,
            price: itemOrProduct.price,
            salePrice: itemOrProduct.salePrice,
          } : undefined),
        };
      } else {
        // It's a Product
        const p = itemOrProduct as Product;
        newItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          productId: p.id,
          productTitle: p.title,
          productSku: p.sku || '',
          productImage: p.mainImage,
          brand: p.brand || '',
          price: variant?.price || p.price,
          salePrice: variant?.salePrice || p.salePrice,
          quantity: qty,
          selectedColor: variant?.colorName ? { name: variant.colorName, hex: variant.colorHex || '#000' } : undefined,
          selectedSize: variant?.size,
          maxStock: variant?.stock || p.stock || 10,
          unit: 'عدد',
          product: p,
          selectedVariant: variant,
        };
      }

      const existingIndex = state.items.findIndex(
        (i) =>
          i.productId === newItem.productId &&
          i.selectedColor?.hex === newItem.selectedColor?.hex &&
          i.selectedSize === newItem.selectedSize
      );

      let updatedItems: CartItem[];
      if (existingIndex > -1) {
        updatedItems = [...state.items];
        const existing = updatedItems[existingIndex];
        const newQty = Math.min(existing.quantity + newItem.quantity, existing.maxStock || 10);
        updatedItems[existingIndex] = { ...existing, quantity: newQty };
      } else {
        updatedItems = [...state.items, newItem];
      }

      localStorage.setItem('digistyle_cart', JSON.stringify(updatedItems));
      return { items: updatedItems, isMiniCartOpen: true };
    });
  },

  removeItem: (idOrProductId, colorHex, size) => {
    set((state) => {
      const updated = state.items.filter(
        (i) =>
          !(
            (i.id === idOrProductId) ||
            (i.productId === idOrProductId &&
              (!colorHex || i.selectedColor?.hex === colorHex) &&
              (!size || i.selectedSize === size))
          )
      );
      localStorage.setItem('digistyle_cart', JSON.stringify(updated));
      return { items: updated };
    });
  },

  updateQuantity: (idOrProductId, quantity, colorHex, size) => {
    if (quantity <= 0) {
      get().removeItem(idOrProductId, colorHex, size);
      return;
    }

    set((state) => {
      const updated = state.items.map((i) => {
        if (
          i.id === idOrProductId ||
          (i.productId === idOrProductId &&
            (!colorHex || i.selectedColor?.hex === colorHex) &&
            (!size || i.selectedSize === size))
        ) {
          return { ...i, quantity: Math.min(quantity, i.maxStock || 10) };
        }
        return i;
      });

      localStorage.setItem('digistyle_cart', JSON.stringify(updated));
      return { items: updated };
    });
  },

  clearCart: () => {
    localStorage.removeItem('digistyle_cart');
    set({ items: [], coupon: null, couponCodeInput: '' });
  },

  setCouponCodeInput: (code: string) => set({ couponCodeInput: code, couponError: null }),

  applyCoupon: async (codeArg?: string) => {
    const code = typeof codeArg === 'string' ? codeArg : get().couponCodeInput;
    if (!code || !code.trim()) {
      set({ couponError: 'لطفاً کد تخفیف را وارد فرمایید.' });
      return false;
    }

    set({ isApplyingCoupon: true, couponError: null });
    try {
      const subtotal = get().getRawSubtotal();
      const res = await api.validateCoupon(code.trim(), subtotal);
      set({ coupon: res.coupon, isApplyingCoupon: false, couponError: null });
      return true;
    } catch (err: any) {
      set({
        couponError: err.message || 'کد تخفیف وارد شده معتبر نمی‌باشد.',
        isApplyingCoupon: false,
      });
      return false;
    }
  },

  removeCoupon: () => set({ coupon: null, couponCodeInput: '' }),

  getItemsCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },

  getRawSubtotal: () => {
    return get().items.reduce((sum, item) => {
      const effectivePrice = item.selectedVariant?.salePrice || item.selectedVariant?.price || item.salePrice || item.price || 0;
      return sum + effectivePrice * item.quantity;
    }, 0);
  },

  getSubtotal: () => {
    return get().getRawSubtotal();
  },

  getItemsDiscount: () => {
    return get().items.reduce((sum, item) => {
      const original = item.selectedVariant?.price || item.price || 0;
      const effective = item.selectedVariant?.salePrice || item.selectedVariant?.price || item.salePrice || item.price || original;
      return sum + Math.max(0, original - effective) * item.quantity;
    }, 0);
  },

  getDiscountTotal: () => {
    return get().getItemsDiscount();
  },

  getFinalItemsTotal: () => {
    return get().getRawSubtotal();
  },

  getCouponDiscount: () => {
    const { coupon } = get();
    if (!coupon) return 0;
    const subtotal = get().getRawSubtotal();
    if (coupon.type === 'percent') {
      const discount = Math.round((subtotal * coupon.value) / 100);
      return coupon.maxDiscountAmount ? Math.min(discount, coupon.maxDiscountAmount) : discount;
    }
    return coupon.value;
  },

  getShippingFee: () => {
    const subtotal = get().getRawSubtotal();
    // 4,000,000 Toman threshold
    if (subtotal >= 4000000 || subtotal === 0) return 0;
    return 45000;
  },

  getGrandTotal: () => {
    const subtotal = get().getRawSubtotal();
    const couponDisc = get().getCouponDiscount();
    const shipping = get().getShippingFee();
    return Math.max(0, subtotal - couponDisc + shipping);
  },
}));
