# API reference — implemented contracts

> **Historical baseline:** Phase A changed authentication, settings, validation and
> persistence error handling. See [current security contract](SECURITY_FOUNDATION.md)
> and the [audit status update](AUDIT_REPORT.md#phase-a-status-update--2026-10-20).
> Older route line numbers/test outputs below describe the audited baseline.

Phase 2, 2026-10-20; static verification, runtime results UNVERIFIED.
[Architecture](ARCHITECTURE.md) · [Database](DATABASE.md) · [Frontend](FRONTEND.md)

## Conventions and effective authorization

Base `/api`, JSON bodies/responses, same-origin browser client. Success responses
use HTTP 200 even for creates. `User`, `Product`, `Order`, `Category`, `BlogPost`,
`Coupon`, `StoreSettings`, `ActivityLog` refer to `shared/types.ts`; repository
formatters, not interfaces, determine actual JSON. Undefined fields are omitted.
No runtime Zod schema is applied. Listed input checks are the actual checks, not
promised validation. No OpenAPI generator, pagination standard or API versioning.

Guard legend (all implemented in `server/api.ts:15–68`):
- **Public**: no middleware guard.
- **Resolver**: calls getUserFromReq but does not reject unauthenticated callers.
- **Auth**: requireAuth; would 401 if no user, but resolver defaults to seeded admin
  and wrapper can additionally fall back to sample customer.
- **Admin**: requireAdmin, nominal roles super_admin/admin/shop_manager; resolver
  and wrapper fall back to seeded admin. NOT an effective access boundary.

Resolver checks Bearer header then cookie, accepts fixed demo identity tokens,
otherwise verifies JWT and looks up the user. Missing/invalid tokens or resolver
errors return seeded admin. Do not publicly expose any endpoint with real data.
Cookie login: httpOnly, sameSite=lax, secure only with production NODE_ENV,
7-day maxAge; response also includes token. JWT expiry 7 days. No rate limiting,
revocation or granular role permissions. `/auth/me` special-cases no credentials
and returns `{user:null}` rather than invoking the default resolver.

## All mounted API endpoints

Handler references below are `server/api.ts:<line>` at the audit baseline.
`—` means no request body. All route-local catches generally return
500 `{error: err.message}` (some add a fallback message), not a shared error schema.

| Method / path | Guard | Request and actual validation | Success response | Handler |
|---|---|---|---|---|
| POST /auth/login | Public | `{identifier,password}` both truthy; lookup by phone/email, bcrypt comparison; missing 400, unknown/mismatch 401 | `{success:true,user:User,token}`; cookie and activity log | 77 |
| POST /auth/otp/send | Public | `{phone}` truthy with length >=10; missing/short 400; fixed demo code stored in memory with expires timestamp | `{success:true,message,expiresIn:180}`; no actual SMS | 121 |
| POST /auth/otp/verify | Public | `{phone,code}` truthy; stored code must match; 400 otherwise; DOES NOT check expires; consumes record; may auto-register with fixed default password | `{success:true,user:User,token}`; cookie | 145 |
| POST /auth/register | Public | `{name,phone,email?,password}` required truthy except email; duplicate phone 400; hashes password, customer role, no password-strength/format check | `{success:true,user:User,token}`; cookie | 195 |
| GET /auth/me | Public/special | Header/cookie presence; otherwise user null | `{user:User\|null}` | 240 |
| POST /auth/change-password | Auth | `{oldPassword?,newPassword}` new length >=6; old password checked only if supplied; invalid 400 | `{success:true,user:User,message}`; clears must-change flag and logs | 252 |
| POST /auth/logout | Public | — | `{success:true}`; clears cookie, does not revoke JWT | 291 |
| GET /products | Public | Query category,brand,search,featured,inStock,sort,minPrice,maxPrice,page,limit; integers parsed, page/limit >=1, no max limit; booleans only string true | `{products:Product[],total,page,limit,totalPages}` | 301 |
| GET /products/:idOrSlug | Public | ID lookup then slug; missing 404 | `{product:Product,related:Product[]}`; max 4 related | 335 |
| GET /categories | Public | — | `Category[]` | 361 |
| GET /banners | Public | — | Raw active banner rows: `{id,title,image,link,subtitle,active,order_index}[]` | 371 |
| GET /blogs | Public | — | `BlogPost[]` newest first | 381 |
| GET /blogs/:slug | Public | Slug; missing 404 | `BlogPost` | 391 |
| POST /coupons/validate | Public | `{code,subtotal}`; code truthy; coupon active; subtotal Number or 0, minimum enforced; invalid 400; expiry/usage limits NOT enforced | `{success:true,coupon:Coupon,discount,message}` | 404 |
| POST /orders | Resolver | See order body below; checks only items truthy/nonzero length, shippingAddress,customerPhone,customerName truthy | `{success:true,order:Order,message}` | 450 |
| GET /orders | Auth | — | `Order[]` for user; if empty substitutes sample customer's orders | 607 |
| GET /orders/:id | Public | ID; missing 404; no owner check | Full `Order` including recipient/address and items | 621 |
| GET /orders/track/:code | Public | Tracking code OR order number; missing 404 | Tracking projection described below | 634 |
| GET /admin/dashboard | Admin | — | `{kpis:{totalSales,ordersCount,customersCount,averageOrderValue,conversionRate,lowStockCount},salesChartData,recentOrders,lowStockProducts,topProducts}` | 666 |
| GET /admin/products | Admin | Query category,search,status,page=1,limit=50; status destructured but unused; page/limit parseInt without storefront clamping | `{products:Product[],total}` | 707 |
| POST /admin/products | Admin | Product-shaped body; no explicit required/type validation; generates id, createdAt, SKU fallback; SQL constraints may reject incomplete body | `{success:true,product:Product}`; logs | 723 |
| PUT /admin/products/:id | Admin | Partial Product body; repository whitelist only; missing product 404 | `{success:true,product:Product}`; logs | 752 |
| DELETE /admin/products/:id | Admin | ID; no missing-ID rejection or order protection | `{success:true,message}`; logs | 777 |
| GET /admin/orders | Admin | Optional query status | `Order[]` | 800 |
| PUT /admin/orders/:id/status | Admin | `{status,trackingCode?,postalBarnameh?}`; no enum/transition validation; delivered sets isPaid=true | `{success:true,order:Order\|null}`; logs | 811 |
| GET /admin/customers | Admin | —; usersRepo.list without role filter | `User[]` including non-customer roles | 839 |
| GET /admin/settings | Admin | — | `StoreSettings` clone with only nested ZarinPal merchantId / Melipayamak apiKey masked to last four | 849 |
| PUT /admin/settings | Admin | Arbitrary body shallow-merged; no whitelist/schema or masked-value preservation | `{success:true,settings:StoreSettings,message}` UNMASKED | 867 |
| GET /admin/logs | Admin | — | Latest 100 `ActivityLog[]` | 889 |

29 `/api` routes total. Separate `GET /health` at `server.ts:45–46` returns
`{status:"ok",timestamp:<ISO>}`; this is process liveness, not a DB/provider check.
OPTIONS for all paths is answered 200 by the CORS middleware.

### Order-create body and output semantics

```text
customerName, customerPhone, customerNationalCode?,
shippingAddress: Address, items: CartItem[], couponCode?,
shippingMethodId?, shippingMethodName?, deliveryDateSlot?,
paymentMethod, notes?, requiresOfficialTaxInvoice?
```

This is a descriptive shape, NOT an enforced schema. Server trusts item.price,
nested product/selectedVariant prices and quantities before DB prices; missing
products may become custom items. Server mutates base product stock per item
before inserting order. No stock sufficiency, variant reservation or transaction.
Shipping/tax defaults and formulas: [flows](FLOWS.md#cart-checkout-and-order-creation).
Response includes generated IDs/tracking/postal identifiers, subtotal/discounts,
shipping/vat/total, payment labels/flags and optional invoice serial. `cod` sets
processing and paid=true; wallet sets paid=true without debit; others awaiting_payment.

### Tracking response

`{orderNumber,trackingCode,postalBarnameh,status,customerName,itemsCount,totalPaid,
createdAt,shippingMethodName,deliveryDateSlot,shippingAddress:{province,city}}`.
The full order endpoint is a separate public endpoint and is not this projection.

### Product persistence contract

Create reads the Product interface, converts JSON fields and inserts supplied
variants separately. Update accepts title,slug,sku,brand,price,salePrice,
discountPercent,stock,shortDescription,fullDescription,mainImage,status,featured,
categoryIds,galleryImages,specifications. Other Product fields are ignored by
update, including variants, attributes, tags, brandId, type and videoUrl.
See [schema](DATABASE.md) for NOT NULL/UNIQUE constraints and SQL field types.

## Middleware and errors

Order: CORS wildcard + OPTIONS short circuit → express.json(10mb) → urlencoded
parser → cookie-parser → API router/per-route guard → controller → repository →
synchronous DB export. `/health` then Vite middleware (development) or static dist
and GET SPA wildcard (production). No custom global error handler, security header
middleware, CSRF middleware or rate limiter. Body parse and uncaught routing errors
use Express defaults, potentially non-JSON. Unknown API routes have no JSON 404;
GET can reach SPA serving. Most controllers expose err.message in 500 responses.

## Absent contracts / integration mismatch

No payment request/verify/callback/refund, real SMS send, upload, theme publish,
category/brand/coupon/content writes, role editor, backup or home-builder endpoint.
`AuthModal.tsx:28,57` calls `/auth/send-otp` and `/auth/verify-otp`, while implemented
paths are `/auth/otp/send` and `/auth/otp/verify`. This is a real integration
mismatch, not an alternative supported API. No fixes applied in this phase.
