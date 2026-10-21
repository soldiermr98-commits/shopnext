# Current L1 encrypted secret settings

Implemented Laravel contract: app/Services/Settings + Data/SettingStatus,
encrypted Setting.value, authorized /api/admin/settings GET/PUT and
/admin/secure-settings. Four dormant credential slots, not active providers.
GET returns only key/isSet/constant masked form. PUT accepts key and optional
newValue; omitted/null/empty string preserves, explicit nonempty changes. No
secret getter/clear/prefill. Filament clears newValue on every response, including
validation, and tests inspect actual snapshots/effects/errors/formatted logs.
See [SECURITY](SECURITY.md), [ARCHITECTURE](ARCHITECTURE.md), [CI](CI_RESULTS.md).
The legacy general JSON settings below are NOT imported or exposed by this service.

---
## Archived Node / Phase-A reference (not current Laravel behavior)

# Settings storage and propagation

> **Historical baseline:** Phase A changed authentication, settings, validation and
> persistence error handling. See [current security contract](SECURITY_FOUNDATION.md)
> and the [audit status update](AUDIT_REPORT.md#phase-a-status-update--2026-10-20).
> Older route line numbers/test outputs below describe the audited baseline.

Phase 2 static analysis, 2026-10-20. [API](API.md) · [Frontend](FRONTEND.md) ·
[Database](DATABASE.md) · [Payments](PAYMENTS.md) · [SMS](SMS.md)

## Persistence contract

`server/db/repository.ts:683–695` reads `settings.value` where key is `general`,
parses JSON, and throws if missing. PUT merges `{...current,...newSettings}` and
serializes the result back to the same row. Nested objects are REPLACED, not deep
merged. There is no version, optimistic concurrency check, validation schema,
secret-vault integration, encryption/decryption or transactional history. SQLite
file access exposes stored settings values. `shared/types.ts:270–312` describes
StoreSettings, including arbitrary `gateways` and `sms` objects typed any.

## Masking and browser transport

- GET `/api/admin/settings` deep-clones through JSON then masks ONLY
  gateways.zarinpal.merchantId and sms.melipayamak.apiKey, leaving their final four
  characters (`server/api.ts:849–863`). Other sensitive-looking fields are not
  covered by this masking implementation.
- PUT `/api/admin/settings` returns merged settings UNMASKED (`:867–884`).
- No mechanism recognizes mask placeholders when saving; a UI round-trip can
  overwrite a real value with a masked display value.
- `AdminSettingsPage.tsx:17–28` loads/stores these settings. Client API substitutes
  FALLBACK_SETTINGS on GET failure; this may become a subsequent save payload.
- No public-safe settings DTO/endpoint or common storefront settings bootstrap.
  No provider secret belongs in storefront state/bundle.

No actual secret values are reproduced in these docs. Provider/credential-shaped
seed and UI values have UNVERIFIED real-world validity. Phase 3 will inventory
locations and reachable exposures separately.

## Which fields affect the application today?

| Field/group | Actual verified consumer/effect |
|---|---|
| freeShippingThreshold | Server order calculation, default 5,000,000 when nullish |
| standardShippingFee | Server order calculation, default 49,000 |
| expressShippingFee | Server order calculation, default 95,000 |
| vatPercent then vatPercentage | Server computes vatAmount, default 10%; not added to totalPaid |
| storeName,storeLegalName,phone,email,economicCode,nationalId,address | Editable in AdminSettingsPage; no common storefront API consumer found; footer/header content remains hardcoded |
| gateways.zarinpal.merchantId | Settings UI/masking/storage, not a payment request |
| gateway/provider IDs, nested gateways/sms | Storage/type/seed/UI representation only, no server dispatch adapter |
| currency | Type allows IRT/IRR, no verified provider unit conversion |
| maintenanceMode,allowGuestCheckout,enableCod,enableWallet,requireNationalCodeForTaxInvoice | Declared fields; no server enforcement found in implemented request flows |
| ThemeColors | Separate themeStore browser state, not StoreSettings persistence |

Cart shipping uses hardcoded 4,000,000/45,000; checkout express uses 65,000.
StoreSettings changes therefore do not synchronize displayed checkout estimates.
Full calculations and sequence are in [FLOWS](FLOWS.md).

## Distinct configuration surfaces

1. Runtime environment: NODE_ENV/PORT/JWT_SECRET/DISABLE_HMR; see discovery.
2. General JSON settings: real database persistence via settings page.
3. AdminPaymentPage and AdminSmsPage: separate local demo configuration and logs.
4. Theme manager: localStorage CSS-variable editing, no server theme config.

These are not one unified settings service. Saving provider settings in a demo
panel does not configure a live provider, and publishing a theme does not affect
other visitors. Planned hardening belongs in the later approval-only roadmap.
