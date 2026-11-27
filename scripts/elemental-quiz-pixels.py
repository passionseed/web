#!/usr/bin/env python3
"""
Check and preview the Elemental quiz's pixel art (lib/hackathon/elemental/quiz-pixel-art.ts).

    python3 scripts/elemental-quiz-pixels.py check  lib/hackathon/elemental/quiz-pixel-art.ts
    python3 scripts/elemental-quiz-pixels.py render lib/hackathon/elemental/quiz-pixel-art.ts /tmp/quiz-art

It also reads an artist's effects.json ({"effects": {"<element>": {"frameMs", "frames", "notes"}}}).

The icon is the brand's flat 9x9 icon, unchanged. An effect is 8 frames drawn
on a 15x15 stage with the icon's 9x9 box at columns 3..11, rows 3..11 (a
3-cell margin all round). Every stage cell is one icon pixel.

In a frame:
  "."  nothing drawn here by the effect (the icon still shows if this is an icon cell)
  a palette char on an EMPTY cell   an effect pixel
  a palette char on an ICON cell    recolours that icon pixel for this frame
  "-"  on an ICON cell              hides that icon pixel for this frame
Frame 0 is the key frame: the still on the share cards and for people who turn
motion off, so it must not recolour or hide any icon pixel.

`render` writes each effect's 8 frames at 16x, its loop as GIFs at 12x and 5x,
the five key frames side by side, and the crests tiled. Look at the renders,
not the grid text. Needs Pillow.
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ELEMENTS = ["fire", "earth", "water", "air", "aether"]

PALETTE = {
    "e": "#b8301a",  # ember
    "f": "#ec6424",  # flame  (the fire icon's colour)
    "l": "#f99a3a",  # flameLight
    "c": "#ffd57a",  # flameCore
    "w": "#fff4dc",  # flameWhite
    "T": "#1f6f6b",  # deep teal
    "C": "#38c9c2",  # toxicCyan  (the water icon's colour)
    "G": "#9cc23a",  # toxicGreen
    "b": "#5b3a22",  # burnt
    "r": "#c35a22",  # toxicRust  (the earth icon's colour)
    "y": "#c9b452",  # toxicYellow  (the air icon's colour; earth seep)
    "s": "#6b6761",  # smoke
    "a": "#c9c4bb",  # ash
    "g": "#7f8b94",  # aetherGrey
    "v": "#9d7bff",  # aetherViolet  (the aether icon's colour)
    "L": "#e4d8ff",  # aetherLilac
    "k": "#f3efe6",  # cream, the one shared highlight
}

ALLOWED = {
    "fire": set("eflcwk"),
    "water": set("TCGk"),
    "earth": set("bryek"),
    "air": set("sayk"),
    "aether": set("gvL"),
}

ICON = {
    "earth": [".........", ".........", "....#....", "...###...", "..##.##..", ".#######.", "##.###.##", "#########", "#########"],
    "water": ["...#.....", "...#.....", "..###....", ".#####...", "#######..", "##.####..", "#.#####..", ".#####...", "..###...."],
    "air": [".........", "..####...", ".#....#..", "......#..", "######...", ".........", "#######..", ".......#.", "..####..."],
    "fire": ["....#....", "...##....", "...###.#.", "..####.#.", ".#######.", ".###.###.", "###...###", "###...###", ".#######."],
    "aether": ["#.....#..", "...#.....", ".......##", "..#......", "#....#...", ".........", "...#...#.", ".#.......", "......#.."],
}
ICON_CHAR = {"fire": "f", "water": "C", "earth": "r", "air": "y", "aether": "v"}

# Each result's card ground (lib/hackathon/elemental/quiz.ts QUIZ_PALETTE.bg).
BG = {"fire": "#1e1c1a", "water": "#1b1d1f", "earth": "#241912", "air": "#2a2826", "aether": "#1d211f"}

STAGE = 15
OFF = 3  # the icon's box starts at stage (3, 3)
FRAMES = 8


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def icon_cells(el):
    return {(x + OFF, y + OFF) for y, row in enumerate(ICON[el]) for x, ch in enumerate(row) if ch == "#"}


def aether_icon_style(el):
    """The brand's Aether treatment (element-icons.tsx AetherPixels): lilac every third cell, uneven strengths."""
    out = {}
    cells = [(x + OFF, y + OFF) for y, row in enumerate(ICON[el]) for x, ch in enumerate(row) if ch == "#"]
    for i, c in enumerate(cells):
        out[c] = ("L" if i % 3 == 0 else "v", [1, 0.55, 0.8, 0.4][i % 4])
    return out


