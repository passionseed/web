# Radar guide art

The game-story guides (see [`docs/features/radar-guides-in-code.md`](../features/radar-guides-in-code.md)
and `lib/radar-guide/story.ts`) use a small set of pixel images. This page says
what each one is, where it came from, and how to make it again.

## Files

All art lives in `public/radar/guides/` and is served as a static file.

| Asset | Path | Size (px) | Made by |
|---|---|---|---|
| Level scene, one per page | `<slug>/<pageKey>.webp` | 640 x 400 generated, 160 x 100 hand-made | Antigravity, or the pixel painter |
| Level map background | `<slug>/map.webp` | 432 x 768 generated, 108 x 192 hand-made | Antigravity |
| Profile card frame | `<slug>/frame.webp` | 108 x 135 | Pixel painter only |
| Host sprite, idle / talk / cheer | `host/host-{idle,talk,cheer}.webp` | 48 x 64 | Pixel painter only |

Rules every file keeps:

- webp, at most 120 KB (checked by `scripts/radar-guide/__tests__/art.test.ts`).
- Scenes are places and objects only: no people, no faces, no text or numbers,
  no real company logos, no currency symbols.
- Nothing from skills/key-art-poster/SKILL.md section 6: no sunburst rays,
  perspective floor grids, random glowing particles, scanlines or grain.
- Night palette from `company-brain/reels-style.md`: plum black, deep plum,
  violet glow, cream, sunset orange, warm window lights, and the career accent
  (`#5cff5c` for cybersecurity) only on screens.
- Decorative only. The level title and dialogue carry the meaning, so every
  `<img>` has `alt=""`. If a file fails to load, `PixelScene` and `LevelMap`
  draw a CSS pixel night instead, and `GuideNPC` draws the sprite grid as SVG.

## The host is hand-made on purpose

The host NPC (`GUIDE_HOST` in `lib/radar-guide/story.ts`) is a generic pixel
character, not a likeness of the founder. Its frames are drawn from the grids in
`components/radar/guide/story/pixel-art.ts`, so the idle and talk frames line up
pixel for pixel and the mouth flap does not jitter. Separate image generations
cannot promise that, and they cannot give a transparent background, so the
script never sends the host or the card frame to Antigravity. The profile card
avatar uses the same grid recoloured with the career accent.

## Making the art again

Prompts and sizes: `scripts/radar-guide/art-prompts/<slug>.json`. Each asset
records the `source` that made the committed file.

```bash
# Redraw what is committed, each asset from its recorded source
pnpm exec tsx scripts/radar-guide/art.ts cybersecurity

# Print the plan and the exact agy prompts, write nothing
pnpm exec tsx scripts/radar-guide/art.ts cybersecurity --source agy --dry-run

# Regenerate two scenes with Antigravity
pnpm exec tsx scripts/radar-guide/art.ts cybersecurity --source agy --only doors,fit

# Hand-made fallback for one scene (deterministic, byte-identical on re-run)
pnpm exec tsx scripts/radar-guide/art.ts cybersecurity --source pixel --only triage
```

With `--source agy` the script runs `agy -p '<prompt>' --print-timeout 300s`
from a temporary folder, once per asset. It never passes a flag that skips
agy's permission prompts. The prompt is the file's `style`, a framing line for
the asset kind, the asset's own `prompt`, then the fixed `suffix` (no people, no
text, no logos, the banned patterns). The image agy saves is centre-cropped to
the native aspect, scaled to 4x the native size, and saved as the best webp
quality under 120 KB. After a run, look at every image, then set its `source`
in the prompts file; the test checks that each file's size matches its source.

When agy cannot make an image (it sometimes stops on a permission it cannot ask
for in headless mode), run that asset with `--source pixel`. The pixel painter
(`scripts/radar-guide/art-pixel.ts`) has a scene for every cybersecurity page.

## Current cybersecurity set (November 2026)

| Page | Scene | Source |
|---|---|---|
| mythos | bedroom desk at night, a bug crawling out of a glowing monitor | agy |
| doors | two doors in a wall, one padlocked, one ajar with violet light, tokens rolling toward them | agy |
| triage | security room, a wall of small monitors with tags, one turning red | pixel (agy returned no image, twice) |
| scam | a generic phone in front of the city, chat bubbles, two red flags | agy |
| firstjob | a ladder against a tower, its bottom rungs dissolving, new green rungs higher up | agy |
| money | coin stacks like a bar chart, a down-arrow marker, one tall stack apart | pixel (agy returned no image, twice) |
| fit | a crossroads with blank signposts, one glowing green | agy |
| tcas | a cream university gate on a hill, paths climbing to it, blank flip tiles | agy |
| terminal | a retro terminal on a desk, a small green shield | agy |
| tonight | a laptop and desk lamp at night, a small orange flag | agy |
| next | a rooftop before sunrise, a lit tile path, a green flag | agy |
| map | five dark islands in a night sea, lit windows, no path or labels | agy |

## Licence and provenance

- **Generated images** were made with Google Antigravity's image tool (a Gemini
  image model) from the prompts in the prompts file. Google's generative AI
  terms at the time of writing do not claim ownership of generated output, and
  the images may carry Google's invisible SynthID watermark. They contain no
  real people, logos or text. Before using them outside passionseed.org (print,
  paid ads, merchandise), check the current terms.
- **Hand-made pixel art** (host sprite, card frame, the painter fallbacks, badge
  glyphs) is drawn in code in this repository and is PassionSeed's own work.
- This is a public repository: the image files are published with the code.
