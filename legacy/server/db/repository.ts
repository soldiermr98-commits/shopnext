// ===== CORE BUSINESS LOGIC & REPOSITORY PATTERN =====
// Data access layer abstracting SQLite database operations for Products, Orders, Users, Categories, Settings and Logs

import { getDb, mutateDatabase } from './database';
import { Product, Order, User, Category, Coupon, BlogPost, ActivityLog, StoreSettings } from '../../shared/types';

// Helper to convert SQLite query results into objects
function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return rows;
}

function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const items = queryAll<T>(sql, params);
  return items.length > 0 ? items[0] : null;
}

function execute(sql: string, params: any[] = []): void {
  mutateDatabase(db => { db.run(sql, params); });
}

// ----------------------------------------------------------------------
// Users Repository
// ----------------------------------------------------------------------
export const usersRepo = {
  findById(id: string): User | null {
    const raw = queryOne<any>(`SELECT * FROM users WHERE id = ?`, [id]);
    if (!raw) return null;
    return sanitizeUser(raw);
  },

  findRawByPhoneOrEmailOrAdmin(identifier: string): any | null {
    return queryOne<any>(
      `SELECT * FROM users WHERE phone = ? OR email = ? OR (id = 'usr-admin' AND phone = ?)`,
      [identifier, identifier, identifier]
    );
  },

  findRawById(id: string): any | null {
    return queryOne<any>(`SELECT * FROM users WHERE id = ?`, [id]);
  },

  list(role?: string): User[] {
    let sql = `SELECT * FROM users`;
    const params: any[] = [];
    if (role) {
      sql += ` WHERE role = ?`;
      params.push(role);
    }
    sql += ` ORDER BY created_at DESC`;
    return queryAll<any>(sql, params).map(sanitizeUser);
  },

  create(user: any): User {
    execute(
      `INSERT INTO users (id, name, phone, email, password_hash, role, national_code, is_gold_member, club_points, wallet_balance, must_change_password, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.name,
        user.phone,
        user.email || null,
        user.password_hash,
        user.role || 'customer',
        user.national_code || null,
        user.is_gold_member ? 1 : 0,
        user.club_points || 0,
        user.wallet_balance || 0,
        user.must_change_password ? 1 : 0,
        user.created_at || new Date().toISOString(),
      ]
    );
    return sanitizeUser(user);
  },

  update(id: string, updates: Partial<any>): User | null {
    const current = queryOne<any>(`SELECT * FROM users WHERE id = ?`, [id]);
    if (!current) return null;

    const fields: string[] = [];
    const values: any[] = [];

    for (const [k, v] of Object.entries(updates)) {
      if (k === 'id') continue;
      fields.push(`${k} = ?`);
      values.push(v);
    }

    if (fields.length > 0) {
      values.push(id);
      execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    return usersRepo.findById(id);
  },
};

function sanitizeUser(u: any): User {
  return {
    id: u.id,
    name: u.name,
    phone: u.phone,
    email: u.email || undefined,
    role: u.role,
    avatar: u.avatar || undefined,
    nationalCode: u.national_code || undefined,
    isGoldMember: Boolean(u.is_gold_member),
    clubPoints: Number(u.club_points || 0),
    walletBalance: Number(u.wallet_balance || 0),
    mustChangePassword: Boolean(u.must_change_password),
    createdAt: u.created_at,
  };
}

// ----------------------------------------------------------------------
// Products Repository
// ----------------------------------------------------------------------
export const productsRepo = {
  list(options: {
    category?: string;
    brand?: string;
    search?: string;
    featured?: boolean;
    inStock?: boolean;
    sort?: string;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
    offset?: number;
  } = {}): { products: Product[]; total: number } {
    let whereClauses: string[] = [];
    let params: any[] = [];

    if (options.category) {
      whereClauses.push(`category_ids LIKE ?`);
      params.push(`%"${options.category}"%`);
    }

    if (options.brand) {
      whereClauses.push(`brand = ?`);
      params.push(options.brand);
    }

    if (options.featured) {
      whereClauses.push(`featured = 1`);
    }

    if (options.inStock) {
      whereClauses.push(`stock > 0`);
    }

    if (options.search) {
      whereClauses.push(`(title LIKE ? OR short_description LIKE ? OR brand LIKE ?)`);
      const term = `%${options.search}%`;
      params.push(term, term, term);
    }

    if (options.minPrice !== undefined) {
      whereClauses.push(`price >= ?`);
      params.push(options.minPrice);
    }

    if (options.maxPrice !== undefined) {
      whereClauses.push(`price <= ?`);
      params.push(options.maxPrice);
    }

    const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total count
    const countRes = queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM products ${where}`, params);
    const total = countRes ? countRes.count : 0;

    // Sorting
    let orderBy = 'created_at DESC';
    if (options.sort === 'price_asc') orderBy = 'COALESCE(sale_price, price) ASC';
    else if (options.sort === 'price_desc') orderBy = 'COALESCE(sale_price, price) DESC';
    else if (options.sort === 'rating') orderBy = 'rating DESC';
    else if (options.sort === 'discount') orderBy = 'discount_percent DESC';
    else if (options.sort === 'popular') orderBy = 'reviews_count DESC';

    let limitClause = '';
    if (options.limit) {
      limitClause = ` LIMIT ${Number(options.limit)}`;
      if (options.offset) {
        limitClause += ` OFFSET ${Number(options.offset)}`;
      }
    }

    const rows = queryAll<any>(`SELECT * FROM products ${where} ORDER BY ${orderBy}${limitClause}`, params);
    const products = rows.map(formatProduct);

    return { products, total };
  },

  findById(id: string): Product | null {
    const row = queryOne<any>(`SELECT * FROM products WHERE id = ?`, [id]);
    return row ? formatProduct(row) : null;
  },

  findBySlug(slug: string): Product | null {
    const row = queryOne<any>(`SELECT * FROM products WHERE slug = ?`, [slug]);
    return row ? formatProduct(row) : null;
  },

  create(p: Product): Product {
    execute(
      `INSERT INTO products (
        id, title, slug, sku, brand, brand_id, category_ids, type,
        price, sale_price, discount_percent, stock, low_stock_threshold,
        rating, reviews_count, short_description, full_description,
        main_image, gallery_images, video_url, status, featured,
        tags, attributes, specifications, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.id,
        p.title,
        p.slug,
        p.sku,
        p.brand,
        p.brandId || null,
        JSON.stringify(p.categoryIds),
        p.type,
        p.price,
        p.salePrice || null,
        p.discountPercent || null,
        p.stock,
        p.lowStockThreshold || 5,
        p.rating || 5.0,
        p.reviewsCount || 0,
        p.shortDescription || '',
        p.fullDescription,
        p.mainImage,
        JSON.stringify(p.galleryImages || []),
        p.videoUrl || null,
        p.status || 'published',
        p.featured ? 1 : 0,
        JSON.stringify(p.tags || []),
        JSON.stringify(p.attributes || []),
        JSON.stringify(p.specifications || []),
        p.createdAt || new Date().toISOString(),
      ]
    );

    if (p.variants && p.variants.length > 0) {
      for (const v of p.variants) {
        execute(
          `INSERT INTO product_variants (id, product_id, sku, color_name, color_hex, size, price, sale_price, stock, image)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [v.id, p.id, v.sku, v.colorName || null, v.colorHex || null, v.size || null, v.price, v.salePrice || null, v.stock, v.image || null]
        );
      }
    }

    return p;
  },

  update(id: string, updates: Partial<Product>): Product | null {
    const current = queryOne<any>(`SELECT * FROM products WHERE id = ?`, [id]);
    if (!current) return null;

    const fields: string[] = [];
    const values: any[] = [];

    const mapField = (key: string, val: any) => {
      fields.push(`${key} = ?`);
      values.push(val);
    };

    if (updates.title !== undefined) mapField('title', updates.title);
    if (updates.slug !== undefined) mapField('slug', updates.slug);
    if (updates.sku !== undefined) mapField('sku', updates.sku);
    if (updates.brand !== undefined) mapField('brand', updates.brand);
    if (updates.price !== undefined) mapField('price', updates.price);
    if (updates.salePrice !== undefined) mapField('sale_price', updates.salePrice);
    if (updates.discountPercent !== undefined) mapField('discount_percent', updates.discountPercent);
    if (updates.stock !== undefined) mapField('stock', updates.stock);
    if (updates.shortDescription !== undefined) mapField('short_description', updates.shortDescription);
    if (updates.fullDescription !== undefined) mapField('full_description', updates.fullDescription);
    if (updates.mainImage !== undefined) mapField('main_image', updates.mainImage);
    if (updates.status !== undefined) mapField('status', updates.status);
    if (updates.featured !== undefined) mapField('featured', updates.featured ? 1 : 0);
    if (updates.categoryIds !== undefined) mapField('category_ids', JSON.stringify(updates.categoryIds));
    if (updates.galleryImages !== undefined) mapField('gallery_images', JSON.stringify(updates.galleryImages));
    if (updates.specifications !== undefined) mapField('specifications', JSON.stringify(updates.specifications));

    if (fields.length > 0) {
      values.push(id);
      execute(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    return productsRepo.findById(id);
  },

  delete(id: string): boolean {
    execute(`DELETE FROM products WHERE id = ?`, [id]);
    execute(`DELETE FROM product_variants WHERE product_id = ?`, [id]);
    return true;
  },
};

function formatProduct(row: any): Product {
  // Query variants
  const variantsRaw = queryAll<any>(`SELECT * FROM product_variants WHERE product_id = ?`, [row.id]);
  const variants = variantsRaw.map((v) => ({
    id: v.id,
    productId: row.id,
    sku: v.sku,
    colorName: v.color_name || undefined,
    colorHex: v.color_hex || undefined,
    size: v.size || undefined,
    price: Number(v.price),
    salePrice: v.sale_price ? Number(v.sale_price) : undefined,
    stock: Number(v.stock),
    image: v.image || undefined,
  }));

  let categoryIds: string[] = [];
  try { categoryIds = JSON.parse(row.category_ids); } catch {}

  let galleryImages: string[] = [];
  try { galleryImages = JSON.parse(row.gallery_images); } catch {}

  let tags: string[] = [];
  try { tags = JSON.parse(row.tags); } catch {}

  let attributes: any[] = [];
  try { attributes = JSON.parse(row.attributes); } catch {}

  let specifications: any[] = [];
  try { specifications = JSON.parse(row.specifications); } catch {}

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    sku: row.sku,
    brand: row.brand,
    brandId: row.brand_id || undefined,
    categoryIds,
    type: row.type,
    price: Number(row.price),
    salePrice: row.sale_price ? Number(row.sale_price) : undefined,
    discountPercent: row.discount_percent ? Number(row.discount_percent) : undefined,
    stock: Number(row.stock),
    lowStockThreshold: Number(row.low_stock_threshold || 5),
    rating: Number(row.rating || 5.0),
    reviewsCount: Number(row.reviews_count || 0),
    shortDescription: row.short_description || undefined,
    fullDescription: row.full_description,
    mainImage: row.main_image,
    galleryImages,
    videoUrl: row.video_url || undefined,
    status: row.status,
    featured: Boolean(row.featured),
    tags,
    attributes,
    specifications,
    variants: variants.length > 0 ? variants : undefined,
    createdAt: row.created_at,
  };
}