def compose(el, frame):
    """What a frame shows: {(x, y): (char, alpha)} on the stage, icon included."""
    icon = icon_cells(el)
    style = aether_icon_style(el) if el == "aether" else {c: (ICON_CHAR[el], 1.0) for c in icon}
    out = dict(style)
    for y, row in enumerate(frame):
        for x, ch in enumerate(row):
            if ch == ".":
                continue
            if ch == "-":
                out.pop((x, y), None)
            else:
                out[(x, y)] = (ch, 1.0)
    return out


def load(path):
    """An artist's effects.json, or the shipped TypeScript art file."""
    text = Path(path).read_text()
    if not path.endswith(".ts"):
        return json.loads(text)
    import re

    data = {"effects": {}, "crests": {}}
    crests = text[text.index("export const QUIZ_CRESTS") :]
    crests = crests[: crests.index("\n};")]
    for el, rows in re.findall(r"\b(fire|earth|water|air|aether): \[(.*?)\]", crests, re.S):
        data["crests"][el] = {"rows": re.findall(r'"([^"]*)"', rows)}
    fx = text[text.index("export const ICON_EFFECTS") :]
    for el, ms, frames in re.findall(r"\b(fire|earth|water|air|aether): \{\s*frameMs: (\d+),\s*frames: \[(.*?)\n    \],", fx, re.S):
        data["effects"][el] = {"frameMs": int(ms), "frames": [re.findall(r'"([^"]*)"', f) for f in re.findall(r"\[(.*?)\]", frames, re.S)]}
    return data


CREST = (30, 8)


def crest_errors(el, rows):
    errs, info = [], []
    allowed = ALLOWED[el] | set("k")
    if len(rows) != CREST[1] or any(len(r) != CREST[0] for r in rows):
        return [f"crest.{el}: must be {CREST[1]} rows of {CREST[0]}"], info
    for y, row in enumerate(rows):
        bad = sorted({ch for ch in row if ch != "." and ch not in allowed})
        if bad:
            errs.append(f"crest.{el}: row {y} uses {''.join(bad)}")
    dens = [sum(ch != "." for ch in row) / CREST[0] for row in rows]
    info.append("row density " + " ".join(f"{d:.0%}" for d in dens))
    if dens[0] < 0.7:
        errs.append(f"crest.{el}: row 0 under 70% filled; it should hang from a dense top edge")
    if dens[-1] > 0.1:
        errs.append(f"crest.{el}: row 7 over 10% filled; it should be almost gone by the last row")
    if "k" in rows[0]:
        info.append("cream on row 0 reads as white teeth along the top edge  <-- CHECK")
    return errs, info


