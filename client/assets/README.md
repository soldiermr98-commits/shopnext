# Local runtime assets

- Fonts are vendored, not fetched at browser runtime: Vazirmatn variable 5.3.0
  (Arabic, Latin and Latin-ext subsets) and Material Symbols Outlined 0.48.0.
  Source npm package names, byte sizes and SHA-256 hashes: `font-provenance.json`.
  Upstream licenses accompany binaries in `../public/fonts/`. Keep them in releases.
- The 23 distinct remote image URLs formerly embedded in active source could not
  be downloaded under this sandbox's network allowlist. **Original photographs
  have NOT been mirrored.** Their source locations/URLs are preserved in
  `remote-image-inventory.json`; do not treat this as a completed media import or
  as permission to redistribute third-party photos.
- Active source now uses a locally authored, visibly labeled SVG placeholder,
  including places that previously used banners/avatars. The layout is retained,
  but photography is intentionally not equivalent. Replace with owner-approved,
  licensed local images before production. Do not reintroduce remote hotlinks.
- Inventory/provenance JSON is maintainer metadata outside `public/`, not a runtime
  network source. schema.org JSON-LD identifiers are not fetched by the page.
- `npm --prefix client test` verifies HTML resources, font hashes/local CSS targets
  and removal of known source image CDNs. It is not a browser network certification:
  old localStorage cart images and future API-provided media URLs still need a
  validated same-origin/local-path policy in the Laravel integration.
