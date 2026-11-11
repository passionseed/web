# PS-01 "Day 7" camp shirt: render brief (round 2)

We already picked the garment. Now render it properly so the founder can approve it before we make print files. The founder's complaint so far: "no art taste", "I don't want a fast fashion piece, I want a cool garment". Aim for a lookbook from a good independent label (Kapital, Story mfg, Online Ceramics, early Brain Dead, Carhartt WIP x Japanese workwear), not a merch mockup.

## References (look at all of them; attach as input images if your tool supports it)
- Base garment to keep: `gen/codex/codex-3-night-shift-full.png` (keep this shirt block exactly).
- Back-art idea donor: `gen/agy/agy-1-sashiko-chore-full.png` (mascot whose flame breaks out of a frame, serif wordmark under it).
- Logo (must be faithful): `gen/refs/logo.png`. A black seed with two big white googly eyes (black pupils centred), white brows, sitting inside a yellow flame with orange and bright-yellow tongues, on a maroon disc. One flame tongue at the top right breaks out of the disc. NO mouth, NO smile line, NO extra shapes.
- Style refs the founder likes: `gen/refs/ref-boy-in-a-dream.png` (black ink comic illustration, stepped pixel serif type, photocopy texture) and `gen/refs/ref-star-bitmap.png` (one-colour 50% threshold bitmap, grainy). Take the METHOD only. Never copy their drawings: no running boy, no comet, no hearts, no swirl, no sparkles, no star frame.

All paths are under `/Users/bunyasit/dev/passionseed/web/output/merch/ps-01/`.

## The garment (same in every image)
Boxy short-sleeve camp shirt, one-piece open camp collar, dropped shoulder, straight hem with 8cm side vents, no back pleat. Deep burgundy / oxblood linen-cotton slub (#5E1B2C, visible slub texture, slightly washed). 5 natural coconut-shell buttons. One chest pocket on the wearer's left (12 x 14cm, clipped bottom corners) with an off-white hand running stitch (sashiko) along its sides and bottom, and one row of exactly 7 flame-yellow running stitches just under the pocket mouth. A small heat-cut embroidered logo patch (about 5cm, shaped to the disc + the flame tongue breaking out) on the wearer's left front, 3cm above the hem. Small printed edition tape in the left side seam near the hem reading "No. __ / 10". The front stays quiet: no front print, no D-rings, no straps, no metal hardware.

## Back print: ONE colour, cream ink (#EDE3CC), soft discharge look, on the burgundy
Placed on the back panel below the yoke, about 26cm wide x 30cm tall on a size M (so it does not fill the whole back; plenty of burgundy around it).

### Back A: logo panel
- A hand-inked comic panel border (wobbly brush-pen rectangle, about 24 x 20cm).
- Inside it, the real PassionSeed mascot rendered as a grainy 50% threshold bitmap (visible square pixels and photocopy grain, not smooth vector, not halftone dots). The flame base is grainy mid-tone, not a solid blob; the bright tongues are solid cream; the orange tongues are sparse grain; the eye whites are solid cream with black (fabric-coloured) pupils in the centre; the seed is the burgundy fabric showing through. Keep the brows readable.
- The top-right flame tongue breaks out through the panel border (the same move the logo makes when the flame breaks the disc), with 3 short motion ticks at the break.
- Optional: a faint partial disc arc behind the mascot inside the panel.
- A small comic caption box in the panel's top-left corner reading "DAY 7".
- Under the panel: the wordmark "PassionSeed" in a stepped, low-res PIXEL SERIF (like a classic serif rasterised at 20 px with no anti-aliasing), about 25cm wide, one line.
- A hand-scratched tally of 7 marks outside the panel at the bottom right.

### Back B: illustrated comic scene
- Same panel format, same one-colour cream ink, same wordmark under it, but inside the panel an ORIGINAL black-ink comic illustration (as if drawn by a hired comics illustrator): the seed character (real logo geometry: black seed, googly eyes, flame on its head) hunched at a desk late at night on Day 7 of a sprint, laptop glow, a desk lamp, sticky notes, a cup, a window with a city at night, and the flame flaring up and breaking out of the panel's top-right border. Confident ink linework, threshold/bitmap grain for shading, comic motion lines. It must feel like real illustration art, not clip art.
- Caption box "DAY 7" top-left. Tally of 7 marks bottom right.

## Images to make (PNG)
1. `<you>-A-back.png`: Back A, the shirt hung on a wooden hanger against a plain plaster wall, natural window light, back facing camera. Real fabric, real drape.
2. `<you>-B-back.png`: Back B, same setup.
3. `<you>-front.png`: the front (quiet: pocket stitching, buttons, hem patch), same setup.
4. `<you>-A-print-detail.png`: macro close-up of the Back A print on the slub fabric (show the grainy bitmap pixels, the flame breaking the panel, part of the wordmark).
5. `<you>-B-print-detail.png`: macro close-up of the Back B print.
6. `<you>-pocket-detail.png`: macro of the pocket: off-white sashiko running stitch, the 7 yellow stitches, a coconut button.
7. `<you>-worn.png`: a Thai person in their 20s wearing the shirt (Back A or B, your pick), seen from behind, on a Bangkok street at dusk; editorial lookbook photo, not stock.

## Text rules
- If any text appears it must be spelled exactly "PassionSeed" (one word, capital P and S), "DAY 7", or "No. __ / 10". Nothing else. No gibberish text, no extra captions, no "FRONT/BACK" labels.
- If your generator garbles text, regenerate until it's right; say which images still have wrong text.
