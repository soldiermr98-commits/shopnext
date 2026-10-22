// Every mounted API operation has an explicit params/query/body schema. Unknown routes fail closed.
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { requireAdmin, requireAuth, requirePasswordChanged } from './auth';
import { settingsInput } from './settings';
const empty = z.object({}).strict();
const id = z.string().min(1).max(200);
const text = z.string().max(1000);
const password = z.string().min(14).max(72).refine(v => Buffer.byteLength(v) <= 72);
const oldPassword = z.string().min(1).max(72).refine(v => Buffer.byteLength(v) <= 72);
const phone = z.string().regex(/^09\d{9}$/);
const money = z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER);
const image = z.url().max(4096).refine(v => ['https:', 'http:'].includes(new URL(v).protocol));
const jsonObject = z.record(z.string().max(100), z.unknown());
const product = z.object({
  id: id.optional(), title: z.string().min(1).max(500), slug: id, sku: id.optional(), brand: text,
  brandId: id.optional(), categoryIds: z.array(id).max(50), type: z.enum(['simple','variable','digital','bundle']),
  price: money, salePrice: money.optional(), discountPercent: z.number().min(0).max(100).optional(),
  stock: z.number().int().nonnegative(), lowStockThreshold: z.number().int().nonnegative().optional(),
  rating: z.number().min(0).max(5).optional(), reviewsCount: z.number().int().nonnegative().optional(),
  shortDescription: text.optional(), fullDescription: z.string().max(100000), mainImage: image,
  galleryImages: z.array(image).max(100).default([]), videoUrl: image.optional(), status: z.enum(['published','draft','scheduled']),
  featured: z.boolean(), tags: z.array(text).max(100).default([]), attributes: z.union([jsonObject,z.array(jsonObject)]).default({}),
  specifications: z.array(z.object({ group: text.optional(), key: text.optional(), name: text.optional(), value: text }).strict()).max(200).default([]),
  variants: z.array(z.object({ id, productId: id.optional(), sku: id, colorName: text.optional(), colorHex: text.optional(), size: text.optional(), price: money, salePrice: money.optional(), stock: z.number().int().nonnegative(), image: image.optional() }).strict()).max(200).optional(),
  createdAt: z.iso.datetime().optional(),
}).strict();
const status = z.enum(['pending','awaiting_payment','processing','shipped','delivered','cancelled','refunded','failed']);
const pagination = { page: z.coerce.number().int().min(1).max(100000).optional(), limit: z.coerce.number().int().min(1).max(100).optional() };
const address = z.object({ id: id.optional(), userId: id.optional(), title: text.optional(), recipientName: text, recipientPhone: z.string().max(30), province: text, city: text, postalCode: z.string().max(20), streetAddress: text, unit: text.optional(), isDefault: z.boolean().optional() }).strict();
const cartItem = z.object({ id: id.optional(), productId: id, productTitle: text.optional(), productSku: text.optional(), productImage: image.optional(), brand: text.optional(), price: money.optional(), salePrice: money.optional(), quantity: z.number().int().min(1).max(1000), selectedColor: z.object({ name: text, hex: text }).strict().optional(), selectedSize: text.optional(), maxStock: z.number().int().optional(), unit: text.optional(), product: jsonObject.optional(), selectedVariant: jsonObject.optional() }).strict();
type Contract = { method: string; path: string; body?: z.ZodType; query?: z.ZodType };
export const contracts: Contract[] = [
  { method:'POST', path:'/auth/login', body:z.object({identifier:z.string().min(1).max(254),password:oldPassword}).strict() },
  { method:'POST', path:'/auth/register', body:z.object({name:z.string().min(1).max(200),phone,email:z.email().optional(),password}).strict() },
  { method:'POST', path:'/auth/otp/send', body:z.object({phone}).strict() },
  { method:'POST', path:'/auth/otp/verify', body:z.object({phone,code:z.string().regex(/^\d{5,8}$/)}).strict() },
  { method:'GET', path:'/auth/me' }, { method:'POST',path:'/auth/refresh' }, { method:'POST',path:'/auth/logout' },
  { method:'POST',path:'/auth/change-password',body:z.object({oldPassword,newPassword:password}).strict() },
  { method:'GET',path:'/products',query:z.object({...pagination,category:id.optional(),brand:text.optional(),search:text.optional(),featured:z.enum(['true','false']).optional(),inStock:z.enum(['true','false']).optional(),sort:z.enum(['newest','price_asc','price_desc','rating','discount','popular']).optional(),minPrice:z.coerce.number().finite().nonnegative().optional(),maxPrice:z.coerce.number().finite().nonnegative().optional()}).strict() },
  { method:'GET',path:'/products/:idOrSlug' }, { method:'GET',path:'/categories' }, { method:'GET',path:'/banners' },
  { method:'GET',path:'/blogs' }, { method:'GET',path:'/blogs/:slug' },
  { method:'POST',path:'/coupons/validate',body:z.object({code:z.string().min(1).max(100),subtotal:money}).strict() },
  { method:'POST',path:'/orders',body:z.object({customerName:z.string().min(1).max(200),customerPhone:phone,customerNationalCode:z.string().max(20).optional(),shippingAddress:address,items:z.array(cartItem).min(1).max(100),couponCode:text.optional(),shippingMethodId:text.optional(),shippingMethodName:text.optional(),deliveryDateSlot:text.optional(),paymentMethod:z.string().min(1).max(100),notes:text.optional(),requiresOfficialTaxInvoice:z.boolean().optional()}).strict() },
  { method:'GET',path:'/orders' }, { method:'GET',path:'/orders/:id' }, { method:'GET',path:'/orders/track/:code' },
  { method:'GET',path:'/admin/dashboard' },
  { method:'GET',path:'/admin/products',query:z.object({...pagination,category:id.optional(),search:text.optional(),status:z.enum(['published','draft','scheduled']).optional()}).strict() },
  { method:'POST',path:'/admin/products',body:product }, { method:'PUT',path:'/admin/products/:id',body:product.partial() },
  { method:'DELETE',path:'/admin/products/:id' }, { method:'GET',path:'/admin/orders',query:z.object({status:status.optional()}).strict() },
  { method:'PUT',path:'/admin/orders/:id/status',body:z.object({status,trackingCode:text.optional(),postalBarnameh:text.optional()}).strict() },
  { method:'GET',path:'/admin/customers' }, { method:'GET',path:'/admin/settings' },
  { method:'PUT',path:'/admin/settings',body:settingsInput }, { method:'GET',path:'/admin/logs' },
];
export function validateAPI(req: Request, res: Response, next: NextFunction) {
  const validate = () => {
    const contract = contracts.find(c => c.method === req.method && new RegExp('^'+c.path.replace(/:[^/]+/g,'([^/]+)')+'/?$').test(req.path));
    if (!contract) return res.status(404).json({ error:'API operation not found.' });
    const match = req.path.match(new RegExp('^'+contract.path.replace(/:[^/]+/g,'([^/]+)')+'/?$'))!;
    try {
      for (const value of match.slice(1)) id.parse(decodeURIComponent(value));
      const body = (contract.body || empty).safeParse(req.body || {});
      const query = (contract.query || empty).safeParse(req.query);
      if (!body.success || !query.success) return res.status(400).json({ error:'Invalid request.' });
      req.body = body.data;
      // Query transforms are consumed by existing handlers through string conversion.
      (req as any).query = query.data;
      next();
    } catch { res.status(400).json({ error:'Invalid request.' }); }
  };
  if (req.path.startsWith('/admin/')) return requireAdmin(req,res,validate);
  if (req.path === '/auth/change-password' || req.path === '/auth/me') return requireAuth(req,res,validate);
  if (req.path === '/orders' || /^\/orders\/[^/]+\/?$/.test(req.path)) return requireAuth(req,res,() => requirePasswordChanged(req,res,validate));
  validate();
}