// ----------------------------------------------------------------------
// Categories Repository
// ----------------------------------------------------------------------
export const categoriesRepo = {
  list(): Category[] {
    const rows = queryAll<any>(`SELECT * FROM categories ORDER BY order_index ASC`);
    return rows.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      parentId: c.parent_id || undefined,
      image: c.image || undefined,
      icon: c.icon || undefined,
      description: c.description || undefined,
      orderIndex: Number(c.order_index || 0),
      order: Number(c.order_index || 0),
      featured: Boolean(c.featured),
    }));
  },

  findById(id: string): Category | null {
    const c = queryOne<any>(`SELECT * FROM categories WHERE id = ?`, [id]);
    if (!c) return null;
    return {
      id: c.id,
      title: c.title,
      slug: c.slug,
      parentId: c.parent_id || undefined,
      image: c.image || undefined,
      icon: c.icon || undefined,
      description: c.description || undefined,
      orderIndex: Number(c.order_index || 0),
      order: Number(c.order_index || 0),
      featured: Boolean(c.featured),
    };
  },
};

// ----------------------------------------------------------------------
// Orders Repository
// ----------------------------------------------------------------------
export const ordersRepo = {
  list(filter?: { userId?: string; status?: string }): Order[] {
    let sql = `SELECT * FROM orders`;
    const params: any[] = [];
    const where: string[] = [];

    if (filter?.userId) {
      where.push(`user_id = ?`);
      params.push(filter.userId);
    }
    if (filter?.status) {
      where.push(`status = ?`);
      params.push(filter.status);
    }

    if (where.length > 0) {
      sql += ` WHERE ${where.join(' AND ')}`;
    }
    sql += ` ORDER BY created_at DESC`;

    return queryAll<any>(sql, params).map(formatOrder);
  },

  findById(id: string): Order | null {
    const row = queryOne<any>(`SELECT * FROM orders WHERE id = ?`, [id]);
    return row ? formatOrder(row) : null;
  },

  findByTrackingCode(code: string): Order | null {
    const row = queryOne<any>(`SELECT * FROM orders WHERE tracking_code = ? OR order_number = ?`, [code, code]);
    return row ? formatOrder(row) : null;
  },

  create(order: Order): Order {
    execute(
      `INSERT INTO orders (
        id, order_number, tracking_code, postal_barnameh, user_id, customer_name,
        customer_phone, customer_national_code, shipping_address, status,
        items, items_count, subtotal, items_discount, coupon_code, coupon_discount,
        shipping_fee, shipping_method_name, shipping_method_id, delivery_date_slot,
        vat_amount, total_paid, payment_method, payment_method_name, payment_gateway,
        payment_rrn, payment_card_mask, is_paid, notes, requires_official_tax_invoice,
        invoice_serial, tax_ref_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order.id,
        order.orderNumber,
        order.trackingCode,
        order.postalBarnameh || null,
        order.userId,
        order.customerName,
        order.customerPhone,
        order.customerNationalCode || null,
        JSON.stringify(order.shippingAddress),
        order.status,
        JSON.stringify(order.items),
        order.itemsCount,
        order.subtotal,
        order.itemsDiscount,
        order.couponCode || null,
        order.couponDiscount || 0,
        order.shippingFee,
        order.shippingMethodName,
        order.shippingMethodId,
        order.deliveryDateSlot,
        order.vatAmount || 0,
        order.totalPaid,
        order.paymentMethod,
        order.paymentMethodName,
        order.paymentGateway || null,
        order.paymentRrn || null,
        order.paymentCardMask || null,
        order.isPaid ? 1 : 0,
        order.notes || null,
        order.requiresOfficialTaxInvoice ? 1 : 0,
        order.invoiceSerial || null,
        order.taxRefId || null,
        order.createdAt,
        order.updatedAt,
      ]
    );

    return order;
  },

  update(id: string, updates: Partial<Order>): Order | null {
    const current = queryOne<any>(`SELECT * FROM orders WHERE id = ?`, [id]);
    if (!current) return null;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.status) {
      fields.push(`status = ?`);
      values.push(updates.status);
    }
    if (updates.trackingCode) {
      fields.push(`tracking_code = ?`);
      values.push(updates.trackingCode);
    }
    if (updates.postalBarnameh !== undefined) {
      fields.push(`postal_barnameh = ?`);
      values.push(updates.postalBarnameh);
    }
    if (updates.isPaid !== undefined) {
      fields.push(`is_paid = ?`);
      values.push(updates.isPaid ? 1 : 0);
    }

    fields.push(`updated_at = ?`);
    values.push(new Date().toISOString());

    values.push(id);
    execute(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`, values);

    return ordersRepo.findById(id);
  },
};

