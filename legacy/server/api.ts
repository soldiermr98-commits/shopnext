// ===== API ROUTES & CONTROLLERS =====
// Comprehensive REST API controller for Digistyle Persian online store and admin panel

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID, randomBytes } from 'node:crypto';
import { getUserFromReq, requireAuth, requireAdmin, issueSession, refreshSession, changePasswordSession, logoutSession } from './security/auth';
import { usersRepo, productsRepo, categoriesRepo, ordersRepo, couponsRepo, bannersRepo, blogsRepo, settingsRepo, logsRepo } from './db/repository';
import { User, Order, Product, CartItem } from '../shared/types';

import { validateAPI } from './security/validation';
import { safeSettings, mergeSettings } from './security/settings';

export const apiRouter = Router();
apiRouter.use(validateAPI);

// Auth is cookie-only and session-bound; demo credentials and OTP authentication are disabled.
let dummyPasswordHash: Promise<string> | null = null;
apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (typeof identifier !== 'string' || typeof password !== 'string') return res.status(400).json({ error: 'Invalid login.' });
    const raw = usersRepo.findRawByPhoneOrEmailOrAdmin(identifier);
    const hash = raw?.password_hash || await (dummyPasswordHash ||= bcrypt.hash(randomBytes(32).toString('base64url'), 12));
    const matches = await bcrypt.compare(password, hash);
    if (!raw || !matches) return res.status(401).json({ error: 'Invalid credentials.' });
    issueSession(res, raw.id);
    res.json({ success: true, user: usersRepo.findById(raw.id) });
  } catch { res.status(500).json({ error: 'Authentication failed.' }); }
});

// No SMS transport is configured. Never authenticate using predictable demo OTPs.
apiRouter.post('/auth/otp/send', (_req, res) => res.status(503).json({ error: 'OTP authentication unavailable.' }));
apiRouter.post('/auth/otp/verify', (_req, res) => res.status(503).json({ error: 'OTP authentication unavailable.' }));

apiRouter.post('/auth/register', async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;
    if (!name || !phone || typeof password !== 'string' || password.length < 14 || Buffer.byteLength(password) > 72) return res.status(400).json({ error: 'Invalid registration.' });
    if (usersRepo.findRawByPhoneOrEmailOrAdmin(phone)) return res.status(400).json({ error: 'Registration unavailable.' });
    const created = usersRepo.create({ id: randomUUID(), name, phone, email, password_hash: await bcrypt.hash(password, 12), role: 'customer', created_at: new Date().toISOString() });
    issueSession(res, created.id);
    res.json({ success: true, user: usersRepo.findById(created.id) });
  } catch { res.status(500).json({ error: 'Registration failed.' }); }
});
apiRouter.get('/auth/me', requireAuth, (req, res) => res.json({ user: (req as any).user }));
apiRouter.post('/auth/refresh', (req, res) => {
  try { refreshSession(req, res); } catch { res.status(500).json({ error: 'Session refresh failed.' }); }
});
apiRouter.post('/auth/change-password', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as User;
    const { oldPassword, newPassword } = req.body;
    if (typeof oldPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 14 || Buffer.byteLength(newPassword) > 72 || oldPassword === newPassword) return res.status(400).json({ error: 'Invalid password change.' });
    const raw = usersRepo.findRawById(user.id);
    if (!raw || !(await bcrypt.compare(oldPassword, raw.password_hash))) return res.status(401).json({ error: 'Invalid credentials.' });
    changePasswordSession(res, user.id, await bcrypt.hash(newPassword, 12));
    res.json({ success: true, user: usersRepo.findById(user.id) });
  } catch { res.status(500).json({ error: 'Password change failed.' }); }
});
apiRouter.post('/auth/logout', (req, res) => {
  try { logoutSession(req, res); } catch { res.status(500).json({ error: 'Logout failed.' }); }
});

// ----------------------------------------------------------------------
// 2. STOREFRONT PRODUCTS & CATALOG ENDPOINTS
// ----------------------------------------------------------------------

