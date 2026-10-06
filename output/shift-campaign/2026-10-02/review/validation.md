# Validation · 2 October 2026

Selected offer: SHIFT[1], online October 5-11, 2026, ฿670/person, ฿570/person when two friends apply together, capacity 15, deadline October 3, 2026. Live /shift/1 and local cohort data match. Live /shift/2 separately verified at ฿990, capacity 21, October 12-18, deadline October 10; application round=1 responds HTTP 200.

## Completed

- Nine existing shift-cohort Jest tests passed.
- ESLint passed for AdCarousel.tsx, adCopy.ts, ad/page.tsx, render-shift-ad.mjs and check-shift-ad.mjs.
- Changed-file whitespace check passed.
- Six PNGs verified 1080x1350, nonblank and below 1 MB each. Panorama 5400x1350.
- Each panorama tile matches its exported card pixel-for-pixel. Export now uses the unscaled render route; the prior fractional page preview produced a clipped panorama.
- Real project screenshots decoded before capture. TradBid simulation inspected and retained; object-contain preserves its controls.
- All six cards inspected on the 360x450 contact sheet; parent hook, offer and TradBid also inspected full size. Thai marks and vowels render, text is readable, essential content stays inside each card. Card-5 CTA/footer overlap corrected by reducing the FAQ list.
- Integer geometry preserved: scene CELL=6; phone review scaled by integer factor 3 with nearest-neighbor sampling. Thai text remains browser-rendered, not pixel-font substitutions.
- Prohibited public wording scan passed for organic and paid copy. Program targets, project outcomes and cohort capacity remain separate.
- Exported ad fields and links come from the page's current shared copy record, not a manually retyped offer.

## Limits

Official Meta pages were blocked/throttled; current placement specifications and campaign controls are unverified. No campaign settings, spend, targeting, launch, or publish action occurred. No full-repository build was run; browser rendering and focused checks cover the changed creative/export path.

No new outcome evidence found. Organic drafts improve the existing กสพท70 story with a reusable exercise. Claims are grounded in curated showcase records; no raw tester log, dated version archive, or consent register was located. Strategy pricing conflict remains unresolved. Old output/shift-ad and poster files are historical, separate assets; use only the dated campaign folder for this review.

## Reproduce

Start the existing Next dev server, then:

```sh
node scripts/render-shift-ad.mjs http://localhost:3010 output/shift-campaign/2026-10-02/paid/assets
node scripts/check-shift-ad.mjs output/shift-campaign/2026-10-02/paid/assets
```

This machine used SHIFT_PLAYWRIGHT_MODULE to point to the already installed GStack Playwright module. No permanent dependencies were added. The read-only preview is http://localhost:3010/shift/poster/ad; export route uses ?render=1, with &hook=parent for the alternate panorama.
