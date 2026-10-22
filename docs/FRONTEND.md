# Frontend architecture

> **Historical baseline:** Phase A changed authentication, settings, validation and
> persistence error handling. See [current security contract](SECURITY_FOUNDATION.md)
> and the [audit status update](AUDIT_REPORT.md#phase-a-status-update--2026-10-20).
> Older route line numbers/test outputs below describe the audited baseline.

Phase 2 static verification, 2026-10-20. [Architecture](ARCHITECTURE.md) ·
[API](API.md) · [Flows](FLOWS.md) · [Discovery](DISCOVERY.md)

## Entry, routing and rendering

`src/main.tsx` renders App with createRoot and imports index.css. App wraps Routes
in BrowserRouter; no SSR, Suspense or React.lazy boundary is present. All pages
are imported eagerly. App checks auth on mount and toggles root dark class.
StorefrontLayout also checks auth and initializes theme on path changes and
scrolls to top. AdminLayout does not reject unauthorized users: its effect sets a
synthetic super_admin and demo token (`AdminLayout.tsx:43–57`). It duplicates page
selection in renderCurrentView (`:103–121`), using Outlet only as fallback, despite
nested routes already existing in App. This is not an independent router.

### Every configured route → component → data source

Source of truth: `src/App.tsx:78–114`. Component paths are under src/pages unless noted.
All storefront routes below use StorefrontLayout; admin routes use AdminLayout.

| URL | Component | Real source / demo caveat |
|---|---|---|
| / | storefront/HomePage | api.getBanners/getCategories/getProducts/getBlogs; fallback datasets; hardcoded sections/countdown |
| /shop | storefront/ShopPage | URLSearchParams → api.getProducts and categories; query filters; fallback catalog |
| /product/:idOrSlug | storefront/ProductDetailPage | api.getProduct → product/related; variants/images state; cart store |
| /cart | storefront/CartPage | cartStore/localStorage, coupon validation API |
| /checkout | storefront/CheckoutPage | auth/cart stores, hardcoded shipping/recipient defaults, api.createOrder |
| /order-success/:id | storefront/OrderSuccessPage | location.state.order or api.getOrder(id); no payment verification |
| /track-order | storefront/OrderTrackingPage | code query/input → api.trackOrder; loading/error state |
| /account | storefront/AccountPage | authStore + api.getMyOrders; much address/wishlist/review/wallet/return data from constants/local state |
| /blog | storefront/BlogPages.BlogListPage | api.getBlogs with fallback |
| /blog/:slug | storefront/BlogPages.BlogPostPage | api.getBlog with fallback (can substitute first post for unknown slug) |
| /about | storefront/StaticPages.AboutPage | Static JSX |
| /contact | storefront/StaticPages.ContactPage | Local form + success toast; no API/storage |
| /faq | storefront/StaticPages.FAQPage | Static FAQ + local accordion |
| /admin | admin/AdminDashboardPage | api.admin.getDashboard; mixed database KPIs/static chart and client fallback |
| /admin/products | admin/AdminProductsPage | api.admin product list/create/update/delete, api.getCategories |
| /admin/categories | admin/AdminCategoriesPage | api.getCategories; mutations local; brands from INITIAL_BRANDS |
| /admin/orders | admin/AdminOrdersPage | api.admin.getOrders/updateOrderStatus |
| /admin/customers | admin/AdminCustomersPage | api.admin.getCustomers; actually returns all roles |
| /admin/marketing | admin/AdminMarketingPage | INITIAL_COUPONS/INITIAL_BANNERS and local flash-sale controls |
| /admin/content | admin/AdminContentPage | api.getBlogs, edits local; INITIAL_STATIC_PAGES |
| /admin/media | admin/AdminMediaPage | INITIAL_MEDIA and URL-only local entries; no uploads |
| /admin/theme | admin/AdminThemePage | themeStore draft/live preview/localStorage publication |
| /admin/payment | admin/AdminPaymentPage | INITIAL_GATEWAYS/INITIAL_TRANSACTIONS; local config, not provider requests |
| /admin/sms | admin/AdminSmsPage | Local provider/pattern/log state; setTimeout simulator |
| /admin/settings | admin/AdminSettingsPage | api.admin.getSettings/saveSettings; persisted general JSON |
| /admin/logs | admin/AdminLogsPage | api.admin.getLogs; fallback empty array |
| * | App.NotFoundPage | Static 404 UI; not an HTTP status response |

`/wishlist` is linked from StorefrontLayout mobile navigation but has no configured
route: it reaches the wildcard. Compare, home-builder, menus, role and backup
routes do not exist. Account tabs are not separate router entries.

## State and API layer

| Module | State / persistence | Consumers |
|---|---|---|
| store/authStore.ts | User, token, modal; token in digistyle_token localStorage; starts/resets to DEMO_USER_SOHRAB | Layouts, auth modal, checkout/account/nav |
| store/cartStore.ts | Items + quantity/variant details; digistyle_cart localStorage; seeded demo items if no saved cart; coupon transient | Cart/detail/shop/home, drawer, checkout/nav |
| store/themeStore.ts | Draft/applied colors; digistyle_custom_theme and digistyle_dark localStorage | Theme page/layout/App |
| store/toastStore.ts | In-memory toast array, timed removal | ToastContainer/pages |
| page React state | Filters, forms, modals and many fake admin datasets | Individual pages; generally lost on remount |

`src/lib/api.ts:15–61` wraps fetch with `/api`, JSON Content-Type except FormData,
Bearer token from localStorage, error extraction from `{error}`, then response.json.
No explicit credentials override, timeout, AbortController, retry policy, cache or
query library. Browser default same-origin cookie behavior applies. No schema
validation of success JSON. AuthModal and authStore also call fetch directly.

Read helpers catch broadly (including authorization/server errors) and substitute
fallback catalog/categories/banner/blog/settings/dashboard data or empty lists.
Mutations and single order/tracking reads propagate errors. Product detail fallback
can pick a matching fallback ID/slug or first fallback product. These paths can
hide a missing backend and make wrong/missing resources look valid. API request
success is not an indicator of gateway payment success.

## Design tokens and live theme injection

`src/index.css`: Tailwind v4 @import plus :root semantic custom properties,
.dark overrides, @theme aliases (`--color-primary: var(--primary)` and surface,
outline/error variants), RTL body styles, custom scrollbars and
invoice print styles. Fixed colors also remain in components. Font and Material
Symbols are externally loaded by index.html; icon libraries also appear in source.

`themeStore.ts:62–121` updates exactly SIX inline root CSS properties: primary,
primary-container, secondary, secondary-container, tertiary, tertiary-container.
setDraftColor calls applyLivePreview immediately. publishTheme writes the whole
draft object to localStorage and applies; revert restores last applied six colors.
background, surface and borderRadius are present in ThemeColors/DEFAULT_THEME but
are NOT injected by applyLivePreview/revert. Browser-local publication is not a
server save, a global brand change, or a cross-user deployment. Inline colors can
override stylesheet .dark values. initTheme is invoked by StorefrontLayout; direct
admin entry does not initialize all stored custom colors through that effect.
See [flow](FLOWS.md#theme-change-and-live-apply).

## Component catalog and boundaries

| File under src/components | Role |
|---|---|
| layout/StorefrontLayout | Outlet, TopNavBar/Footer, modal/drawer/toasts/mobile navigation; auth/theme side effects |
| layout/AdminLayout | Admin chrome/sidebar/notifications, duplicate view switch, synthetic admin promotion |
| shared/AuthModal | Password/OTP/register forms; direct fetch; OTP path mismatch; send catch can show demo success |
| shared/TopNavBar | Store navigation/search, account/cart actions, local UI state |
| shared/Footer | Hardcoded storefront links/contact/brand presentation |
| shared/MiniCartDrawer | cartStore items/quantity/remove and checkout links |
| shared/Breadcrumb | Link/current breadcrumb display |
| shared/CheckoutStepper | Step indicator |
| shared/ToastContainer | Renders toastStore notifications |

No primitive design-system package, universal form/schema wrapper, media picker,
query cache or shared product-card module exists. Cards/forms are substantially
inline in pages. Largest page is AccountPage (~2655 lines at baseline). Runtime
bundle sizes, accessibility, responsive/RTL visual quality remain UNVERIFIED until
Phase 3; no lazy-loading claim is made.

## Persian, RTL, Jalali and SEO

HTML sets lang=fa, dir=rtl; body styles force RTL/right alignment. Persian text is
mostly hardcoded; no translation key/catalog, locale switch or i18n framework.
`lib/persian.ts` handles Persian/Arabic-to-ASCII digits, ASCII-to-Persian output,
rounded Toman display and Gregorian→Jalali date formatting. Date helpers use
browser-local getters; there is no explicit Tehran timezone enforcement. Algorithm
boundary/leap-day correctness remains UNVERIFIED without tests.

Static index.html metadata/OnlineStore JSON-LD applies to all SPA routes, including
hardcoded public domain. No per-product/page SEO service, server-rendered content,
sitemap/robots generator or redirect registry exists. SPA 404 UI is not HTTP 404.
