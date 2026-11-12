---
name: key-art-poster
description: Design a bespoke PassionSeed poster or poster series as key art (one dominant pixel image, one headline, a quiet offer band), built in React and rendered to PNG. Use when asked for a poster, a set of posters from several points of view, or to make a poster "more dynamic", "less flat" or "less slop", especially for SHIFT rounds in the pixel style. Covers concept, layout numbers, depth techniques, readable labels, Instagram captions, banned patterns and the render loop.
---

# Key-art poster

A poster that stops the scroll does one thing: one image you understand in a
glance, one line that names the feeling, then the offer. Reference build:
`components/shift/poster/pixel/halloween/lab/` (SHIFT[3] "small startup lab",
five POVs, route `/shift/poster/3/startup-lab`).

## 1. Facts and copy first

- Every date, price, seat count and deadline comes from the cohort record
  (`lib/content/shift-cohort.ts`, or a `facts.ts` like
  `components/shift/poster/shift3/facts.ts`). Never type a literal.
- Copy rules: `lib/marketing/copyRules.ts` (no em dash, no น้อง/ลูก, no
  การันตี, ต้นแบบ not "finished app", one "!" max). Student quotes only from
  `lib/content/shift-voices.ts`.
- If the run touches marketing claims, follow the `marketing-studio` routine
  for the claim ledger and angle log.

## 2. Concept: one feeling, one literal image

For each poster (or each POV in a series) write two lines before any code:

- **Feeling** the viewer should have (pride, dread then relief, nerves, safety, wonder).
- **Image** that shows it literally, as one object or scene.

Worked examples from the reference set:

| POV | Feeling | Image | Headline |
|---|---|---|---|
| Founder | Main character | Student low-angle in front of a huge moon, role hats orbiting | หมวกทุกใบ เป็นของคุณ |
| Customer | Dread | Tilted phone "0 USERS", a ghost climbing out | ของที่ไม่มีใครใช้ คือโปรดักต์ผี |
| Audience | Nerves, then pride | Seen from the crowd: spotlights, podium, screen asks "ใครใช้แล้ว?" | คนดูไม่ซื้อไอเดีย เขาซื้อหลักฐาน |
| Parent | Safe to say yes | Tilted receipt with a refund stamp, coins into a pumpkin bank | ลองเป็น Founder ก่อนลงทุนจริง |
| The lab | Wonder | Cauldron light, prototype and portfolio windows flying out | เราไม่ให้ไอเดีย เราเปิดแล็บให้ |

If you need stickers or a list to explain the image, the image is wrong.

## 3. Layout (1080x1350)

Key-art order, top to bottom:

1. **Image**, full bleed, y 0 to ~790. The focal object is big and central or on a strong diagonal.
2. **Fade** from y ~640 into ink, so the type sits on night.
3. **Headline**, bottom left, ends ~26px above the band: Kodchasan bold 98px, leading 1.12, cream, one accent word in pumpkin. Two lines max.
4. **One sub line**, 28px, cream at ~78%.
5. **Offer band** (the Halloween cover's wavy ink band): name + one-line positioning, price, dates and time, refund marker, deadline, the pixel `CommentBubble` CTA, logo and link.

## 4. Depth without clutter

Use these, all of them restrained:

- **Scale contrast**: hero sprite ~24-26px per cell, background props ~6-8px.
- **Cropping**: let near objects run off the edge or into the fade.
- **Perspective on flat things**: `perspective(1300-1600px) rotateX/rotateY` plus a small `rotate` for a phone, receipt or screen.
- **One light source per poster**: moon halo, crossed spotlights, a glowing screen or brew. `drop-shadow` glow only on the lit object.
- **Front and back layering**: split an orbit ring with two clip paths so half passes behind the hero.
- **Pixel world from the kit**: flat sky, pixel stars, moon, skyline (`pixelKit.ts`, `halloweenKit.ts`).

## 5. Labels people can read in one glance

Small labels fail on phones (a 1080px post shows ~375pt wide, so 30px is ~10pt). Every label:

- **First language**: a short Thai verb phrase for what the thing does (คุยกับคนจริง), not English jargon. English role, if any, sits small above as the second level.
- **Familiar letterforms**: the headline face at 30px or more. Never Tiny5 for small text (its P reads F, N reads H, V reads Y).
- **Figure and ground**: cream on a solid ink plate, never coloured text on the moon or lit windows.
- **Proximity**: directly under or beside its object, so the pairing needs no line or arrow.
- **Four labels at most** per image (working memory).
- **Above the fade**: pass them through `Poster`'s `front` prop.

## 6. Banned (reads as AI slop)

- Mitr font. Thai display is Kodchasan.
- Eyebrow labels ("POV 01/05 · THE FOUNDER") and kicker lines stacked over the headline.
- 3D extruded or stacked-shadow type.
- Rotated sticker tags scattered around the image; starburst CTA badges.
- Sunburst rays, vaporwave perspective floor grids, random glowing particles, scanlines or grain overlays.
- Flat side-by-side boards or comparison panels as the main visual.
- More than one CTA device (the band's comment bubble is the CTA).

## 7. Caption

The caption is the poster's second read, not a second poster. Write it in
`captions.ts` beside the posters (reference:
`components/shift/poster/pixel/halloween/lab/captions.ts`), built from the
cohort facts, one entry per poster key.

1. **Line 1 is the headline as a sentence.** Instagram shows about two lines
   before "more", so the hook must stand alone. Line 2 names the feeling or
   who it is for.
2. **One turn, one idea.** A short block that turns the feeling into one
   concrete thing the program does (from the run plan, not invented). Short
   lines, one thought each; a list gets its own heading line ("คุณเอามา",
   "แล็บมีให้") and one item per line, never a run-on with commas.
3. **The same offer block on every poster in the set**: name and positioning,
   dates and time, price and pair price, seats and deadline, refund line.
   Drop a line only when the body already says it (the parent caption
   carries the refund line in its body).
4. **One CTA**: `คอมเมนต์ "SHIFT" แล้วรับลิงก์สมัครทาง DM`, then the link as
   the fallback. Straight quotes: curly quotes mark verbatim student quotes
   and skip the copy linter.
5. **Five hashtags at most**, at the end.
6. Parent captions talk to the parent (ผู้ปกครอง) and answer time, place,
   outcome and risk. Never ลูก or น้อง.
7. Run `lintText` from `lib/marketing/copyRules.ts` on every caption.

## 8. Build and render

- Copy the reference structure: `kit.tsx` (Poster shell with `front`, Night,
  Moon, Skyline, Sprite, Win), sprite grids in `labArt.ts`, one file per poster
  in `posters/`, a registry, and a `SheetGallery` route page.
- Unique SVG ids per poster (prefix with the poster id): many sheets share a page.
- Render from the snapshot server, never `pnpm dev`:

```bash
scripts/studio-server.sh            # start once (:3010)
scripts/studio-server.sh --sync     # after every edit
node scripts/render-poster.mjs --route /shift/poster/<round>/<slug> \
  --ids <id-1>,<id-2> --out output/marketing/<date>/<slug>
```

- Open every PNG at full size. Fix, re-sync, re-render.

## 9. Review checklist

- [ ] The image reads in under a second with the headline covered.
- [ ] One headline, one sub line, no eyebrow, no stickers.
- [ ] Thai tone marks don't collide between lines or with the art; ` ` keeps phrases like "พอร์ต 1 หน้า" together.
- [ ] Labels: Thai, 30px or more, on ink, next to their object, four or fewer.
- [ ] Every fact comes from the cohort record; no number without a source.
- [ ] Copy rules pass (run `lintText` from `lib/marketing/copyRules.ts` over the poster files and every caption).
- [ ] Each caption's first line works alone, and the offer block matches the band.
- [ ] `pnpm lint` and `npx tsc --noEmit` clean for the new files.