// GET /api/products
apiRouter.get('/products', (req: Request, res: Response) => {
  try {
    const { category, brand, search, featured, inStock, sort, minPrice, maxPrice, page = '1', limit = '12' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 12);
    const offset = (pageNum - 1) * limitNum;

    const result = productsRepo.list({
      category: category as string,
      brand: brand as string,
      search: search as string,
      featured: featured === 'true',
      inStock: inStock === 'true',
      sort: sort as string,
      minPrice: minPrice ? parseInt(minPrice as string, 10) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice as string, 10) : undefined,
      limit: limitNum,
      offset,
    });

    res.json({
      products: result.products,
      total: result.total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(result.total / limitNum),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/products/:idOrSlug
apiRouter.get('/products/:idOrSlug', (req: Request, res: Response) => {
  try {
    const { idOrSlug } = req.params;
    let product = productsRepo.findById(idOrSlug);
    if (!product) {
      product = productsRepo.findBySlug(idOrSlug);
    }

    if (!product) {
      return res.status(404).json({ error: 'محصول مورد نظر یافت نشد.' });
    }

    // Get related products in same category
    const relatedResult = productsRepo.list({
      category: product.categoryIds[0],
      limit: 5,
    });
    const related = relatedResult.products.filter((p) => p.id !== product!.id).slice(0, 4);

    res.json({ product, related });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/categories
apiRouter.get('/categories', (_req: Request, res: Response) => {
  try {
    const categories = categoriesRepo.list();
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/banners
apiRouter.get('/banners', (_req: Request, res: Response) => {
  try {
    const banners = bannersRepo.list();
    res.json(banners);
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/blogs
apiRouter.get('/blogs', (_req: Request, res: Response) => {
  try {
    const blogs = blogsRepo.list();
    res.json(blogs);
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/blogs/:slug
apiRouter.get('/blogs/:slug', (req: Request, res: Response) => {
  try {
    const post = blogsRepo.findBySlug(req.params.slug);
    if (!post) {
      return res.status(404).json({ error: 'مقاله مورد نظر یافت نشد.' });
    }
    res.json(post);
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/coupons/validate
apiRouter.post('/coupons/validate', (req: Request, res: Response) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'کد تخفیف را وارد کنید.' });
    }

    const coupon = couponsRepo.findByCode(code);
    if (!coupon || !coupon.isActive) {
      return res.status(400).json({ error: 'کد تخفیف وارد شده نامعتبر یا منقضی است.' });
    }

    const orderSubtotal = Number(subtotal || 0);
    const minOrder = coupon.minOrderAmount || 0;
    if (orderSubtotal < minOrder) {
      return res.status(400).json({
        error: `حداقل مبلغ سفارش برای استفاده از این کد ${minOrder.toLocaleString('fa-IR')} تومان است.`,
      });
    }

    let discount = 0;
    if (coupon.type === 'percent') {
      discount = Math.round((orderSubtotal * coupon.value) / 100);
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else {
      discount = coupon.value;
    }

    res.json({
      success: true,
      coupon,
      discount,
      message: `کد تخفیف «${coupon.code}» با موفقیت اعمال گردید.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ----------------------------------------------------------------------
// 3. ORDERS & CHECKOUT
// ----------------------------------------------------------------------

// POST /api/orders (Create Order)
apiRouter.post('/orders', async (req: Request, res: Response) => {
  try {
    const user = getUserFromReq(req);
    const {
      customerName,
      customerPhone,
      customerNationalCode,
      shippingAddress,
      items,
      couponCode,
      shippingMethodId,
      shippingMethodName,
      deliveryDateSlot,
      paymentMethod,
      notes,
      requiresOfficialTaxInvoice,
    } = req.body;

    if (!items || !items.length || !shippingAddress || !customerPhone || !customerName) {
      return res.status(400).json({ error: 'اطلاعات گیرنده، آدرس و اقلام سبد خرید الزامی است.' });
    }

    // Calculate totals
    let subtotal = 0;
    let itemsDiscount = 0;
    let itemsCount = 0;

    const processedItems: CartItem[] = [];
    for (const item of items as CartItem[]) {
      itemsCount += item.quantity;
      const p = productsRepo.findById(item.productId);
      const unitOriginal = item.price || item.product?.price || p?.price || 0;
      const unitCurrent = item.selectedVariant?.salePrice || item.selectedVariant?.price || item.salePrice || item.product?.salePrice || item.product?.price || p?.salePrice || p?.price || unitOriginal;
      const originalPrice = unitOriginal * item.quantity;
      const currentPrice = unitCurrent * item.quantity;
      subtotal += currentPrice;
      itemsDiscount += Math.max(0, originalPrice - currentPrice);

      const title = item.productTitle || item.product?.title || p?.title || 'کالای سفارشی';
      const mainImg = item.productImage || item.product?.mainImage || p?.mainImage || '';

      processedItems.push({
        ...item,
        productTitle: title,
        productImage: mainImg,
        product: {
          id: item.productId,
          title,
          mainImage: mainImg,
          brand: item.brand || p?.brand || '',
          price: unitOriginal,
          salePrice: unitCurrent,
        },
      });

      // Decrement stock in database
      if (p) {
        productsRepo.update(p.id, { stock: Math.max(0, p.stock - item.quantity) });
      }
    }

    const settings = settingsRepo.get();
    const freeShippingThreshold = settings.freeShippingThreshold ?? 5000000;
    const standardShippingFee = settings.standardShippingFee ?? 49000;
    const expressShippingFee = settings.expressShippingFee ?? 95000;
    const vatPercent = settings.vatPercent ?? settings.vatPercentage ?? 10;

    let shippingFee = standardShippingFee;
    if (subtotal >= freeShippingThreshold) {
      shippingFee = 0;
    } else if (shippingMethodId === 'express') {
      shippingFee = expressShippingFee;
    }

    let couponDiscount = 0;
    if (couponCode) {
      const coupon = couponsRepo.findByCode(couponCode);
      if (coupon && coupon.isActive && subtotal >= (coupon.minOrderAmount || 0)) {
        if (coupon.type === 'percent') {
          couponDiscount = Math.round((subtotal * coupon.value) / 100);
          if (coupon.maxDiscountAmount && couponDiscount > coupon.maxDiscountAmount) {
            couponDiscount = coupon.maxDiscountAmount;
          }
        } else {
          couponDiscount = coupon.value;
        }
      }
    }

    const vatAmount = Math.round((subtotal * vatPercent) / 100);
    const totalPaid = Math.max(0, subtotal - couponDiscount + shippingFee);

    const orderNumber = `DK-${Math.floor(100000 + Math.random() * 900000)}`;
    const trackingCode = `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const now = new Date().toISOString();

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber,
      trackingCode,
      postalBarnameh: `PB-${Math.floor(1000000 + Math.random() * 9000000)}`,
      userId: user ? user.id : 'usr-guest',
      customerName,
      customerPhone,
      customerNationalCode: customerNationalCode || undefined,
      shippingAddress,
      status: paymentMethod === 'cod' ? 'processing' : 'awaiting_payment',
      items: processedItems,
      itemsCount,
      subtotal,
      itemsDiscount,
      couponCode: couponCode || undefined,
      couponDiscount,
      shippingFee,
      shippingMethodName: shippingMethodName || 'پست پیشتاز سراسری',
      shippingMethodId: shippingMethodId || 'standard',
      deliveryDateSlot: deliveryDateSlot || 'فردا، بازه ۱۰ تا ۱۴',
      vatAmount,
      totalPaid,
      paymentMethod,
      paymentMethodName:
        paymentMethod === 'zarinpal' ? 'درگاه زرین‌پال' :
        paymentMethod === 'sep' ? 'درگاه شاپرک سامان کیش' :
        paymentMethod === 'wallet' ? 'کیف پول نقدی دیجی‌استایل' : 'پرداخت در محل',
      paymentGateway: paymentMethod,
      isPaid: paymentMethod === 'wallet' || paymentMethod === 'cod',
      paymentRrn: paymentMethod === 'wallet' ? `WAL-${Date.now().toString().slice(-8)}` : undefined,
      notes: notes || undefined,
      requiresOfficialTaxInvoice: Boolean(requiresOfficialTaxInvoice),
      invoiceSerial: requiresOfficialTaxInvoice ? `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}` : undefined,
      createdAt: now,
      updatedAt: now,
    };

    ordersRepo.create(newOrder);

    logsRepo.add({
      userId: user ? user.id : 'usr-guest',
      userName: customerName,
      userRole: user ? user.role : 'customer',
      action: 'ثبت سفارش جدید',
      module: 'سفارشات',
      details: `ثبت سفارش به شماره ${orderNumber} به ارزش ${totalPaid.toLocaleString('fa-IR')} تومان`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      order: newOrder,
      message: 'سفارش شما با موفقیت ثبت شد.',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/orders (User's orders)
apiRouter.get('/orders', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const orders = ordersRepo.list({ userId: user.id });
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/orders/:id
apiRouter.get('/orders/:id', requireAuth, (req: Request, res: Response) => {
  try {
    const order = ordersRepo.findById(req.params.id);
    const viewer = (req as any).user as User;
    if (order && order.userId !== viewer.id && !['super_admin','admin','shop_manager'].includes(viewer.role)) return res.status(403).json({ error: 'Permission denied.' });
    if (!order) {
      return res.status(404).json({ error: 'سفارش مورد نظر یافت نشد.' });
    }
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/orders/track/:code
apiRouter.get('/orders/track/:code', (req: Request, res: Response) => {
  try {
    const order = ordersRepo.findByTrackingCode(req.params.code);
    if (!order) {
      return res.status(404).json({ error: 'سفارشی با این شماره رهگیری یافت نشد.' });
    }
    res.json({
      orderNumber: order.orderNumber,
      trackingCode: order.trackingCode,
      postalBarnameh: order.postalBarnameh,
      status: order.status,
      customerName: order.customerName,
      itemsCount: order.itemsCount,
      totalPaid: order.totalPaid,
      createdAt: order.createdAt,
      shippingMethodName: order.shippingMethodName,
      deliveryDateSlot: order.deliveryDateSlot,
      shippingAddress: {
        province: order.shippingAddress.province,
        city: order.shippingAddress.city,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ----------------------------------------------------------------------
// 4. ADMIN DASHBOARD & MANAGEMENT (Protected)
// ----------------------------------------------------------------------

// GET /api/admin/dashboard
apiRouter.get('/admin/dashboard', requireAdmin, (_req: Request, res: Response) => {
  try {
    const allOrders = ordersRepo.list();
    const allProducts = productsRepo.list({ limit: 1000 }).products;
    const allUsers = usersRepo.list();

    const totalSales = allOrders.filter((o) => o.isPaid || o.status === 'delivered').reduce((sum, o) => sum + o.totalPaid, 0);
    const averageOrderValue = allOrders.length > 0 ? Math.round(totalSales / allOrders.length) : 0;
    const lowStockCount = allProducts.filter((p) => p.stock <= (p.lowStockThreshold || 5)).length;

    // Realistic Persian Jalali sales chart series (last 7 days)
    const salesChartData = [
      { day: 'شنبه ۲۴ام', sales: 4200000, orders: 4 },
      { day: 'یکشنبه ۲۵ام', sales: 6100000, orders: 6 },
      { day: 'دوشنبه ۲۶ام', sales: 5300000, orders: 5 },
      { day: 'سه‌شنبه ۲۷ام', sales: 8900000, orders: 9 },
      { day: 'چهارشنبه ۲۸ام', sales: 11200000, orders: 12 },
      { day: 'پنج‌شنبه ۲۹ام', sales: 14500000, orders: 15 },
      { day: 'جمعه ۳۰ام', sales: 9800000, orders: 10 },
    ];

    res.json({
      kpis: {
        totalSales,
        ordersCount: allOrders.length,
        customersCount: allUsers.length,
        averageOrderValue,
        conversionRate: '۳.۴٪',
        lowStockCount,
      },
      salesChartData,
      recentOrders: allOrders.slice(0, 5),
      lowStockProducts: allProducts.filter((p) => p.stock <= (p.lowStockThreshold || 5)).slice(0, 5),
      topProducts: allProducts.sort((a, b) => b.reviewsCount - a.reviewsCount).slice(0, 5),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/admin/products
apiRouter.get('/admin/products', requireAdmin, (req: Request, res: Response) => {
  try {
    const { category, search, status, page = '1', limit = '50' } = req.query;
    const result = productsRepo.list({
      category: category as string,
      search: search as string,
      limit: parseInt(limit as string, 10),
      offset: (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10),
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/admin/products
apiRouter.post('/admin/products', requireAdmin, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const body = req.body;
    const newProduct: Product = {
      ...body,
      id: `prod-${Date.now()}`,
      sku: body.sku || `SKU-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
    };
    const saved = productsRepo.create(newProduct);

    logsRepo.add({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'افزودن محصول جدید',
      module: 'محصولات',
      details: `افزودن محصول «${saved.title}» با کد ${saved.sku}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, product: saved });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/admin/products/:id
apiRouter.put('/admin/products/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const updated = productsRepo.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'محصول مورد نظر یافت نشد.' });
    }

    logsRepo.add({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'ویرایش محصول',
      module: 'محصولات',
      details: `ویرایش اطلاعات محصول «${updated.title}»`,
      ipAddress: req.ip,
    });

    res.json({ success: true, product: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /api/admin/products/:id
apiRouter.delete('/admin/products/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const existing = productsRepo.findById(req.params.id);
    productsRepo.delete(req.params.id);

    logsRepo.add({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'حذف محصول',
      module: 'محصولات',
      details: `حذف محصول «${existing?.title || req.params.id}»`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'محصول با موفقیت حذف شد.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/admin/orders
apiRouter.get('/admin/orders', requireAdmin, (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const orders = ordersRepo.list({ status: status as string });
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/admin/orders/:id/status
apiRouter.put('/admin/orders/:id/status', requireAdmin, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const { status, trackingCode, postalBarnameh } = req.body;
    const updated = ordersRepo.update(req.params.id, {
      status,
      trackingCode,
      postalBarnameh,
      isPaid: status === 'delivered' ? true : undefined,
    });

    logsRepo.add({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'تغییر وضعیت سفارش',
      module: 'سفارشات',
      details: `تغییر وضعیت سفارش ${updated?.orderNumber} به «${status}»`,
      ipAddress: req.ip,
    });

    res.json({ success: true, order: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/admin/customers
apiRouter.get('/admin/customers', requireAdmin, (_req: Request, res: Response) => {
  try {
    const customers = usersRepo.list();
    res.json(customers);
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/admin/settings
apiRouter.get('/admin/settings', requireAdmin, (_req: Request, res: Response) => {
  try {
    const settings = settingsRepo.get();
    res.json(safeSettings(settings));
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/admin/settings
apiRouter.put('/admin/settings', requireAdmin, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const updated = settingsRepo.update(mergeSettings(settingsRepo.get(), req.body));

    logsRepo.add({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'ویرایش تنظیمات فروشگاه',
      module: 'تنظیمات',
      details: 'به‌روزرسانی تنظیمات عمومی، درگاه‌های پرداخت و سامانه‌های پیامکی',
      ipAddress: req.ip,
    });

    res.json({ success: true, settings: safeSettings(updated), message: 'تنظیمات با موفقیت ذخیره گردید.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/admin/logs
apiRouter.get('/admin/logs', requireAdmin, (_req: Request, res: Response) => {
  try {
    const logs = logsRepo.list(100);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});
