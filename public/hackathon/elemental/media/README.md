# Elemental Hackathon media

Video and stills for the Elemental Hackathon page, sized for the web (720 px wide video, H.264 with fast start, about 40 MB in all; the page doesn't need every version). Every video has a `.webp` still for the `poster` attribute: the frame it opens on, or for the teasers a frame of the poster at the end (for the flashback cuts, the first memory).

The poster images and the teasers' last seconds show the dates, prize and prices as they were on 2026-11-20 (5–7 ธ.ค., ออนไลน์, รางวัลรวม 20,000 บาท, มากับเพื่อน ฿149). If any of those change, these have to be made again.

## Teasers (with sound)

| File | Shape | Length | What it is |
|---|---|---|---|
| `teaser.mp4` | 4:5 | 37.5 s | The full teaser: the five calm places filmed, then each one corrupted in faster and faster cuts, then the poster building in depth |
| `teaser-reels.mp4` | 9:16 | 36.5 s | The same, framed for phones, with the poster's type set for 9:16 |
| `teaser-short.mp4` | 4:5 | 7.9 s | Straight in: each place wrecked in a time-lapse, then the poster |
| `teaser-short-reels.mp4` | 9:16 | 7.9 s | The same, framed for phones |
| `teaser-flashback.mp4` | 4:5 | 7.8 s | Each place as a memory, then a hard cut to it wrecked, then the poster |
| `teaser-flashback-reels.mp4` | 9:16 | 7.8 s | The same, framed for phones |
| `teaser-rewind.mp4` | 4:5 | 33.1 s | Told backwards: the five places wrecked, then time rewinding them (tape-rewind look, their sound backwards) until they're clean and alive, then the poster, clean, catching fire |
| `teaser-rewind-reels.mp4` | 9:16 | 32.1 s | The same, framed for phones |

The 9:16 (`-reels`) versions are made for Instagram Reels: they start straight in, with no black opening, and have words burned in, the poster's line "สิ่งแวดล้อมไม่ควรถูกทิ้งเพราะเงิน" for the first 2 seconds, then "งานแข่ง" with the trophy as the places start to change.

Start them muted with a sound button, or play on click: browsers only autoplay muted video.

## The key visual

| File | What it is |
|---|---|
| `key-visual.webp` | The poster, 1080x1350 |
| `key-visual-9x16.webp` | The poster for phones, 1080x1920 |
| `key-visual-loop.mp4` | The poster moving (fire, smoke, water, grain), a seamless 3-second loop, 1080x1350, no sound |
| `key-visual-scene-loop.mp4` | The same loop without any type, for a hero with real HTML text on top |

## The five places (`elements/`, with sound)

Each video is 11 seconds, 4:5: the place clean, then the element corrupting it bit by bit, then a hold on the end state. `<element>-before.webp` is the clean place (the frame the video opens on), `<element>-after.webp` the end state.

| Element | The place | What happens |
|---|---|---|
| `earth` | Rice terraces in mist | An e-waste heap grows and the terraces die around it |
| `water` | A river valley | Pipes pour into the river until it runs toxic green; drums leak on the bank |
| `aether` | A rice field under a pylon | A data center goes up, plugs into the line, and the field dries out |
| `air` | A wide green valley | Factories go up and their smoke fills the valley |
| `fire` | A mountain meadow | A fire starts in the grass and spreads over burnt ground |

For a looping section, use `autoPlay muted loop playsInline` and the `-before.webp` as the poster.

`frames/<element>/01.webp` to `36.webp` are 36 stills from each element video, for the landing's scroll-scrubbed chapters (`components/hackathon/elemental/media.ts`).

## Credits

Photos (the files are in `public/hackathon/poster/elemental/bg/`):

- River valley (the key visual and water): Joana Abreu on Unsplash, Unsplash licence
- Rice terraces (earth): rawpixel, image 3288128, CC0
- Rice field with pylons (aether): rawpixel, image 3340500, CC0
- Lamar Valley (air): NPS / Jacob W. Frank, public domain, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Overlooking_Lamar_Valley_from_Specimen_Ridge_looking_east_(50016473106).jpg)
- Meadow (fire): Coconino National Forest, CC0, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Bismarck_Lake_Trail_(20986439564).jpg)

Sounds: the CC0 recordings listed in `scripts/elemental-audio/README.md` (rain, river, rice-field animals, wind, fire, factory). Every other sound is made in code.

## How they were made

- Teasers: `scripts/render-elemental-teaser.py` (`--cut short`, `--cut flashback`, `--aspect 9:16`).
- Element videos: the 2026-11-20 renders of the `scripts/render-elemental-<element>.mjs` scripts, with sound from `scripts/render-elemental-<element>-sound.py`. The scripts in the repo have since been changed to a pixel style that wasn't used.
- Poster layers: `scripts/render-elemental-gif.mjs --story --layers`. The type in these files comes from the poster layout with the line at the bottom and the facts on one row (and a 9:16 version of it), which isn't the layout in `components/hackathon/poster/elemental/ElementalKeyPoster.tsx` yet.
