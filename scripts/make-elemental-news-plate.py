"""The announcement poster's plate: the valley photo, with the cliff top
breaking into pixels as it rises (the Elemental device) and a pink pixel flag
planted on it. Usage: python3 make_plate.py <photo.jpg> <out.png>"""
import random, sys, math
from PIL import Image, ImageDraw

src, out = sys.argv[1], sys.argv[2]
W, H = 1080, 1350
rng = random.Random(12)

im = Image.open(src).convert("RGB")
s = H / im.height
im = im.resize((round(im.width * s), H), Image.LANCZOS)
off = round((im.width - W) * 0.72)
im = im.crop((off, 0, off + W, H))
base = im.copy()
d = ImageDraw.Draw(im)

PINK, PINK_L, PINK_D = (222, 92, 142), (242, 150, 184), (176, 58, 104)
YELLOW, CREAM, INK = (255, 208, 103), (243, 239, 230), (29, 33, 31)

def avg(box):
    x0, y0, x1, y1 = [max(0, v) for v in box]
    x1, y1 = min(W, x1), min(H, y1)
    c = base.crop((x0, y0, x1, y1)).resize((1, 1), Image.BOX)
    return c.getpixel((0, 0))

# Where the flag stands: on the ridge's shoulder, right of centre, like the fire on slide 1.
FX, FY = 716, 742
C = 14
pole_top = FY - 226
FLAG = (FX + 8, pole_top + 6, FX + 8 + 13 * C, pole_top + 6 + 9 * C)   # the flag's box, kept clear

def in_flag(x, y, size, pad=14):
    return x + size > FLAG[0] - pad and x < FLAG[2] + pad and y + size > FLAG[1] - pad and y < FLAG[3] + pad

# 1. The ridge around the flag's foot turns to mosaic: big blocks near it, finer further out.
G = 12
for gy in range(640, 900, G):
    for gx in range(520, 960, G):
        dist = math.hypot(gx - FX - 30, (gy - FY - 20) * 1.3)
        p = max(0.0, 1 - dist / 210)
        r, g, b = avg((gx, gy, gx + G, gy + G))
        cloud = min(r, g, b) > 140 and max(r, g, b) - min(r, g, b) < 30
        if cloud or rng.random() > p * 1.2:
            continue
        size = G * rng.choice([1, 2, 2, 3] if dist < 110 else [1, 1, 2])
        bx, by = gx - gx % size, gy - gy % size
        d.rectangle((bx, by, bx + size - 1, by + size - 1), fill=avg((bx, by, bx + size, by + size)))

# 2. Pixels rise from the ridge into the sky in a plume to the right of the flag, thinning out.
rock = [avg((x, y, x + 24, y + 24)) for x in range(600, 900, 40) for y in range(760, 900, 35)]
for _ in range(360):
    t = rng.random() ** 1.5                 # 0 at the ridge, 1 at the top of the plume
    cx = FX + 150 + t * 170
    cy = FY - 40 - t * 300
    x = cx + rng.gauss(0, 34 + t * 70)
    y = cy + rng.gauss(0, 26 + t * 30)
    size = rng.choice([8, 8, 12, 16] if t > 0.5 else [12, 16, 24, 24, 36])
    x, y = int(x) - int(x) % 4, int(y) - int(y) % 4
    if not (560 < x < W - 12) or y < 410 or in_flag(x, y, size):
        continue
    k = rng.random()
    if k < 0.13: col = PINK
    elif k < 0.20: col = PINK_L
    elif k < 0.28: col = YELLOW
    elif k < 0.37: col = CREAM
    else: col = rng.choice(rock)
    d.rectangle((x, y, x + size - 1, y + size - 1), fill=col)

# 3. The flag: a dark pole with a yellow cap, and a pink pixel flag that waves in steps and breaks into pixels at its tip.
d.rectangle((FX, pole_top, FX + 7, FY + 16), fill=INK)
d.rectangle((FX - 5, pole_top - 10, FX + 12, pole_top - 1), fill=YELLOW)
rows = [
    "#########....",
    "###########..",
    "############.",
    "#############",
    "#############",
    ".############",
    "..###########",
    "....#########",
]
for ry, row in enumerate(rows):
    for rx, ch in enumerate(row):
        if ch != "#":
            continue
        if rx >= 10 and rng.random() < (rx - 9) * 0.16:
            continue                          # the tip is already coming apart
        x0 = FX + 8 + rx * C
        y0 = pole_top + 6 + ry * C + (C // 2 if 4 <= rx < 9 else 0) + (C if rx >= 9 else 0)
        col = PINK_L if ry == 1 and rx < 10 else PINK_D if ry >= 6 else PINK
        d.rectangle((x0, y0, x0 + C - 1, y0 + C - 1), fill=col)
# loose flag pixels drifting off the tip
for _ in range(16):
    x0 = FLAG[2] + rng.randint(0, 110)
    y0 = pole_top + rng.randint(0, 9 * C) - int((x0 - FLAG[2]) * 0.35)
    sz = rng.choice([8, 10, 14])
    d.rectangle((x0, y0, x0 + sz - 1, y0 + sz - 1), fill=rng.choice([PINK, PINK, PINK_L]))

im.save(out)
print("saved", out)