function formatOrder(row: any): Order {
  let shippingAddress: any = {};
  try { shippingAddress = JSON.parse(row.shipping_address); } catch {}

  let items: any[] = [];
  try {
    const parsed = JSON.parse(row.items);
    if (Array.isArray(parsed)) {
      items = parsed.filter(Boolean).map((it: any) => {
        const img = it?.productImage || it?.product?.mainImage || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCKyyLWggWCe-CKyfifTQeBV-Bn1g2BPVPzjrJXgqGBpKtijzaGSsjj7DhE35xSAcP-X2SLBZTOwxuMsiCiS4Y2WB3uaTR7oR-d_uUmpJkrhUvglQjDjIqhbuMUf3oBdX8P13JGrr0gDg2RMq3tOcBnpC-o7TzFVho2B1WyAwkQVl3APSmX4CExxoy18jvbX4UL3lkIwAH42K3fqOmaRzYTtiqpeDV9GINTEBON9ufBDNyetQkFdHex0w';
        const title = it?.productTitle || it?.product?.title || 'کالای سفارشی';
        return {
          ...it,
          productTitle: title,
          productImage: img,
          product: it?.product || {
            id: it?.productId || 'item-id',
            title,
            mainImage: img,
            price: it?.unitPrice || it?.price || 0,
          },
        };
      });
    }
  } catch {}

  return {
    id: row.id,
    orderNumber: row.order_number,
    trackingCode: row.tracking_code,
    postalBarnameh: row.postal_barnameh || undefined,
    userId: row.user_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerNationalCode: row.customer_national_code || undefined,
    shippingAddress,
    status: row.status,
    items,
    itemsCount: Number(row.items_count),
    subtotal: Number(row.subtotal),
    itemsDiscount: Number(row.items_discount),
    couponCode: row.coupon_code || undefined,
    couponDiscount: Number(row.coupon_discount || 0),
    shippingFee: Number(row.shipping_fee),
    shippingMethodName: row.shipping_method_name,
    shippingMethodId: row.shipping_method_id,
    deliveryDateSlot: row.delivery_date_slot,
    vatAmount: Number(row.vat_amount || 0),
    totalPaid: Number(row.total_paid),
    paymentMethod: row.payment_method,
    paymentMethodName: row.payment_method_name,
    paymentGateway: row.payment_gateway || undefined,
    paymentRrn: row.payment_rrn || undefined,
    paymentCardMask: row.payment_card_mask || undefined,
    isPaid: Boolean(row.is_paid),
    notes: row.notes || undefined,
    requiresOfficialTaxInvoice: Boolean(row.requires_official_tax_invoice),
    invoiceSerial: row.invoice_serial || undefined,
    taxRefId: row.tax_ref_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ----------------------------------------------------------------------
// Coupons Repository
// ----------------------------------------------------------------------
export const couponsRepo = {
  findByCode(code: string): Coupon | null {
    const c = queryOne<any>(`SELECT * FROM coupons WHERE UPPER(code) = UPPER(?)`, [code]);
    if (!c) return null;
    return {
      id: c.id,
      code: c.code,
      type: c.type,
      value: Number(c.value),
      minOrderAmount: Number(c.min_order_amount || 0),
      maxDiscountAmount: c.max_discount_amount ? Number(c.max_discount_amount) : undefined,
      usageLimit: c.usage_limit ? Number(c.usage_limit) : undefined,
      usedCount: Number(c.used_count || 0),
      expiresAt: c.expires_at || undefined,
      isActive: Boolean(c.is_active),
    };
  },

  list(): Coupon[] {
    const rows = queryAll<any>(`SELECT * FROM coupons ORDER BY code ASC`);
    return rows.map((c) => ({
      id: c.id,
      code: c.code,
      type: c.type,
      value: Number(c.value),
      minOrderAmount: Number(c.min_order_amount || 0),
      maxDiscountAmount: c.max_discount_amount ? Number(c.max_discount_amount) : undefined,
      usageLimit: c.usage_limit ? Number(c.usage_limit) : undefined,
      usedCount: Number(c.used_count || 0),
      expiresAt: c.expires_at || undefined,
      isActive: Boolean(c.is_active),
    }));
  },
};

// ----------------------------------------------------------------------
// Banners & Blogs Repository
// ----------------------------------------------------------------------
export const bannersRepo = {
  list(): any[] {
    return queryAll<any>(`SELECT * FROM banners WHERE active = 1 ORDER BY order_index ASC`);
  },
};

export const blogsRepo = {
  list(): BlogPost[] {
    return queryAll<any>(`SELECT * FROM blog_posts ORDER BY created_at DESC`).map((b) => ({
      id: b.id,
      title: b.title,
      slug: b.slug,
      coverImage: b.cover_image,
      excerpt: b.excerpt,
      content: b.content,
      author: b.author,
      readTime: b.read_time,
      category: b.category,
      tags: JSON.parse(b.tags || '[]'),
      createdAt: b.created_at,
    }));
  },

  findBySlug(slug: string): BlogPost | null {
    const b = queryOne<any>(`SELECT * FROM blog_posts WHERE slug = ?`, [slug]);
    if (!b) return null;
    return {
      id: b.id,
      title: b.title,
      slug: b.slug,
      coverImage: b.cover_image,
      excerpt: b.excerpt,
      content: b.content,
      author: b.author,
      readTime: b.read_time,
      category: b.category,
      tags: JSON.parse(b.tags || '[]'),
      createdAt: b.created_at,
    };
  },
};

// ----------------------------------------------------------------------
// Settings & Logs Repository
// ----------------------------------------------------------------------
export const settingsRepo = {
  get(): StoreSettings {
    const row = queryOne<any>(`SELECT value FROM settings WHERE key = 'general'`);
    if (!row) throw new Error('Settings not found');
    return JSON.parse(row.value);
  },

  update(newSettings: Partial<StoreSettings>): StoreSettings {
    const current = settingsRepo.get();
    const merged = { ...current, ...newSettings };
    execute(`UPDATE settings SET value = ? WHERE key = 'general'`, [JSON.stringify(merged)]);
    return merged;
  },
};

export const logsRepo = {
  add(log: {
    userId: string;
    userName: string;
    userRole: string;
    action: string;
    module: string;
    details: string;
    ipAddress?: string;
  }): void {
    execute(
      `INSERT INTO activity_logs (id, user_id, user_name, user_role, action, module, details, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        log.userId,
        log.userName,
        log.userRole,
        log.action,
        log.module,
        log.details,
        log.ipAddress || '127.0.0.1',
        new Date().toISOString(),
      ]
    );
  },

  list(limit = 100): ActivityLog[] {
    return queryAll<any>(`SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?`, [limit]).map((l) => ({
      id: l.id,
      userId: l.user_id,
      userName: l.user_name,
      userRole: l.user_role,
      action: l.action,
      module: l.module,
      details: l.details,
      ipAddress: l.ip_address,
      createdAt: l.created_at,
    }));
  },
};