def check_effect(el, fx):
    errs, info = [], []
    frames = fx.get("frames", [])
    ms = fx.get("frameMs")
    if len(frames) != FRAMES:
        errs.append(f"{el}: {len(frames)} frames, need {FRAMES}")
    if not isinstance(ms, int) or not 90 <= ms <= 260:
        errs.append(f"{el}: frameMs {ms!r}, need a whole number 90..260")
    icon = icon_cells(el)
    allowed = ALLOWED[el]
    for i, f in enumerate(frames):
        if len(f) != STAGE:
            errs.append(f"{el} frame {i}: {len(f)} rows, need {STAGE}")
        for y, row in enumerate(f):
            if len(row) != STAGE:
                errs.append(f"{el} frame {i} row {y}: {len(row)} chars, need {STAGE}")
            for x, ch in enumerate(row):
                if ch == ".":
                    continue
                on_icon = (x, y) in icon
                if ch == "-" and not on_icon:
                    errs.append(f"{el} frame {i} ({x},{y}): '-' is only for hiding an icon pixel")
                elif ch != "-" and ch not in allowed:
                    errs.append(f"{el} frame {i} ({x},{y}): '{ch}' not in this element's colours .{''.join(sorted(allowed))}")
                if i == 0 and on_icon:
                    errs.append(f"{el} key frame ({x},{y}): frame 0 must leave the icon exactly as it is")
    if errs:
        return errs, info
    icon_ch = ICON_CHAR[el]
    counts, changes = [], []
    for i, f in enumerate(frames):
        fxpx = [(x, y, ch) for y, row in enumerate(f) for x, ch in enumerate(row) if ch != "." and (x, y) not in icon]
        over = [(x, y, ch) for y, row in enumerate(f) for x, ch in enumerate(row) if ch != "." and (x, y) in icon]
        counts.append(len(fxpx))
        if len(over) > 3:
            info.append(f"frame {i}: {len(over)} icon pixels recoloured or hidden (keep it to 3 or fewer)  <-- CHECK")
        if i == 0:
            xs = [x for x, _, _ in fxpx] or [OFF]
            ys = [y for _, y, _ in fxpx] or [OFF]
            info.append(f"key frame effect pixels {len(fxpx)}, reach cols {min(xs)}-{max(xs)}, rows {min(ys)}-{max(ys)}")
            if xs and (min(xs) < 1 or max(xs) > 13):
                info.append("key frame reaches the outer column  <-- keep the still within cols 1..13")
            # same-colour effect pixels touching the icon merge into its silhouette
            merge = [(x, y) for x, y, ch in fxpx if ch == icon_ch and any((x + dx, y + dy) in icon for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
            if merge:
                info.append(f"key frame: {len(merge)} effect px in the icon's own colour touch it, so they read as part of the icon: {merge}  <-- CHECK")
    for i in range(FRAMES):
        a, b = compose(el, frames[i]), compose(el, frames[(i + 1) % FRAMES])
        changes.append(sum(1 for k in set(a) | set(b) if a.get(k) != b.get(k)))
    info.append("effect px per frame " + " ".join(map(str, counts)))
    info.append("px changed frame to next " + " ".join(map(str, changes)) + "  (last number is the loop seam 7->0)")
    if max(counts) > 18:
        info.append(f"up to {max(counts)} effect px in a frame; effects should stay sparse next to a 9x9 icon  <-- CHECK")
    if changes[-1] > max(changes[:-1]) + 2:
        info.append("the loop seam jumps more than any other step  <-- the loop will hitch")
    return errs, info


def cmd_check(path):
    data = load(path)
    hard = []
    for el in ELEMENTS:
        crest = data.get("crests", {}).get(el)
        if not crest:
            continue
        errs, info = crest_errors(el, crest["rows"])
        hard += errs
        print(f"\n[crest {el}]")
        for e in errs:
            print("  ERROR", e)
        for i in info:
            print("  -", i)
    for el in ELEMENTS:
        fx = data.get("effects", {}).get(el)
        print(f"\n[{el}]")
        if not fx:
            hard.append(f"{el}: missing")
            print("  MISSING")
            continue
        errs, info = check_effect(el, fx)
        hard += errs
        for e in errs:
            print("  ERROR", e)
        for i in info:
            print("  -", i)
    print("\n" + ("OK: no hard errors" if not hard else f"{len(hard)} hard error(s)"))
    return 0 if not hard else 1


def paint(img, el, frame, ox, oy, s, grid=False):
    bg = hexrgb(BG[el])
    d = ImageDraw.Draw(img)
    for (x, y), (ch, a) in compose(el, frame).items():
        rgb = hexrgb(PALETTE[ch])
        col = tuple(round(bg[k] + (rgb[k] - bg[k]) * a) for k in range(3))
        d.rectangle([ox + x * s, oy + y * s, ox + (x + 1) * s - 1, oy + (y + 1) * s - 1], fill=col)
    if grid:
        over = Image.new("RGBA", img.size, (0, 0, 0, 0))
        g = ImageDraw.Draw(over)
        for i in range(STAGE + 1):
            g.line([ox + i * s, oy, ox + i * s, oy + STAGE * s], fill=(255, 255, 255, 22))
            g.line([ox, oy + i * s, ox + STAGE * s, oy + i * s], fill=(255, 255, 255, 22))
        b0, b1 = OFF * s, (OFF + 9) * s
        g.rectangle([ox + b0, oy + b0, ox + b1, oy + b1], outline=(255, 255, 255, 60))
        img.alpha_composite(over)


def cmd_render(path, out):
    data = load(path)
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    fxs = data.get("effects", {})
    for el in ELEMENTS:
        fx = fxs.get(el)
        if not fx or check_effect(el, fx)[0]:
            continue
        frames = fx["frames"]
        # 1. All 8 frames at 16x with a grid and the icon's box outlined.
        S = 16
        pad = 16
        img = Image.new("RGBA", (FRAMES * (STAGE * S + pad) + pad, STAGE * S + pad * 2), hexrgb(BG[el]) + (255,))
        for i, f in enumerate(frames):
            paint(img, el, f, pad + i * (STAGE * S + pad), pad, S, grid=True)
        img.save(out / f"{el}-frames-16x.png")
        # 2. The loop as GIFs: 12 px a pixel (Story card size) and 5 px (quiz intro size).
        for s, tag in ((12, "12x"), (5, "5x")):
            gif = []
            for f in frames:
                fr = Image.new("RGBA", (STAGE * s + 2 * s, STAGE * s + 2 * s), hexrgb(BG[el]) + (255,))
                paint(fr, el, f, s, s, s)
                gif.append(fr.convert("RGB"))
            gif[0].save(out / f"{el}-loop-{tag}.gif", save_all=True, append_images=gif[1:], duration=fx["frameMs"], loop=0, disposal=1)
    # 3. The five key frames side by side at 10x: what the share cards show.
    S = 10
    cw = STAGE * S + 20
    sheet = Image.new("RGBA", (cw * 5, STAGE * S + 20), (40, 40, 40, 255))
    for i, el in enumerate(ELEMENTS):
        ImageDraw.Draw(sheet).rectangle([i * cw, 0, (i + 1) * cw - 1, sheet.height], fill=hexrgb(BG[el]))
        fx = fxs.get(el)
        if fx and not check_effect(el, fx)[0]:
            paint(sheet, el, fx["frames"][0], i * cw + 10, 10, S)
    sheet.save(out / "key-frames.png")
    # 4. Crests: each tiled three times at 12 px, as it hangs from the top of a card.
    crests = data.get("crests", {})
    if crests:
        S = 12
        tw = CREST[0] * S * 3
        sheet = Image.new("RGBA", (tw, (CREST[1] * S + 60) * 5), (40, 40, 40, 255))
        d = ImageDraw.Draw(sheet)
        for i, el in enumerate(ELEMENTS):
            oy = i * (CREST[1] * S + 60)
            d.rectangle([0, oy, tw, oy + CREST[1] * S + 59], fill=hexrgb(BG[el]))
            for t in range(3):
                for y, row in enumerate(crests.get(el, {}).get("rows", [])):
                    for x, ch in enumerate(row):
                        if ch != ".":
                            px = t * CREST[0] * S + x * S
                            d.rectangle([px, oy + y * S, px + S - 1, oy + (y + 1) * S - 1], fill=hexrgb(PALETTE[ch]))
        sheet.save(out / "crests.png")
    print(f"rendered to {out}")


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "check":
        sys.exit(cmd_check(sys.argv[2]))
    if len(sys.argv) >= 4 and sys.argv[1] == "render":
        cmd_render(sys.argv[2], sys.argv[3])
        sys.exit(0)
    print(__doc__)
    sys.exit(2)
