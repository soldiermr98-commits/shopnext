// ===== CLIENT API SERVICE LAYER =====
// HTTP client wrappers for Digistyle Persian online store and admin panel
// With graceful resilience and offline/startup fallback data

import { Product, Order, Category, BlogPost, StoreSettings, ActivityLog, Coupon, User } from '../../shared/types';
import {
  FALLBACK_CATEGORIES,
  FALLBACK_BANNERS,
  FALLBACK_BLOGS,
  FALLBACK_PRODUCTS,
  FALLBACK_SETTINGS,
} from './fallbackData';

const BASE_URL = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('digistyle_token') : null;
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (networkErr) {
    console.warn(`Network warning fetching ${endpoint}:`, networkErr);
    throw new Error('خطایی در ارتباط با سرور رخ داده است.');
  }

  if (!response.ok) {
    let errorMsg = `خطای سرور (${response.status})`;
    try {
      const errData = await response.json();
      if (errData && errData.error) errorMsg = errData.error;
    } catch {
      try {
        const text = await response.text();
        if (text) errorMsg = text.slice(0, 100);
      } catch {}
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Storefront
  getProducts: async (params: Record<string, any> = {}) => {
    try {
      const query = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') {
          query.set(k, String(v));
        }
      }
      return await request<{ products: Product[]; total: number; page: number; limit: number; totalPages: number }>(
        `/products?${query.toString()}`
      );
    } catch (err) {
      console.warn('Using fallback products data:', err);
      let list = [...FALLBACK_PRODUCTS];
      if (params.featured) {
        list = list.filter((p) => p.featured);
      }
      if (params.category) {
        list = list.filter((p) => p.categoryIds?.includes(params.category));
      }
      return {
        products: list,
        total: list.length,
        page: 1,
        limit: 12,
        totalPages: 1,
      };
    }
  },

  getProduct: async (idOrSlug: string) => {
    try {
      return await request<{ product: Product; related: Product[] }>(`/products/${idOrSlug}`);
    } catch (err) {
      console.warn('Using fallback product data:', err);
      const prod =
        FALLBACK_PRODUCTS.find((p) => p.id === idOrSlug || p.slug === idOrSlug) ||
        FALLBACK_PRODUCTS[0];
      const related = FALLBACK_PRODUCTS.filter((p) => p.id !== prod.id).slice(0, 4);
      return { product: prod, related };
    }
  },

  getCategories: async () => {
    try {
      return await request<Category[]>('/categories');
    } catch (err) {
      console.warn('Using fallback categories data:', err);
      return FALLBACK_CATEGORIES;
    }
  },

  getBanners: async () => {
    try {
      return await request<any[]>('/banners');
    } catch (err) {
      console.warn('Using fallback banners data:', err);
      return FALLBACK_BANNERS;
    }
  },

  getBlogs: async () => {
    try {
      return await request<BlogPost[]>('/blogs');
    } catch (err) {
      console.warn('Using fallback blogs data:', err);
      return FALLBACK_BLOGS;
    }
  },

  getBlog: async (slug: string) => {
    try {
      return await request<BlogPost>(`/blogs/${slug}`);
    } catch (err) {
      console.warn('Using fallback blog post:', err);
      const found = FALLBACK_BLOGS.find((b) => b.slug === slug) || FALLBACK_BLOGS[0];
      return found;
    }
  },

  validateCoupon: async (code: string, subtotal: number) => {
    return request<{ success: boolean; coupon: Coupon; discount: number; message: string }>('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, subtotal }),
    });
  },

  createOrder: async (orderData: any) => {
    return request<{ success: boolean; order: Order; message: string }>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  getMyOrders: async () => {
    try {
      return await request<Order[]>('/orders');
    } catch (err) {
      console.warn('Orders fetch notice:', err);
      return [];
    }
  },

  getOrder: async (id: string) => {
    return request<Order>(`/orders/${id}`);
  },

  trackOrder: async (code: string) => {
    return request<any>(`/orders/track/${code}`);
  },

  // Admin Endpoints
  admin: {
    getDashboard: async () => {
      try {
        return await request<{
          kpis: {
            totalSales: number;
            ordersCount: number;
            customersCount: number;
            averageOrderValue: number;
            conversionRate: string;
            lowStockCount: number;
          };
          salesChartData: { day: string; sales: number; orders: number }[];
          recentOrders: Order[];
          lowStockProducts: Product[];
          topProducts: Product[];
        }>('/admin/dashboard');
      } catch (err) {
        console.warn('Using fallback dashboard data:', err);
        return {
          kpis: {
            totalSales: 48900000,
            ordersCount: 38,
            customersCount: 142,
            averageOrderValue: 1286000,
            conversionRate: '۳.۴٪',
            lowStockCount: 3,
          },
          salesChartData: [
            { day: 'شنبه ۲۴ام', sales: 4200000, orders: 4 },
            { day: 'یکشنبه ۲۵ام', sales: 6100000, orders: 6 },
            { day: 'دوشنبه ۲۶ام', sales: 5300000, orders: 5 },
            { day: 'سه‌شنبه ۲۷ام', sales: 8900000, orders: 9 },
            { day: 'چهارشنبه ۲۸ام', sales: 11200000, orders: 12 },
            { day: 'پنج‌شنبه ۲۹ام', sales: 14500000, orders: 15 },
            { day: 'جمعه ۳۰ام', sales: 9800000, orders: 10 },
          ],
          recentOrders: [],
          lowStockProducts: FALLBACK_PRODUCTS.slice(0, 2),
          topProducts: FALLBACK_PRODUCTS,
        };
      }
    },

    getProducts: async (params: Record<string, any> = {}) => {
      try {
        const query = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined && v !== '') query.set(k, String(v));
        }
        return await request<{ products: Product[]; total: number }>(`/admin/products?${query.toString()}`);
      } catch (err) {
        console.warn('Using fallback admin products:', err);
        return { products: FALLBACK_PRODUCTS, total: FALLBACK_PRODUCTS.length };
      }
    },

    createProduct: async (product: Partial<Product>) => {
      return request<{ success: boolean; product: Product }>('/admin/products', {
        method: 'POST',
        body: JSON.stringify(product),
      });
    },

    updateProduct: async (id: string, updates: Partial<Product>) => {
      return request<{ success: boolean; product: Product }>(`/admin/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    deleteProduct: async (id: string) => {
      return request<{ success: boolean; message: string }>(`/admin/products/${id}`, {
        method: 'DELETE',
      });
    },

    getOrders: async (status?: string) => {
      try {
        const q = status ? `?status=${status}` : '';
        return await request<Order[]>(`/admin/orders${q}`);
      } catch (err) {
        console.warn('Using fallback admin orders:', err);
        return [];
      }
    },

    updateOrderStatus: async (id: string, status: string, trackingCode?: string, postalBarnameh?: string) => {
      return request<{ success: boolean; order: Order }>(`/admin/orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, trackingCode, postalBarnameh }),
      });
    },

    getCustomers: async () => {
      try {
        return await request<User[]>('/admin/customers');
      } catch (err) {
        console.warn('Using fallback customers list:', err);
        return [];
      }
    },

    getSettings: async () => {
      try {
        return await request<StoreSettings>('/admin/settings');
      } catch (err) {
        console.warn('Using fallback store settings:', err);
        return FALLBACK_SETTINGS;
      }
    },

    saveSettings: async (settings: Partial<StoreSettings>) => {
      return request<{ success: boolean; settings: StoreSettings; message: string }>('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
    },

    getLogs: async () => {
      try {
        return await request<ActivityLog[]>('/admin/logs');
      } catch (err) {
        console.warn('Using fallback logs:', err);
        return [];
      }
    },
  },
};
