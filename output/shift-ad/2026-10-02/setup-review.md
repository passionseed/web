# Meta carousel setup review, 2 October 2026

No campaign, post, ad, message, or spend created. These are review assets.

Official guides were read in a real browser on this date after the web reader returned login/block pages. Summary below is paraphrased; the browser result, not third-party spec tables, grounds these notes.

- [Instagram Feed carousel, official Ads Guide](https://www.facebook.com/business/ads-guide/update/carousel/instagram-feed): image-only carousels use 4:5; carousels with video use 1:1. PNG/JPG, at least 1080×1080, 2–10 cards, max 30 MB/image, 1% ratio tolerance. Primary text recommendation 125 characters. These five 1080×1350 image cards meet that shape.
- [Facebook Feed carousel, official Ads Guide](https://www.facebook.com/business/ads-guide/update/carousel/facebook-feed): recommends 1:1, at least 1080×1080, 2–10 cards, max 30 MB/image, 3% ratio tolerance. Text recommendations: 80 primary / 20 headline / 18 description characters. This 4:5 set needs a separately composed square set for Facebook Feed. Automatic square cropping would lose essential content.
- [Create a carousel ad, official Help Centre](https://www.facebook.com/business/help/1375829326076396?id=563305920700338): separate links and copy per card; carousel can be automatically presented as a slideshow. Supports several objectives with differing flows. The applicable objective/CTA must be checked in the account preview.

## Conditional handoff, after owner review

Use a manual image carousel, with student or parent hook card 1 followed by cards 2–5. For this exported set, select Instagram Feed only and preview all five cards before approving publication. Request a square redesign if Facebook Feed is required. Keep paid creative separate from the organic post.

Preserve the five-card order for the panorama. Where the account exposes ordering, personalized starting cards, or automatic creative/slideshow transformations, inspect the preview and turn off transformations that alter the intended sequence or crop. Meta's guide states that a personalized first card may still occur; all cards contain their own essential proof/context as a fallback. This is an editorial recommendation, not a verified claim that every account offers identical controls.

CTA draft: Learn more / ดูเพิ่มเติม, leading to the cohort-specific `/shift/1` page. If unavailable for the chosen objective, reassess the objective and CTA together; do not silently switch to a messaging destination. Application follows `/shift/apply?round=1` from that page. No application submissions made.

Tracked card links and matching primary text are in `ads-manager.json` and `ads-manager.md`. Student/parent variants have different card-1 `utm_content`. Other cards retain per-card attribution. Campaign `shift1_carousel`; source `meta_ads`; medium `paid_social`. These links identify clicks, not proven users or paid enrollments.

Primary text opening lines are concise; full explanatory copy is longer than the feed recommendation and may appear behind See more. Essential project attribution and offer remain in images. Recommendations are not universal hard text limits. No objective, optimization event, audience, budget, bidding, or performance forecast is prescribed: conversion-event readiness and ad-account setup have not been inspected.

Expires with round 1 deadline: 3 October 2026, Bangkok. No closing hour is published; do not invent a 23:59 cutoff. Re-read cohort and live terms before any future use. Pricing strategy and LINE payment-ID discrepancies remain in the claim ledger.
