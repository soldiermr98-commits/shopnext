// ===== TYPES & INTERFACES =====
// Shared TypeScript types for Digistyle Persian Retail Platform & Admin Panel

export type UserRole = 
  | 'super_admin' 
  | 'admin' 
  | 'shop_manager' 
  | 'content_editor' 
  | 'support' 
  | 'customer';

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  avatar?: string;
  nationalCode?: string;
  isGoldMember?: boolean;
  clubPoints?: number;
  walletBalance: number;
  mustChangePassword?: boolean;
  createdAt: string;
}

export interface Address {
  id?: string;
  userId?: string;
  title?: string;
  recipientName: string;
  recipientPhone: string;
  province: string;
  city: string;
  postalCode: string;
  streetAddress: string;
  unit?: string;
  isDefault?: boolean;
}

export interface Category {
  id: string;
  title: string;
  slug: string;
  parentId?: string | null;
  image?: string;
  icon?: string;
  description?: string;
  productCount?: number;
  orderIndex?: number;
  order?: number;
  featured?: boolean;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  originCountry?: string;
  isOfficial?: boolean;
}

export interface ProductVariant {
  id: string;
  productId?: string;
  sku: string;
  colorName?: string;
  colorHex?: string;
  size?: string;
  price: number;
  salePrice?: number;
  stock: number;
  image?: string;
}

export interface ProductSpecification {
  group?: string;
  key?: string;
  name?: string;
  value: string;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  sku: string;
  brand: string;
  brandId?: string;
  categoryIds: string[];
  type: 'simple' | 'variable' | 'digital' | 'bundle';
  price: number;
  salePrice?: number;
  discountPercent?: number;
  stock: number;
  lowStockThreshold?: number;
  rating: number;
  reviewsCount: number;
  shortDescription?: string;
  fullDescription: string;
  mainImage: string;
  galleryImages: string[];
  videoUrl?: string;
  status: 'published' | 'draft' | 'scheduled';
  featured: boolean;
  tags: string[];
  attributes: {
    colors?: { name: string; hex: string }[];
    sizes?: string[];
    material?: string;
    collar?: string;
    season?: string;
    countryOfOrigin?: string;
  } | any;
  variants?: ProductVariant[];
  specifications: ProductSpecification[];
  createdAt: string;
}

export type OrderStatus = 
  | 'pending'
  | 'awaiting_payment'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'failed';

export interface OrderItem {
  id?: string;
  productId: string;
  productTitle?: string;
  productSku?: string;
  productImage?: string;
  variantId?: string;
  colorName?: string;
  size?: string;
  unitPrice?: number;
  discountAmount?: number;
  finalPrice?: number;
  quantity: number;
  unit?: string;
  product?: any;
  selectedVariant?: any;
}

export interface Order {
  id: string;
  orderNumber: string;
  trackingCode: string;
  postalBarnameh?: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  customerNationalCode?: string;
  shippingAddress: Address;
  status: OrderStatus;
  statusText?: string;
  items: OrderItem[];
  itemsCount: number;
  subtotal: number;
  itemsDiscount: number;
  couponCode?: string;
  couponDiscount: number;
  shippingFee: number;
  shippingMethodName: string;
  shippingMethodId: string;
  deliveryDateSlot: string;
  vatAmount: number;
  totalPaid: number;
  paymentMethod: 'online' | 'cod' | 'wallet' | 'card_to_card' | 'snapppay' | string;
  paymentMethodName: string;
  paymentGateway?: string;
  paymentRRN?: string;
  paymentRrn?: string;
  paymentCardMask?: string;
  paymentDate?: string;
  isPaid: boolean;
  notes?: string;
  requiresOfficialTaxInvoice: boolean;
  invoiceSerial?: string;
  taxRefId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usedCount: number;
  expiresAt?: string;
  isActive: boolean;
}

export interface CartItem {
  id?: string;
  productId: string;
  productTitle?: string;
  productSku?: string;
  productImage?: string;
  brand?: string;
  price?: number;
  salePrice?: number;
  quantity: number;
  selectedColor?: { name: string; hex: string };
  selectedSize?: string;
  maxStock?: number;
  unit?: string;
  product?: any;
  selectedVariant?: any;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole | string;
  action: string;
  module: string;
  details: string;
  ipAddress?: string;
  createdAt: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  coverImage: string;
  excerpt: string;
  content: string;
  author: string;
  readTime: string;
  category: string;
  tags?: string[];
  createdAt: string;
}

export interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  weekSales: number;
  monthSales: number;
  totalCustomers: number;
  averageOrderValue: number;
  conversionRate: number;
  lowStockCount: number;
  pendingReviewsCount: number;
  salesChart: {
    date: string;
    jalaliDate: string;
    sales: number;
    orders: number;
  }[];
  topProducts: {
    id: string;
    title: string;
    salesCount: number;
    revenue: number;
    stock: number;
    image: string;
  }[];
  topCategories: {
    name: string;
    percentage: number;
    sales: number;
  }[];
}

export interface StoreSettings {
  storeName: string;
  storeLegalName?: string;
  legalName?: string;
  tagline?: string;
  phone: string;
  email?: string;
  supportEmail?: string;
  address: string;
  economicCode?: string;
  nationalId?: string;
  registrationNumber?: string;
  postalCode?: string;
  freeShippingThreshold?: number;
  standardShippingFee?: number;
  expressShippingFee?: number;
  vatPercent?: number;
  vatPercentage?: number;
  currency?: 'IRT' | 'IRR';
  maintenanceMode?: boolean;
  smsActiveProvider?: string;
  activeGateway?: string;
  defaultPaymentGateway?: string;
  activePaymentGateways?: string[];
  shaparakTerminalId?: string;
  shaparakMerchantId?: string;
  kavenegarApiKey?: string;
  smsSenderNumber?: string;
  allowGuestCheckout?: boolean;
  requireNationalCodeForTaxInvoice?: boolean;
  enableCod?: boolean;
  enableWallet?: boolean;
  gateways?: any;
  sms?: any;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  items: {
    orderItemId: string;
    productTitle: string;
    productImage: string;
    quantity: number;
    reason: string;
    customerNotes?: string;
    images?: string[];
  }[];
  actionType: 'refund' | 'exchange';
  pickupMethod: 'courier' | 'post';
  pickupAddress: string;
  pickupDateSlot: string;
  refundDestination: 'bank_account' | 'wallet';
  bankCardMask?: string;
  bankIban?: string;
  totalRefundAmount: number;
  status: 'pending_review' | 'courier_assigned' | 'received_at_warehouse' | 'approved' | 'rejected' | 'refunded';
  createdAt: string;
}

export interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  fontFamily: string;
  borderRadius: string;
  isDarkMode: boolean;
}

// Public admin settings never contain provider credentials. Secret updates use a separate write-only shape.
export interface SecretState { masked: string; isSet: boolean }
export type SettingsResponse = Omit<StoreSettings, 'shaparakTerminalId' | 'shaparakMerchantId' | 'kavenegarApiKey'> & {
  shaparakTerminalId: SecretState;
  shaparakMerchantId: SecretState;
  kavenegarApiKey: SecretState;
};
