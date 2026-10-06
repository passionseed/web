# Validation and handoff

- Six organic 1080×1350 cards exported separately from six paid assets (five-card sequence plus alternate parent hook). Paid panorama 5400×1350. PNG dimensions asserted during export, image decoding awaited, local fonts awaited. No dependencies installed.
- Every paid render inspected at full size and at 360×450 phone size. Thai shaping, text bounds, screenshot controls, clean card boundaries, fixed dates, price, pair discount and capacity checked. Pixel scene uses six output pixels per cell; phone thumbnails use two per cell. Panorama composed from full-size exports, no fractional CSS preview capture.
- Six organic renders visually checked via contact sheet. Suggested questions and hypothetical examples are labeled. Screenshot has no student identity. Body type 42–46 px, paid proof 36 px, paid secondary copy 32–38 px. Small URLs/branding are supplementary; proof does not depend on reading them.
- Card 4 originally had text overlapping the boat. Removed that supporting line and rerendered. Card 5 uses three FAQ bullets to preserve space for the deadline and destination. Parent hook and parent primary text match.
- Scoped ESLint passes for all changed TS/TSX files; both render scripts pass Node syntax checks. Next development renders of both poster routes succeeded.
- Full `tsc --noEmit` fails with 527 errors outside the touched campaign/guide files. No diagnostics name the changed guide/ad/frame files. Existing route/Supabase and other repository typing issues remain; this is not a clean full-project typecheck.
- `git diff --check` passes. New source/draft text scanned for credential patterns. No credentials or private student data introduced. No staging, commit, deployment, publishing, external messages, application submission, ad launch or spend performed.
- Meta official guide read in browser: requested 4:5 cards fit image-only Instagram Feed guidance. Facebook Feed guidance calls for square 1:1; a separate square layout is required before including that placement. Account-specific objective/CTA/optimization not verified.

## Reproduce

Use an existing Next development server. This review used `http://localhost:3010`. The app bundle provides Playwright; set `SHIFT_PLAYWRIGHT_MODULE` to its `playwright/index.mjs` path when Playwright is not a project dependency.

```sh
node scripts/render-shift-ad.mjs http://localhost:3010 output/shift-ad/2026-10-02
node scripts/render-shift-guide.mjs http://localhost:3010 output/shift-content/2026-10-02/organic
```

Reread cohort data and the live offer before re-exporting on another day. Dated review files are immutable campaign snapshots; the code follows canonical cohort content when next rendered.

## Evidence still unavailable

Raw tester analytics for Lens; TradBid v1/v2 change log; กสพท70 interview notes and interview count; SHIFT completion/admissions results; measured changes in autonomy, competence or relatedness. Recorded showcase proof supports this draft, but does not establish these stronger claims. No new cohort report was found. This run adds a practical guide and improves claim discipline, not a new student result.

## Owner review items

Pricing strategy versus published ฿670/฿990 offers; live payment section still using the old LINE ID; Facebook square creative if needed. No deadline hour is specified in published terms. Preserve these as gaps instead of inventing policy or a cutoff.
