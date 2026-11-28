# Elemental element carousels, 2026-11-28

Drafts only. Nothing here was posted.

Two Instagram carousels for the Elemental Hackathon, three slides each at 1080x1350, built like the
Air and Fire posts: a picture of the problem, why Thailand still has it, then the prize and the days left.

## Water

- instagram · ig-portrait · student · 3 slides
- Files: [elemental-water/](elemental-water/) ([contact sheet](elemental-water/contact.jpg), [caption](elemental-water/caption.txt))
- Slide 1: NASA's satellite picture of the 2011 flood, turned 90 degrees and used full-bleed. **Chosen by Angpao, 2026-11-28.**
- Slide 2: the arsenic in the Sai River, November 2569. The photo is a stand-in: the Sai River at Mae Sai in 2013. No free photo of the event was found. **Not confirmed as final.**
- Slide 3: the prize and the countdown, on the Water artwork.

## Earth

- instagram · ig-portrait · student · 3 slides
- Files: [elemental-earth/](elemental-earth/) ([contact sheet](elemental-earth/contact.jpg), [caption](elemental-earth/caption.txt))
- **All three images chosen by Angpao, 2026-11-28.**
- Slide 1: an 1883 medical watercolour of a lead worker's gums.
- Slide 2: a 14th-century fresco of Sodom and Gomorrah, the name people in Accra give their e-waste site. The file is small (731x754) and is enlarged about 1.8 times.
- Slide 3: the prize and the countdown, on the Earth artwork.

## Before posting

- **The countdown.** Slide 3 and each caption say 7 days, counted from 28 Nov to 5 Dec. Re-render on the posting day:
  `DAYS_LEFT=6 node output/marketing/2026-11-28/render-elemental-carousel.mjs elemental-water`, and change "อีก 7 วันเริ่ม" in the caption.
- **The captions are Claude's drafts**, in the format of the Air post. Nobody has approved them.
- **The Earth caption opens with a warning line**, as the Air post did, because of the picture on slide 1.

## How these were made

`render-elemental-carousel.mjs` reads each folder's `carousel.json` (text, photo, credit, and where each
fact was checked) and the photos in `sources/`. It needs Playwright, which this repo doesn't depend on;
see the top of the script. Facts and their limits: [claim-ledger.md](claim-ledger.md).
