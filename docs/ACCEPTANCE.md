# Real-browser / shared-host acceptance — owner checklist

**Status: ALL items UNVERIFIED until the owner executes and records results.**
CI/Livewire/HTTP tests are not a real browser or real TLS/shared-host acceptance.
Use a staging HTTPS origin, private fresh fixtures and a recorded release SHA.
Never record cookies, passwords, raw settings, APP_KEY or runner token in evidence.

Record: date/time UTC __; release SHA __; origin __; web/CLI PHP __; DB __;
browser/version __; viewport __; operator __. For each item record PASS/FAIL,
redacted evidence and ticket; unchecked = UNVERIFIED, not an implied PASS.

## Deployment / transport

- [ ] Public root contains only public assets/index; /.env, /vendor, /storage logs,
      /app, local token/helper files are inaccessible; directory listing disabled.
- [ ] HTTPS certificate/chain/redirects work; CLI/web PHP versions/extensions agree
      with requirements; no public phpinfo or debug output. bcmath confirmed.
- [ ] / and direct refresh /account load the SPA; /api/unknown and missing assets
      are404, not SPA HTML. /admin/login loads local Filament assets.
- [ ] Network panel (cache disabled) shows no external font/CDN/avatar/photo script
      requests; CSP has no functional violations. Check local font/icon/image
      placeholders honestly; they are NOT mirrored original photographs.
- [ ] Inspect document AND error headers: CSP, nosniff, DENY, HSTS over HTTPS,
      referrer/permissions policy. Static files have host-level appropriate headers.
- [ ] Untrusted Origin is denied CORS; unexpected Host is rejected; spoofed forwarded
      headers do not change IP/scheme unless sent by configured ingress.

## Customer login, CSRF and logout (two separate browser profiles)

- [ ] Register a NEW customer with a unique valid phone and14+ char <=72-byte
      password; no demo accounts or fallback identity. Log out before login testing.
- [ ] Open login, inspect /sanctum/csrf-cookie; session cookie __Host-... is Secure,
      HttpOnly, Strict, host-only and Path=/. XSRF-TOKEN is readable intentionally.
- [ ] Login succeeds with current credentials, old session id rotates, /api/auth/me
      returns the actual customer; no bearer/JWT token or auth secret in response.
- [ ] With DevTools request replay, remove/forge X-XSRF-TOKEN on a mutation:419;
      valid CSRF proof succeeds. No disabling CSRF/cookie security as a workaround.
- [ ] Wrong password and absent account fail generically; flood lockout is enforced.
      OTP send/verify remain503, never a temporary bypass or default code.
- [ ] Logout requires CSRF, clears the session and /api/auth/me becomes401. Refresh
      and another tab cannot resurrect a demo/refresh-token identity.
- [ ] Current-password change rejects wrong old password, rotates safely and revokes
      another profile's prior session; test multi-byte byte limits without logging it.

## Staff / forced password / authorization

- [ ] New bootstrap admin logs in ONLY via /admin/login; remember-me absent; default
      font/avatar requests are local. Customer endpoint does not sign staff in.
- [ ] Initial admin is redirected to password profile; dashboard/settings blocked
      until current-password proof and valid different new password are submitted.
- [ ] Correct rotation unlocks dashboard, removes bootstrap password usability and
      revokes other staff sessions. Remove ADMIN_* bootstrap values privately.
- [ ] A customer profile cannot enter /admin or call /api/admin/settings/media (403);
      unauthenticated API access is401; inactive/unauthorized staff are denied.
- [ ] Five failed staff attempts then lockout: known and absent accounts show the
      SAME lockout notification; even a correct password waits until decay. Repeat
      from clean profiles/allowed rate window; do not test against other users.
- [ ] No business resources for products/orders/pricing/payments/SMS exist in Filament.

## Settings, audit and uploads

- [ ] Admin settings shows only constant mask/isSet, never actual saved values.
      Omitted/empty input retains the prior value; explicit newValue rotates it.
- [ ] Inspect successful AND invalid Livewire/API response payloads: no submitted or
      stored setting value. Input clears after save/error. Do not save raw traces
      containing a secret; use redacted assertions and discard test secrets.
- [ ] Verify settings creation/rotation and media upload produce actor/model/IP/UTC
      audit with sensitive values redacted; customers cannot read it. Review CI
      create/update/delete fixture proofs; do not invent unbuilt business resources.
- [ ] SVG, executable extension, mislabeled image, >2 MiB and >2048px uploads rejected;
      a valid raster is random-named PNG, original payload/metadata stripped, /media
      has image/png+nosniff. No uploaded path can execute PHP. Rich text removes
      script/events/SVG/iframe/javascript links; plain text stays escaped.

## Cron / readiness / no-terminal option

- [ ] Only ONE minutely schedule:run cron; selected absolute PHP path and private log.
      Dashboard displays cron age and healthy processed database queue pulse.
- [ ] Temporarily pause staging cron >3min: dashboard warns; resume and see recovery.
      No persistent worker/Supervisor/Redis required; no overlap/host timeout errors.
- [ ] deploy-check returns0 with fresh heartbeat; stale/failed queue cases return
      nonzero. Verify actual host process limits/PCNTL behavior, not just flags.
- [ ] If using no-terminal runner: unauthorized/HTTP/GET rejected, correct HTTPS POST
      token runs once, URL self-deletes to404, replay fails; token never in URL/logs,
      private config contains hash only. Remove local token and temporary files.
- [ ] DB + persistent APP_KEY/.env + media backup restored in a separate staging
      environment; existing secrets still decrypt. No production key regeneration.

## Browser usability / scope gate

- [ ] RTL layout, keyboard focus/order, labels, error announcements, mobile layout,
      readable contrast and password-manager behavior reviewed in actual browsers.
- [ ] Existing mock catalog/cart/checkout UI is NOT mistaken for backend pricing,
      checkout or a working payment/SMS integration. No real purchase/provider call.
- [ ] All failures resolved or explicitly accepted as blockers; owner records sign-off
      before production or L2 planning. The l1-complete tag marks implementation/CI,
      not execution of this checklist and not permission to begin L2.
