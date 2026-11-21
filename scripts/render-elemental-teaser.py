#!/usr/bin/env python3
"""
Elemental teaser: the five element videos cut together like a movie
teaser, ending on the key poster.

    python3 scripts/render-elemental-teaser.py --elements <dir> --poster <dir> --out <teaser.mp4> [--cut short|flashback|rewind] [--hook <dir>] [--part calm|finale]

  --elements  a folder with earth/, water/, aether/, air/ and fire/, each
              holding elemental-<element>*.mp4 (with sound)
  --poster    the key poster's story as separate layers, from
              scripts/render-elemental-gif.mjs --story --layers --fps 24
              --frames 72 --hold 4.8: scene-NNN.png (the place, every element
              and the fire letters) and type-NNN.png (the type on transparent)
              for each frame, clean, then corrupting, then the full poster
  --cut short or --cut flashback makes an under-8-second cut instead, and
              --cut rewind the slow cut told backwards (see the end of this note)
  --aspect 9:16 makes the Reels version (1080x1920); it needs --poster-type,
              type-NNN.png frames from the poster's 9:16 layout
  --hook      (with --aspect 9:16) for Reels: drops the black opening and
              burns in the poster's line for the first 2 seconds, then
              "งานแข่ง" with the trophy as the places start to change, from
              hook-line.png and hook-contest.png in <dir> (1080x1920 on
              transparent, set in the poster's own type). If <dir> also has
              hook-line2.png, the line comes in two beats (the second line a
              beat after the first, on a cut or dissolve) and stays a little
              longer
  --part calm renders only the opening and the first corruption pass, and
              --part finale only the poster, for checking the camera work quickly

About 37 seconds, 1080x1350 (Instagram 4:5), with sound:
1. Cold open: black, a low hum.
2. Normal: the five calm places, about 1.6 s each, filmed rather than shown:
   each shot has its own camera move with depth (near ground moves more than
   the far hills), and the place is alive: clouds drift, cloud shadows cross
   the land, grass moves in the wind, the river ripples, rain and mist move
   over the terraces. Shots dissolve through a sweep of warm light with a
   soft whoosh.
3. Corruption: a hit, then cuts between the elements as each one corrupts
   its place, in passes that get shorter and later in each element's story,
   with a deep bass thump and a punch-in on every cut, a camera shake that
   grows, glitch cuts and a rising tone, until it's flashes of the end states.
4. Black and silence.
5. Finale: the key poster corrupting with every element at once, filmed in
   depth: the type on its own plane, the place behind it split into sky,
   hills, the fire and the near river, all sliding at their own speed as the
   camera pulls back and lands on the poster; the glyphs of "Elemental"
   glitching in one by one; a hold on the moving poster, then fade out.
Every word on screen comes from the poster itself.

The short cut (--cut short), just under 8 seconds, goes straight to it: each
place corrupts in a three-quarter-second time-lapse, cut on a bass thump with a
punch-in, shorter and harder each time under a rising tone; a beat of black;
then the poster builds in a second and a quarter while the camera pulls back
through its layers, lands on the hit and holds so it can be read.

The flashback cut (--cut flashback), also just under 8 seconds: each place
as it was, in a white flash of memory, warm, soft and overexposed, still
alive, its calm sound muffled; then a hard cut on a thump to how it is now,
wrecked; then the next memory. After the last place it cuts to black and the
poster, built fast and held, as in the short cut.

The rewind cut (--cut rewind), about 34 seconds, starts with the problem and
turns time back: the five places wrecked, filmed slowly under a low drone;
then time runs backwards, each place un-corrupting in faster and faster cuts
that look and sound like a tape rewinding (the places' own sound played
backwards), under a rising tone; a tape stop and a white flash into the five
places clean and alive, under the warm pad; then the poster, clean, catches
fire as the camera pulls back through it, and holds on it burning.

Sounds: the element videos' own sound under their shots; the finale's calm
river is "Small River 1" by Pfannkuchn and its fire is "Bonfire HQ" by
tosha73 (both CC0, scripts/elemental-audio/); everything else is made here.
Needs ffmpeg, numpy and opencv-python.
"""
import math
import os
import subprocess
import sys
import tempfile
import wave

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from elemental_sound import SR, Track, break_up, hum, lowpass, noise_bed, pan  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = sys.argv[1:]


def opt(name, default=None):
    return args[args.index(name) + 1] if name in args else default


ELEMENTS = opt("--elements")
POSTER = opt("--poster")
OUT = opt("--out", "output/marketing/elemental-teaser.mp4")
PART = opt("--part", "all")
CUT = opt("--cut", "full")
# --aspect 9:16 makes the Reels version: the 4:5 footage fills a 1080x1920
# frame (scaled up and framed on the action, calm shots panning across it),
# and the poster's type comes from its own 9:16 layout (--poster-type).
REELS = opt("--aspect", "4:5") == "9:16"
POSTER_TYPE = opt("--poster-type")
HOOK = opt("--hook")
W, H, FPS = 1080, 1350, 24  # the footage and the poster's scene
OW, OH = (1080, 1920) if REELS else (W, H)  # what's written
CLIPS = os.path.join(ROOT, "scripts/elemental-audio")


def element_video(name):
    folder = os.path.join(ELEMENTS, name)
    return os.path.join(folder, sorted(f for f in os.listdir(folder) if f.startswith(f"elemental-{name}") and f.endswith(".mp4"))[0])


# The order the places appear in. Fire comes last: it's the loudest.
ORDER = ["earth", "water", "aether", "air", "fire"]
SRC = {e: element_video(e) for e in ORDER}


# ---------- decoding ----------
def frames(src, t0, n, size=(W, H), fps=FPS):
    """n frames from src starting at t0 seconds, as HxWx3 uint8 arrays.
    fps=None keeps the file's own frame rate."""
    w, h = size
    vf = (f"fps={fps}," if fps else "") + f"scale={w}:{h}"
    cmd = ["ffmpeg", "-v", "error", "-ss", f"{t0:.3f}", "-i", src, "-vf", vf, "-frames:v", str(n), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    data = subprocess.run(cmd, capture_output=True, check=True).stdout
    got = len(data) // (w * h * 3)
    out = [np.frombuffer(data[i * w * h * 3 : (i + 1) * w * h * 3], np.uint8).reshape(h, w, 3) for i in range(got)]
    while len(out) < n:  # past the end: hold the last frame
        out.append(out[-1])
    return out


def audio(src):
    """A file's whole sound track as float stereo at SR."""
    data = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(data, np.float32).reshape(-1, 2).astype(np.float64)


SOUND = {e: audio(SRC[e]) for e in ORDER}

# ---------- helpers ----------
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)


def ease(u):
    u = min(1.0, max(0.0, u))
    return u * u * (3 - 2 * u)


def lerp(a, b, u):
    return a + (b - a) * u


def noise(w, h, cell_x, cell_y, seed, octaves=3):
    """Smooth value noise, 0..1, w x h, with features about cell_x by cell_y px."""
    rng = np.random.default_rng(seed)
    out = np.zeros((h, w), np.float32)
    amp, total = 1.0, 0.0
    for o in range(octaves):
        cx, cy = max(2, cell_x / 2**o), max(2, cell_y / 2**o)
        gw, gh = int(w / cx) + 3, int(h / cy) + 3
        grid = rng.random((gh, gw)).astype(np.float32)
        big = cv2.resize(grid, (int(gw * cx), int(gh * cy)), interpolation=cv2.INTER_CUBIC)
        out += amp * big[:h, :w]
        total += amp
        amp *= 0.5
    out /= total
    return (out - out.min()) / (out.max() - out.min() + 1e-6)


def smoothstep(a, b, x):
    u = np.clip((x - a) / (b - a), 0, 1)
    return u * u * (3 - 2 * u)


def screen(img, layer):
    """Screen blend, both 0..1."""
    return 1 - (1 - img) * (1 - layer)


# Shared textures: phase noise for the wind and water, a wide field for cloud shadows, mist.
N1 = noise(W, H, 140, 140, 1)
N2 = noise(W, H, 320, 320, 2)
CLOUD = noise(W + 2400, H, 420, 230, 3, octaves=4)
MIST = noise(W + 1600, H, 360, 160, 4, octaves=4)
VIGNETTE = (1 - 0.26 * np.clip(((XX - W / 2) / (W * 0.62)) ** 2 + ((YY - H / 2) / (H * 0.62)) ** 2, 0, 1.6) ** 1.25)[..., None]
GRAIN_RNG = np.random.default_rng(5)
YO, XO = np.mgrid[0:OH, 0:OW].astype(np.float32)
VIGNETTE_OUT = (1 - 0.26 * np.clip(((XO - OW / 2) / (OW * 0.62)) ** 2 + ((YO - OH / 2) / (OH * 0.62)) ** 2, 0, 1.6) ** 1.25)[..., None]

# Reels framing: how far across the scaled-up 4:5 frame the 9:16 window sits
# (0 left .. 1 right). Calm shots pan from one value to the other; the
# corruption shots sit where the damage is.
FOCUS = 0.5
CALM_FOCUS = {"earth": (0.5, 0.5), "water": (0.3, 0.7), "aether": (0.55, 0.55), "air": (0.38, 0.62), "fire": (0.4, 0.6)}
NOW_FOCUS = {"earth": 0.5, "water": 0.45, "aether": 0.55, "air": 0.5, "fire": 0.5}


def reframe(img, fx, y0=0.0):
    """A 4:5 frame scaled up to fill the 9:16 frame, the window fx across it,
    starting y0 output px down (the rows below are reflected in)."""
    s = OH / H
    x0 = fx * (W * s - OW)
    m = np.float32([[s, 0, -x0], [0, s, -y0]])
    return cv2.warpAffine(img, m, (OW, OH), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)


def finish(img, grain=0.022):
    """Vignette and soft film grain over a 0..1 float frame; back to uint8.
    For Reels the frame is reframed first, so the grain is full size."""
    if REELS:
        img = reframe(img, FOCUS)
    img = img * VIGNETTE_OUT
    g = GRAIN_RNG.normal(0, grain, (OH // 2, OW // 2)).astype(np.float32)
    g = cv2.resize(g, (OW, OH), interpolation=cv2.INTER_LINEAR)[..., None]
    img = img + g * (0.35 + 0.65 * (1 - np.abs(img - 0.5) * 2))
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)


def camera_map(zf, zn, pxf, pxn, py, cx, cy, depth, rot=0.0, src_scale=1.0):
    """Where each output pixel samples the source. zf/zn: zoom of the far and
    the near ground, pxf/pxn: sideways shift of each (source px), py: shift up
    and down, depth: 0 far .. 1 near at each output pixel. The near ground
    zooming and sliding more than the hills is what makes it feel filmed."""
    z = zf + (zn - zf) * depth if depth is not None else zf
    px = pxf + (pxn - pxf) * depth if depth is not None else pxf
    dx, dy = XX - cx, YY - cy
    if rot:
        c, s = math.cos(rot), math.sin(rot)
        dx, dy = c * dx - s * dy, s * dx + c * dy
    mx = (cx + dx / z + px) * src_scale
    my = (cy + dy / z + py) * src_scale
    return mx.astype(np.float32), my.astype(np.float32)


def remap(img, mx, my, interp=cv2.INTER_LINEAR):
    return cv2.remap(img, mx, my, interp, borderMode=cv2.BORDER_REFLECT)


# ---------- the places ----------
# Per place: where the land starts (y at the left and right edge), the calm
# shot's camera move (start, end), and what keeps it alive.
LOOK = {
    # Terraces in the mist: crane down from the cloud onto the terraces; rain and mist drift.
    "earth": dict(horizon=(1000, 560), cam=dict(zf=(1.10, 1.13), zn=(1.10, 1.20), xf=(0, 0), xn=(0, -12), y=(-46, 26), c=(0.5, 0.62)),
                  drift=-16, shadows=0.0, sway=0.9, rain=True, mist=True, sun=None),
    # The river valley: a slow truck to the right, the near bank sliding past the hills.
    "water": dict(horizon=(774, 774), cam=dict(zf=(1.10, 1.10), zn=(1.12, 1.12), xf=(-12, 12), xn=(-42, 42), y=(0, 0), c=(0.5, 0.55)),
                  drift=12, shadows=0.14, sway=1.2, water=(820, 1260), sun=((0.92, 0.04), 0.12)),
    # The rice field: a dolly forward down the path towards the pylon.
    "aether": dict(horizon=(792, 792), cam=dict(zf=(1.06, 1.09), zn=(1.07, 1.24), xf=(0, 0), xn=(0, 0), y=(0, 0), c=(0.53, 0.58)),
                   drift=0, shadows=0.10, sway=2.8, sun=((0.08, 0.12), 0.10)),
    # The big valley: a pull back that opens the valley up while cloud shadows cross it.
    "air": dict(horizon=(380, 380), cam=dict(zf=(1.15, 1.09), zn=(1.24, 1.09), xf=(0, 0), xn=(0, 0), y=(-8, 0), c=(0.5, 0.48)),
                drift=14, shadows=0.24, sway=1.6, sun=((0.9, 0.03), 0.10)),
    # The meadow: push in and drift right through the tall grass.
    "fire": dict(horizon=(594, 594), cam=dict(zf=(1.07, 1.10), zn=(1.08, 1.19), xf=(0, 6), xn=(0, 30), y=(0, 0), c=(0.5, 0.6)),
                 drift=12, shadows=0.12, sway=3.0, sun=((0.78, 0.04), 0.16)),
}


def place_maps(e, clean):
    """Depth, sky, water and land masks for a place, from its clean frame (source coordinates)."""
    look = LOOK[e]
    f = clean.astype(np.float32) / 255
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    sat = (f.max(-1) - f.min(-1)) / (f.max(-1) + 1e-4)
    hl, hr = look["horizon"]
    hz = hl + (hr - hl) * XX / W
    depth = np.clip((YY - hz) / (H - hz), 0, 1) ** 0.9
    # Sky: sky-coloured pixels joined to the top edge, above the land.
    skyish = (((b > r + 0.03) & (lum > 0.42)) | ((sat < 0.2) & (lum > 0.6))) & (YY < hz + 30)
    n, lab = cv2.connectedComponents(skyish.astype(np.uint8))
    top = [v for v in np.unique(lab[:4]) if v != 0]
    sky = np.isin(lab, top).astype(np.uint8)
    sky = cv2.morphologyEx(sky, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    sky = cv2.erode(sky, np.ones((17, 17), np.uint8))
    sky = cv2.GaussianBlur(sky.astype(np.float32), (0, 0), 9)
    water = np.zeros((H, W), np.float32)
    if look.get("water"):
        y0, y1 = look["water"]
        wm = ((lum > 0.42) & (sat < 0.4) & (b >= r - 0.02) & (YY > y0) & (YY < y1)).astype(np.uint8)
        wm = cv2.morphologyEx(wm, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        water = cv2.GaussianBlur(wm.astype(np.float32), (0, 0), 4)
    land = cv2.GaussianBlur((depth > 0.01).astype(np.float32), (0, 0), 12)
    veg = land * (1 - water)
    mist = np.zeros((H, W), np.float32)
    if look.get("mist"):
        mm = ((sat < 0.22) & (lum > 0.5)).astype(np.float32)
        mist = cv2.GaussianBlur(cv2.dilate(mm, np.ones((41, 41), np.uint8)), (0, 0), 40)
    return dict(depth=depth.astype(np.float32), sky=sky, water=water, land=land, veg=veg, mist=mist)


RAIN_RNG = np.random.default_rng(9)
RAIN = [(RAIN_RNG.random() * W * 1.3, RAIN_RNG.random() * H, 0.5 + RAIN_RNG.random()) for _ in range(420)]


def rain_layer(t):
    """Fine rain streaks falling a little to the left, nearer ones longer and brighter."""
    layer = np.zeros((H, W), np.float32)
    for x0, y0, near in RAIN:
        vy, vx = 1500 * near, -220 * near
        y = (y0 + vy * t) % (H + 120) - 60
        x = (x0 + vx * t) % (W * 1.3) - W * 0.15
        ln = 40 * near
        cv2.line(layer, (int(x), int(y)), (int(x - vx / vy * ln), int(y - ln)), 0.35 + 0.4 * near, 1, cv2.LINE_AA)
    return cv2.GaussianBlur(layer, (0, 0), 0.7)


def calm_frame(e, src, maps, te, u, alive=True):
    """One frame of a calm shot: the place alive (src at element time te), filmed
    with the shot's camera move at progress u (0..1). alive=False films the
    frame as it is, with only the camera move (for the wrecked places)."""
    look, cam = LOOK[e], LOOK[e]["cam"]
    if not alive:
        look = {}
    img = src.astype(np.float32) / 255
    # Cloud shadows crossing the land (fixed to the ground, so before the camera).
    if look.get("shadows"):
        off = int(300 + 60 * te)
        sh = smoothstep(0.48, 0.7, CLOUD[:, off : off + W]) * maps["land"]
        img *= (1 - look["shadows"] * sh)[..., None]
        img *= (1 + 0.05 * (1 - sh) * maps["land"])[..., None]
    if look.get("mist"):
        off = int(800 + 22 * te)
        m = MIST[:, off : off + W]
        img = screen(img, (0.32 * smoothstep(0.35, 0.85, m) * maps["mist"])[..., None] * np.array([0.92, 0.93, 0.95], np.float32))
    # The camera.
    k = ease(u) * 0.75 + u * 0.25
    zf, zn = lerp(*cam["zf"], k), lerp(*cam["zn"], k)
    xf, xn = lerp(*cam["xf"], k), lerp(*cam["xn"], k)
    py = lerp(*cam["y"], k)
    cx, cy = cam["c"][0] * W, cam["c"][1] * H
    mx, my = camera_map(zf, zn, xf, xn, py, cx, cy, maps["depth"])
    # What the camera sees of each mask, so the movement stays on the right things.
    d = remap(maps["depth"], mx, my)
    sky = remap(maps["sky"], mx, my)
    veg = remap(maps["veg"], mx, my)
    water = remap(maps["water"], mx, my)
    # Clouds drift; grass moves in gusts; the river ripples.
    if look.get("drift"):
        mx = mx - sky * look["drift"] * te
    if look.get("sway"):
        phase = 2 * np.pi * (mx / 95 + my / 270 - 1.15 * te) + 5 * N1
        gust = 0.5 + 0.5 * np.sin(2 * np.pi * (mx / 640 - 0.32 * te) + 3 * N2)
        amp = look["sway"] * d**1.4 * veg * (0.3 + 0.7 * gust)
        mx = mx + amp * np.sin(phase)
        my = my + 0.3 * amp * np.cos(0.8 * phase)
    if look.get("water"):
        mx = mx + 1.6 * water * np.sin(my * 0.55 + 7.5 * te + 6 * N1)
        my = my + 0.5 * water * np.sin(my * 0.31 + 5 * te + 4 * N2)
    out = remap(img, mx, my)
    if look.get("water"):
        glint = water * smoothstep(0.62, 0.85, out.mean(-1)) * (0.5 + 0.5 * np.sin(XX * 0.21 + YY * 0.9 + 11 * te + 9 * N1))
        out = screen(out, (0.22 * glint)[..., None])
    if look.get("rain"):
        out = screen(out, (0.38 * rain_layer(te))[..., None] * np.array([0.9, 0.93, 1.0], np.float32))
    if look.get("sun"):
        (sx, sy), a = look["sun"]
        rr = ((XX - sx * W) ** 2 + (YY - sy * H) ** 2) / (0.75 * W) ** 2
        glow = np.exp(-rr * 2.2) * a * (0.9 + 0.1 * math.sin(2 * math.pi * 0.35 * te))
        out = screen(out, glow[..., None] * np.array([1.0, 0.82, 0.58], np.float32))
    # A gentle S-curve so the calm shots have some weight.
    out = np.clip(out, 0, 1)
    out = out * 0.8 + (out * out * (3 - 2 * out)) * 0.2
    return out


def light_leak(i, n):
    """A sweep of warm light for the dissolve between calm shots (0..1 per pixel)."""
    p = (i + 1) / (n + 1)
    cx = lerp(-0.25, 1.25, p) * W
    blob = np.exp(-(((XX - cx) / (0.42 * W)) ** 2) - ((YY - 0.32 * H) / (0.7 * H)) ** 2)
    return (math.sin(math.pi * p) * 0.45 * blob)[..., None] * np.array([1.0, 0.72, 0.42], np.float32)


def glitch(img, amount, seed):
    """Tear a frame like a corrupted file: bands slide sideways and the red
    channel slips further than the rest."""
    rng = np.random.default_rng(seed)
    out = img.copy()
    for _ in range(int(3 + 10 * amount)):
        y0 = int(rng.random() * H)
        y1 = min(H, y0 + int(8 + rng.random() * 70 * amount))
        dx = int((rng.random() - 0.5) * 2 * (20 + 110 * amount))
        split = int(6 + 16 * amount * rng.random())
        out[y0:y1] = np.roll(img[y0:y1], dx, axis=1)
        out[y0:y1, :, 0] = np.roll(img[y0:y1, :, 0], dx + split, axis=1)
    return out


def blend(a, b, t):
    return (a.astype(np.float32) * (1 - t) + b.astype(np.float32) * t).astype(np.uint8)


BLACK = np.zeros((OH, OW, 3), np.uint8)


# Hits on the cuts: a deep bass thump (a kick that drops from 150 Hz to a 40 Hz
# sub, with a soft knock on top), harder each pass, and only a trace of
# digital crackle so it doesn't read as a hi-hat.
def thump(rng, g):
    n = int(0.5 * SR)
    tt = np.arange(n) / SR
    f = 40 + 110 * np.exp(-tt * 28)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * (9 - 3 * g))
    sub = np.sin(2 * np.pi * 36 * tt) * np.exp(-tt * 4.5) * (1 - np.exp(-tt * 150)) * 0.55
    knock = lowpass(rng.normal(0, 1, n), 10) * np.exp(-tt * 160) * 0.6
    return np.tanh((body + sub + knock) * 1.8) / np.tanh(1.8)


# ---------- the poster in depth ----------
def poster_depth(sw, sh):
    """0 far .. 1 near over the poster's place (sizes in 720x900 poster units): sky, then the hills, then the
    river flats coming towards the camera. The fire stands on the flats, so
    its whole column takes the depth of its base."""
    fx, fy = sw / 720, sh / 900
    yy, xx = np.mgrid[0:sh, 0:sw].astype(np.float32)
    y = yy / fy
    d = 0.15 * smoothstep(240, 420, y) + 0.85 * np.clip((y - 500) / 400, 0, 1)
    base = 0.15 + 0.85 * (625 - 500) / 400
    col = smoothstep(400, 450, xx / fx) * (1 - smoothstep(640, 690, xx / fx)) * (1 - smoothstep(600, 640, y))
    d = d * (1 - col) + base * col
    return cv2.GaussianBlur(d.astype(np.float32), (0, 0), 6 * fx)


CLEAN, RAMP = 29, 144  # the poster story's clean and building frames at 24 fps (render-elemental-gif.mjs)


def poster_count():
    return len([f for f in os.listdir(POSTER) if f.startswith("scene-")])


def poster_frame(i):
    """Frame i of the poster's story: the place (RGB), the type (RGB) and its alpha."""
    scene = cv2.cvtColor(cv2.imread(os.path.join(POSTER, f"scene-{i:03d}.png")), cv2.COLOR_BGR2RGB)
    typ = cv2.imread(os.path.join(POSTER_TYPE if REELS else POSTER, f"type-{i:03d}.png"), cv2.IMREAD_UNCHANGED)
    return scene, cv2.cvtColor(typ[..., :3], cv2.COLOR_BGR2RGB), typ[..., 3].astype(np.float32) / 255


def film_poster(seq, land_at, fade):
    """Film the poster's story frames `seq` in depth: the camera pulls back
    through the layers, fast at first, and lands on the poster as designed at
    output frame `land_at`, then drifts very slowly; fades out over `fade`."""
    depth_src = poster_depth(W, H)
    total = len(seq)
    for i, si in enumerate(seq):
        bg, src, type_alpha = poster_frame(si)
        u = min(1.0, i / land_at)
        k = 1 - (1 - u) ** 2.4  # fast at first, settling as the poster lands
        hold = max(0, i - land_at) / max(1, total - land_at)
        zf = lerp(1.05, 1.0, k) + 0.004 * hold
        zn = lerp(1.25, 1.0, k) + 0.022 * hold
        xf = lerp(-16, 0, k)
        xn = lerp(-90, 0, k) + 6 * hold
        cx, cy = 0.62 * W, 0.5 * H
        # Depth is known in the poster's own coordinates: look it up where each
        # output pixel lands, twice, so the fire keeps its own depth as it moves.
        d = cv2.resize(depth_src, (W, H))
        for _ in range(2):
            mx, my = camera_map(zf, zn, xf, xn, 0, cx, cy, d)
            d = cv2.remap(depth_src, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        mx, my = camera_map(zf, zn, xf, xn, 0, cx, cy, d)
        scene = remap(bg, mx, my, cv2.INTER_CUBIC).astype(np.float32) / 255
        if REELS:
            # The window holds the fire and most of the e-waste, and sits a
            # little low so the ground clears the line and facts.
            scene = reframe(scene, POSTER_FOCUS, 120)
        zt = lerp(1.025, 1.0, k) + 0.003 * hold
        tx, ty = out_map(zt, lerp(8, 0, k), OW / 2, 0.45 * OH)
        typ = remap(src, tx, ty, cv2.INTER_CUBIC).astype(np.float32) / 255
        a = cv2.remap(type_alpha, tx, ty, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)[..., None]
        img = scene * (1 - a) + typ * a
        if i >= total - fade:
            img *= 1 - (i - (total - fade) + 1) / fade
        emit((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8))


POSTER_FOCUS = 0.66


def out_map(z, px, cx, cy):
    """A plain zoom and shift on the output frame (for the type plane)."""
    return (cx + (XO - cx) / z + px).astype(np.float32), (cy + (YO - cy) / z).astype(np.float32)


def vhs(img, amount, tt):
    """Tape rewinding, over a 0..1 frame of any size: rows jitter sideways, a
    bright tracking band rolls up the frame, colour bleeds and scan lines show."""
    if amount <= 0:
        return img
    h, w = img.shape[:2]
    rng = np.random.default_rng(int(tt * 1000) + 7)
    yy = np.arange(h, dtype=np.float32)
    band_y = h - ((tt * 1.6) % 1.0) * (h + 240) + 120
    band = np.exp(-(((yy - band_y) / (28 + 30 * amount)) ** 2))
    jit = np.convolve(rng.normal(0, 1, h), np.ones(4) / 4, "same") * 2.5 * amount + band * rng.normal(0, 1, h) * 22 * amount
    mx = np.ascontiguousarray(np.broadcast_to(np.arange(w, dtype=np.float32)[None, :] + jit[:, None].astype(np.float32), (h, w)))
    my = np.ascontiguousarray(np.broadcast_to(yy[:, None], (h, w)))
    out = cv2.remap(img.astype(np.float32), mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    sh = int(round(3 * amount)) + 1
    out[..., 0] = np.roll(out[..., 0], sh, axis=1)
    out[..., 2] = np.roll(out[..., 2], -sh, axis=1)
    lum = out.mean(-1, keepdims=True)
    out = out * (1 - 0.3 * amount) + lum * 0.3 * amount
    out = out + band[:, None, None] * (0.18 * amount + rng.random((h, w, 1), dtype=np.float32) * 0.25 * amount)
    out[::2] *= 1 - 0.07 * amount
    return np.clip(out, 0, 1)


def shaken(f, i, n, g, shake, ph, push=0.02, tape=0.0):
    """A corruption shot's frame i of n: a hard punch-in on the cut that
    settles, a slow push, a handheld shake, and a glitch tear on the cut;
    tape > 0 adds the look of a tape rewinding."""
    u = i / max(1, n - 1)
    tt = t()
    punch = 0.05 * g * math.exp(-i / 3.5)
    z = 1.06 + push * u + punch
    sx = shake * (math.sin(2 * math.pi * 1.7 * tt + ph[0]) + 0.5 * math.sin(2 * math.pi * 4.3 * tt + ph[1]))
    sy = shake * (math.sin(2 * math.pi * 1.3 * tt + ph[2]) + 0.5 * math.sin(2 * math.pi * 3.7 * tt + ph[3]))
    rot = math.radians(0.12 * shake / 6 * math.sin(2 * math.pi * 0.9 * tt + ph[0]))
    mx, my = camera_map(z, z, sx, sx, sy, W / 2, H / 2, None, rot)
    img = remap(f, mx, my)
    hit = 2 if g < 1 else 3
    if i < hit:
        img = glitch(img, g * (1 - i / hit), count)
    img = img.astype(np.float32) / 255
    if tape:
        img = vhs(img, tape, t())
    return finish(img, grain=0.026)


EDGE = np.clip(1 - VIGNETTE[..., 0] / VIGNETTE.max(), 0, 1)[..., None] ** 0.8 * 3.5


def memory(img, i):
    """The flashback look on a 0..1 frame, i frames into the memory: faded
    and warm, highlights blooming, a white glow at the edges, and the white
    flash it came in on still burning off."""
    lum = img.mean(-1, keepdims=True)
    img = (img * 0.7 + lum * 0.3) * np.array([1.07, 1.0, 0.88], np.float32)
    bloom = cv2.GaussianBlur(np.clip(img - 0.5, 0, 1), (0, 0), 20)
    img = screen(np.clip(img, 0, 1), bloom * 1.3)
    img = img * 0.88 + 0.08
    img = screen(img, np.clip(EDGE, 0, 1) * 0.3)
    flash = max(0.0, 1 - i / 6) ** 2
    return img + (1 - img) * flash


# ---------- the edit ----------
tmpdir = tempfile.mkdtemp()
silent = os.path.join(tmpdir, "video.mp4")
enc = subprocess.Popen(
    ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{OW}x{OH}", "-r", str(FPS), "-i", "-",
     "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-preset", "slow", silent],
    stdin=subprocess.PIPE,
)
count = 0


HOOK_WORDS = {}
TWO = bool(HOOK) and os.path.exists(os.path.join(HOOK, "hook-line2.png"))  # a line in two beats
if HOOK:
    for name in ("line", "contest") + (("line2",) if TWO else ()):
        png = cv2.imread(os.path.join(HOOK, f"hook-{name}.png"), cv2.IMREAD_UNCHANGED)
        HOOK_WORDS[name] = (cv2.cvtColor(png[..., :3], cv2.COLOR_BGR2RGB).astype(np.float32), png[..., 3:4].astype(np.float32) / 255)
shown = []  # (name, start, dur): words burned in over those seconds


def show(name, start, dur):
    """Burn one of the hook's words in from `start` for `dur` seconds (with --hook)."""
    if HOOK:
        shown.append((name, start, dur))


def show_line(start, end, beat):
    """The line from `start` to `end`; a two-beat line's second line comes in at `beat`."""
    show("line", start, end - start)
    if TWO:
        show("line2", beat, end - beat)


def emit(f):
    global count
    now = count / FPS
    for name, start, dur in shown:
        if start <= now < start + dur:
            rgb, a = HOOK_WORDS[name]
            env = min(1.0, (now - start) * FPS / 5, (start + dur - now) * FPS / 8)
            f = (f.astype(np.float32) * (1 - a * env) + rgb * a * env + 0.5).astype(np.uint8)
    enc.stdin.write(np.ascontiguousarray(f).tobytes())
    count += 1


t = lambda: count / FPS  # noqa: E731
cuts = []  # (time, strength) for hits
sound_bits = []  # (at, element, t0, dur, fade_in, fade_out, gain)
whooshes = []  # times of the dissolves between calm shots


def film_places(state, intro):
    """The five places filmed with their camera moves, 38 frames each:
    "clean" (alive, dissolving through warm light, each with its calm sound)
    or "wrecked" (their end state, plain dissolves, their own sound). intro:
    "black" fades the first one up from black, "flash" brings it in on a
    white flash."""
    global FOCUS
    SHOT, X = 38, 10
    T0 = 0.25 if state == "clean" else 8.6
    tail = None
    for k, e in enumerate(ORDER):
        n = SHOT + X
        raw = frames(SRC[e], T0, n)
        if state == "clean":
            maps = place_maps(e, raw[0])
            # Stay on the clean place: the element videos start building at 1.5 s.
            last_clean = int((1.4 - T0) * FPS)
            shot = [calm_frame(e, raw[min(i, last_clean)], maps, T0 + i / FPS, i / (n - 1)) for i in range(n)]
        else:
            maps = place_maps(e, frames(SRC[e], 0.25, 1)[0])
            shot = [calm_frame(e, raw[i], maps, T0 + i / FPS, i / (n - 1), alive=False) for i in range(n)]
        sound_bits.append((t(), e, T0, n / FPS, 0.35, 0.4, 1.0 if state == "clean" else 0.85))
        if k > 0 and state == "clean":
            whooshes.append(t())
        for i in range(SHOT):
            FOCUS = lerp(*CALM_FOCUS[e], i / (SHOT - 1))
            f = shot[i]
            if k == 0 and intro == "black" and i < 16:
                f = f * ((i + 1) / 17) ** 1.6
            elif k == 0 and intro == "flash":
                f = f + (1 - f) * max(0.0, 1 - i / 8) ** 2
            elif k > 0 and i < X:
                f = tail[i] * (1 - (i + 1) / (X + 1)) + f * ((i + 1) / (X + 1))
                if state == "clean":
                    f = screen(np.clip(f, 0, 1), light_leak(i, X))
            emit(finish(f))
        tail = shot[SHOT:]
        print(f"{state} {e} done", flush=True)


finale_at = None
riser_from = None
if CUT == "short":
    # A cut to the chase: each place corrupts in a time-lapse, from clean
    # (1.2 s into its video) to the end state (10.4 s), in about 0.75 s.
    LENGTHS = [20, 19, 18, 17, 16]
    TE_A, TE_B = 1.2, 10.4
    shake_rng = np.random.default_rng(3)
    riser_from = 0.0
    if TWO:
        show_line(0, 2.6, LENGTHS[0] / FPS)
        show("contest", 2.7, 1.05)
    else:
        show_line(0, 2.3, None)
        show("contest", 2.45, 1.25)
    for k, (e, n) in enumerate(zip(ORDER, LENGTHS)):
        g = 0.6 + 0.4 * k / (len(ORDER) - 1)
        cuts.append((t(), g))
        FOCUS = NOW_FOCUS[e]
        shot = frames(SRC[e], TE_A, n, fps=n / (TE_B - TE_A))
        sound_bits.append((t(), e, 6.5, n / FPS, 0.004, 0.012, 0.9))
        ph = shake_rng.random(4) * 6.28
        for i, f in enumerate(shot):
            emit(shaken(f, i, n, g, 2 + 4 * k / (len(ORDER) - 1), ph, push=0.05))
    riser_to = t()
    for _ in range(3):  # a beat of black
        emit(BLACK)
    # The poster builds in 30 frames (its 144, about five times faster), lands, and holds 2.75 s.
    finale_at = t()
    BUILD, HOLD = 30, 66
    seq = [int(round(lerp(CLEAN, CLEAN + RAMP - 1, i / (BUILD - 1)))) for i in range(BUILD)]
    seq += list(range(CLEAN + RAMP, min(poster_count(), CLEAN + RAMP + HOLD)))
    film_poster(seq, BUILD, 8)
    print("short cut done", flush=True)
elif CUT == "flashback":
    # Then, now: each place as it was, in a white flash of memory (the calm
    # shot, alive, in the flashback look), then a hard cut on a thump to how
    # it is now, wrecked. The next memory flashes in from that.
    THEN, NOW = 12, 8
    shake_rng = np.random.default_rng(3)
    flashes = []  # times of the white flashes into each memory
    memories = []  # (at, element, t0, dur): the calm sound, muffled
    if TWO:
        show_line(0.1, 2.95, (2 * THEN + NOW) / FPS)
        show("contest", 3.05, 1.12)
    else:
        show_line(0.1, 2.2, None)
        show("contest", 2.3, 1.25)
    for k, e in enumerate(ORDER):
        flashes.append(t())
        clean = frames(SRC[e], 0.25, 1)[0]
        maps = place_maps(e, clean)
        memories.append((t(), e, 0.3, THEN / FPS))
        for i in range(THEN):
            FOCUS = lerp(*CALM_FOCUS[e], 0.3 + 0.25 * i / (THEN - 1))
            f = calm_frame(e, clean, maps, 0.3 + i / FPS, 0.3 + 0.25 * i / (THEN - 1))
            emit(finish(memory(f, i), grain=0.03))
        g = 0.8
        cuts.append((t(), g))
        now = frames(SRC[e], 9.6, NOW)
        FOCUS = NOW_FOCUS[e]
        sound_bits.append((t(), e, 9.6, NOW / FPS, 0.004, 0.02, 0.9))
        ph = shake_rng.random(4) * 6.28
        for i, f in enumerate(now):
            emit(shaken(f, i, NOW, g, 4, ph, push=0.03))
        print(f"flashback {e} done", flush=True)
    for _ in range(3):
        emit(BLACK)
    finale_at = t()
    BUILD, HOLD = 30, 54
    seq = [int(round(lerp(CLEAN, CLEAN + RAMP - 1, i / (BUILD - 1)))) for i in range(BUILD)]
    seq += list(range(CLEAN + RAMP, min(poster_count(), CLEAN + RAMP + HOLD)))
    film_poster(seq, BUILD, 8)
    print("flashback cut done", flush=True)
elif CUT == "rewind":
    # 1. Cold open (none for Reels), then the problem: the five places wrecked, filmed slowly.
    for _ in range(0 if HOOK else 24):
        emit(BLACK)
    problem_from = t()
    show_line(0, 3.2 if TWO else 2.4, 38 / FPS)  # the second line on the first dissolve
    film_places("wrecked", "cut" if HOOK else "black")
    problem_to = t()
    show("contest", problem_to, 1.3)
    # 2. Time runs backwards: each place un-corrupting, played in reverse, in
    # passes that get shorter and faster: (from, back to, frames, strength).
    R_PASSES = [(10.4, 7.4, 22, 0.45), (7.4, 4.8, 15, 0.6), (4.8, 2.9, 10, 0.8), (2.9, 1.3, 7, 1.0)]
    shake_rng = np.random.default_rng(3)
    rewinds = []  # (at, element, from, to, dur): its sound, played backwards
    for p, (b_, a_, n, g) in enumerate(R_PASSES):
        if p == 1:
            riser_from = t()
        for k, e in enumerate(ORDER):
            cuts.append((t(), g))
            FOCUS = NOW_FOCUS[e]
            seg = frames(SRC[e], a_, n, fps=n / (b_ - a_))[::-1]
            rewinds.append((t(), e, a_, b_, n / FPS))
            ph = shake_rng.random(4) * 6.28
            for i, f in enumerate(seg):
                emit(shaken(f, i, n, g, 1.5 + 4.5 * p / (len(R_PASSES) - 1), ph, tape=0.3 + 0.6 * g))
        print(f"rewind pass {p} done", flush=True)
    riser_to = t()
    # 3. The tape stops on a white flash, and the places are good again.
    flashes = [t()]
    good_from = t()
    film_places("clean", "flash")
    good_to = t()
    for _ in range(12):
        emit(BLACK)
    # 4. The poster, clean like the places, catches fire as the camera pulls
    # back through it, lands on the hit and holds on it burning.
    finale_at = t()
    CLEAN_N, BUILD, HOLD = 12, 30, 66
    seq = list(range(CLEAN_N))
    seq += [int(round(lerp(CLEAN, CLEAN + RAMP - 1, i / (BUILD - 1)))) for i in range(BUILD)]
    seq += list(range(CLEAN + RAMP, min(poster_count(), CLEAN + RAMP + HOLD)))
    film_poster(seq, CLEAN_N + BUILD, 12)
    print("rewind cut done", flush=True)
else:
    # 1. Cold open (none for Reels).
    for _ in range(0 if HOOK else 24):
        emit(BLACK)
    show_line(0, 3.2 if TWO else 2.4, 38 / FPS)  # the second line on the first dissolve

    # 2. Normal: each calm place filmed, dissolving through warm light into the next.
    calm_from = t()
    if PART != "finale":
        film_places("clean", "cut" if HOOK else "black")
    calm_to = t()

    # 3. Corruption, in passes: (start in each element's video, frames per shot, glitch).
    PASSES = [(3.3, 32, 0.35), (5.7, 20, 0.55), (7.5, 12, 0.75), (9.2, 6, 1.0), (10.2, 6, 1.0)]
    if PART == "calm":
        PASSES = PASSES[:1]
    elif PART == "finale":
        PASSES = []
    shake_rng = np.random.default_rng(3)
    show("contest", t(), 1.3)
    for p, (t0, n, g) in enumerate(PASSES):
        if p == 2:
            riser_from = t()
        for k, e in enumerate(ORDER):
            cuts.append((t(), g))
            shot = frames(SRC[e], t0, n)
            FOCUS = NOW_FOCUS[e]
            sound_bits.append((t(), e, t0, n / FPS, 0.008, 0.012, 0.9))
            ph = shake_rng.random(4) * 6.28
            shake = 1.5 + 4.5 * p / max(1, len(PASSES) - 1)
            for i, f in enumerate(shot):
                emit(shaken(f, i, n, g, shake, ph))
        print(f"pass {p} done", flush=True)
    riser_to = t()

    if PART != "calm":
        # 4. Black and silence.
        for _ in range(18):
            emit(BLACK)

        # 5. Finale: the key poster's story filmed in depth, from its own layers.
        # The type is its own plane and the place behind it moves by depth (sky,
        # hills, the fire and its smoke, the river, the near ground), so as the
        # camera pulls back the near ground and the fire slide and shrink far more
        # than the hills, under type that barely moves. It all lands on the poster
        # exactly as designed when the build completes, then drifts very slowly
        # while the fire keeps moving.
        finale_at = t()
        film_poster(list(range(poster_count())), CLEAN + RAMP, 16)
        print("finale done", flush=True)

enc.stdin.close()
enc.wait()
duration = count / FPS

# ---------- sound ----------
tr = Track(duration)


def clip(name, n):
    """One of scripts/elemental-audio's recordings, n samples long (looped), peak 1."""
    data = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(CLIPS, name), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    out = np.resize(np.frombuffer(data, np.float32).reshape(-1, 2).astype(np.float64), (n, 2))
    return out / (np.max(np.abs(out)) + 1e-9)


def flash_sound(at):
    """A breath sucked in before a white flash, then a bright shimmer."""
    sn = int(0.32 * SR)
    st = np.arange(sn) / SR
    nz = tr.rng.normal(0, 1, sn)
    swell = (lowpass(nz, 4) - lowpass(nz, 30)) * (st / st[-1]) ** 3
    tr.add(at - 0.32, pan(0.5, swell / (np.max(np.abs(swell)) + 1e-9) * 0.22))
    hn = int(0.9 * SR)
    ht = np.arange(hn) / SR
    shimmer = sum(np.sin(2 * np.pi * f * ht + tr.rng.random() * 6) for f in (2200, 3300, 4950, 6600)) / 4
    shimmer = shimmer * np.exp(-ht * 5) + lowpass(tr.rng.normal(0, 1, hn), 2) * np.exp(-ht * 12) * 0.5
    tr.add(at, np.stack([shimmer, np.roll(shimmer, 200)], axis=1) * 0.12)
    tr.add(at, pan(0.5, thump(tr.rng, 0.3) * 0.35))


def warm_pad(start, end, gain=0.07):
    """A warm low chord under the calm places."""
    pad_n = int((end - start + 0.6) * SR)
    pt = np.arange(pad_n) / SR
    env = np.clip(pt / 2.0, 0, 1) ** 1.5 * np.clip((pad_n / SR - pt) / 0.5, 0, 1)
    pad = sum(a * np.sin(2 * np.pi * f * pt + 0.4 * np.sin(2 * np.pi * 0.21 * pt * (j + 1))) for j, (f, a) in enumerate([(55, 0.5), (110, 0.6), (164.8, 0.35), (220, 0.25), (261.6, 0.12)]))
    tr.add(start, np.stack([pad * env * gain, np.roll(pad, 300) * env * gain], axis=1))


def whoosh(at):
    """A soft whoosh under a dissolve, moving left to right with the light."""
    wn = int(0.9 * SR)
    wt = np.arange(wn) / SR
    nz = tr.rng.normal(0, 1, wn)
    band = lowpass(nz, 5) - lowpass(nz, 40)
    band /= np.max(np.abs(band)) + 1e-9
    envw = np.sin(np.pi * wt / wt[-1]) ** 2
    a_ = wt / wt[-1] * np.pi / 2
    tr.add(at - 0.2, np.stack([band * envw * np.cos(a_), band * envw * np.sin(a_)], axis=1) * 0.14)


for at, e, t0, dur, fin, fout, gain in sound_bits:
    src = SOUND[e]
    a, b = int(t0 * SR), int((t0 + dur) * SR)
    seg = src[a:b].copy()
    if len(seg) == 0:
        continue
    ni, no = max(1, int(fin * SR)), max(1, int(fout * SR))
    seg[:ni] *= np.linspace(0, 1, min(ni, len(seg)))[:, None][: len(seg[:ni])]
    seg[-no:] *= np.linspace(1, 0, min(no, len(seg)))[:, None][: len(seg[-no:])]
    tr.add(at, seg * gain)

# Every cut: a deep bass thump, and only a trace of digital crackle.
for at, g in cuts:
    tr.add(at, pan(0.5, thump(tr.rng, g) * (0.5 + 0.4 * g)))
    zap_n = int(0.04 * SR)
    zt = np.arange(zap_n) / SR
    zap = lowpass(np.round(tr.rng.normal(0, 1, zap_n) * 4) / 4, 3) * np.exp(-zt * 60)
    tr.add(at, pan(0.5, zap * 0.07 * g))

# A rising tone over the last passes, cut dead at the black.
if riser_from is not None:
    n_r = int((riser_to - riser_from) * SR)
    rt = np.arange(n_r) / SR
    k = rt / rt[-1]
    sweep = np.sin(2 * np.pi * np.cumsum(150 + 750 * k**2) / SR)
    air = noise_bed(rt, tr.rng, smooth=6, wobble=0)
    tr.add(riser_from, pan(0.5, (sweep * 0.25 + air * 0.35) * k**1.5))

if CUT == "flashback":
    # The memories: each place's calm sound, muffled and echoing.
    for at, e, t0, dur in memories:
        a, b = int(t0 * SR), int((t0 + dur + 0.15) * SR)
        seg = SOUND[e][a:b].copy()
        seg = np.stack([lowpass(seg[:, c], 28) for c in range(2)], axis=1)
        d1, d2 = int(0.11 * SR), int(0.23 * SR)
        wet = seg.copy()
        wet[d1:] += 0.45 * seg[:-d1]
        wet[d2:] += 0.25 * seg[:-d2]
        n = len(wet)
        env = np.minimum(1, np.arange(n) / (0.03 * SR)) * np.clip((n - np.arange(n)) / (0.12 * SR), 0, 1)
        tr.add(at, wet * env[:, None] * 1.4)
    # The flashes into each memory.
    for at in flashes:
        flash_sound(at)

if CUT == "rewind":
    # Cold open: a low hum swelling up from nothing, into an uneasy drone under the wrecked places.
    n_open = int(1.0 * SR)
    tt = np.arange(n_open) / SR
    tr.add(0, pan(0.5, hum(tt, 41, (1, 0.4)) * 0.18 * (tt / 1.0) ** 2))
    dur_p = problem_to - problem_from + 0.4
    dt = np.arange(int(dur_p * SR)) / SR
    drone = hum(dt, 41, (1, 0.5, 0.25)) * 0.5 + lowpass(noise_bed(dt, tr.rng, smooth=30), 4) * 0.5
    tr.add(problem_from, pan(0.5, drone * np.clip(dt / 1.5, 0, 1) * np.clip((dur_p - dt) / 0.4, 0, 1) * 0.3))
    # Time turns: a tape spinning up, and a sucked-in swell into the first cut.
    sn = int(0.7 * SR)
    st = np.arange(sn) / SR
    whine = np.sin(2 * np.pi * np.cumsum(180 + 1300 * (st / st[-1]) ** 2) / SR) * (st / st[-1]) * 0.12
    tr.add(problem_to - 0.7, pan(0.5, whine + lowpass(tr.rng.normal(0, 1, sn), 3) * (st / st[-1]) ** 2 * 0.15))
    bn = int(1.2 * SR)
    bt = np.arange(bn) / SR
    big = np.sin(2 * np.pi * 42 * bt * (1 - 0.18 * bt)) * np.exp(-bt * 2.2) + lowpass(tr.rng.normal(0, 1, bn), 14) * np.exp(-bt * 9) * 0.7
    tr.add(problem_to - 1.2, pan(0.5, big[::-1] * 0.5))
    tr.add(problem_to, pan(0.5, big * 0.5))
    # Each rewinding shot: its own sound played backwards at the shot's speed,
    # and a short reversed swell sucking into each cut.
    for at, e, a_, b_, dur in rewinds:
        seg = SOUND[e][int(a_ * SR) : int(b_ * SR)][::-1]
        m = int(dur * SR)
        idx = np.linspace(0, len(seg) - 1, m)
        out = np.stack([np.interp(idx, np.arange(len(seg)), seg[:, c]) for c in range(2)], axis=1)
        e_in = np.clip(np.arange(m) / (0.006 * SR), 0, 1) * np.clip((m - np.arange(m)) / (0.01 * SR), 0, 1)
        tr.add(at, out * e_in[:, None] * 0.75)
    for at, g in cuts:
        sw = thump(tr.rng, g)[: int(0.22 * SR)][::-1]
        tr.add(at - 0.22, pan(0.5, sw * 0.3 * g))
    # The tape stops, pitching down, into the white flash.
    sn = int(0.35 * SR)
    st = np.arange(sn) / SR
    stop = np.sin(2 * np.pi * np.cumsum(900 * (1 - st / st[-1]) ** 2 + 40) / SR) * 0.2
    tr.add(riser_to - 0.35, pan(0.5, stop))
    flash_sound(flashes[0])
    # The places good again: the warm pad and soft whooshes.
    warm_pad(good_from, good_to)
    for at in whooshes:
        whoosh(at)
    # The poster: the calm river breaking up as it catches fire, the fire and a
    # drone swelling, the glyph zaps at their moments, and the big hit as it lands.
    f_dur = duration - finale_at
    fn = int(f_dur * SR)
    ft = np.arange(fn) / SR
    b0, b1 = CLEAN_N / FPS, (CLEAN_N + BUILD) / FPS
    lv = np.clip((ft - b0) / (b1 - b0), 0, 1)
    tr.add(finale_at, break_up(clip("river-pfannkuchn.mp3", fn), lv, tr.rng, fade_at=b1 - 0.3) * 0.5)
    tr.add(finale_at, clip("fire-crackle-tosha73.mp3", fn) * (0.45 * lv)[:, None])
    drone = hum(ft, 46, (1, 0.6, 0.3)) * 0.5 + lowpass(noise_bed(ft, tr.rng, smooth=30), 4) * 0.5
    tr.add(finale_at, pan(0.5, drone * 0.35 * lv**1.3))
    for c in (0.15, 0.305, 0.55, 0.79):
        zn = int(0.1 * SR)
        zt = np.arange(zn) / SR
        zap = np.round(np.sign(np.sin(2 * np.pi * (300 + 900 * tr.rng.random()) * zt)) * np.exp(-zt * 30) * 3) / 3
        tr.add(finale_at + b0 + c * (b1 - b0), pan(0.5, zap * 0.25))
    boom_n = int(2.5 * SR)
    bt = np.arange(boom_n) / SR
    boom = np.sin(2 * np.pi * 38 * bt * (1 - 0.15 * bt)) * np.exp(-bt * 1.6) + lowpass(tr.rng.normal(0, 1, boom_n), 20) * np.exp(-bt * 6) * 0.6
    tr.add(finale_at + b1, pan(0.5, boom * 0.9))

if CUT in ("short", "flashback"):
    # A big low hit: straight in on the first frame, or in the flashback on
    # the first cut back to the present.
    bn = int(1.8 * SR)
    bt = np.arange(bn) / SR
    big = np.sin(2 * np.pi * 42 * bt * (1 - 0.18 * bt)) * np.exp(-bt * 2.2) + lowpass(tr.rng.normal(0, 1, bn), 14) * np.exp(-bt * 9) * 0.7
    tr.add(cuts[0][0] if CUT == "flashback" else 0, pan(0.5, big * 0.6))
    # The poster: fire and a drone swelling through the fast build, the glyph
    # zaps at their moments, and the big hit as it lands.
    f_dur = duration - finale_at
    ft = np.arange(int(f_dur * SR)) / SR
    b1 = BUILD / FPS
    lv = np.clip(ft / b1, 0, 1)
    fire = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(CLIPS, "fire-crackle-tosha73.mp3"), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    fire = np.resize(np.frombuffer(fire, np.float32).reshape(-1, 2).astype(np.float64), (len(ft), 2))
    fire /= np.max(np.abs(fire)) + 1e-9
    tr.add(finale_at, fire * (0.45 * lv)[:, None])
    drone = hum(ft, 46, (1, 0.6, 0.3)) * 0.5 + lowpass(noise_bed(ft, tr.rng, smooth=30), 4) * 0.5
    tr.add(finale_at, pan(0.5, drone * 0.35 * lv**1.3))
    for c in (0.15, 0.305, 0.55, 0.79):
        at = c * b1
        zn = int(0.1 * SR)
        zt = np.arange(zn) / SR
        zap = np.round(np.sign(np.sin(2 * np.pi * (300 + 900 * tr.rng.random()) * zt)) * np.exp(-zt * 30) * 3) / 3
        tr.add(finale_at + at, pan(0.5, zap * 0.25))
    boom_n = int(2.5 * SR)
    bt = np.arange(boom_n) / SR
    boom = np.sin(2 * np.pi * 38 * bt * (1 - 0.15 * bt)) * np.exp(-bt * 1.6) + lowpass(tr.rng.normal(0, 1, boom_n), 20) * np.exp(-bt * 6) * 0.6
    tr.add(finale_at + b1, pan(0.5, boom * 0.9))
elif CUT == "full":
    # Cold open: a low hum swelling up from nothing.
    n_open = int(1.0 * SR)
    tt = np.arange(n_open) / SR
    tr.add(0, pan(0.5, hum(tt, 41, (1, 0.4)) * 0.18 * (tt / 1.0) ** 2))

    # A warm low pad under the calm places, so it feels like the start of a
    # film, and soft whooshes under the dissolves.
    warm_pad(calm_from, calm_to)
    for at in whooshes:
        whoosh(at)

    # The calm breaks: one big hit on the first corruption cut.
    if cuts:
        bn = int(1.8 * SR)
        bt = np.arange(bn) / SR
        big = np.sin(2 * np.pi * 42 * bt * (1 - 0.18 * bt)) * np.exp(-bt * 2.2) + lowpass(tr.rng.normal(0, 1, bn), 14) * np.exp(-bt * 9) * 0.7
        tr.add(cuts[0][0], pan(0.5, big * 0.75))

    if finale_at is not None:
        # Finale: matches the story's timing (29 clean frames, 144 building).
        f_dur = duration - finale_at
        ft = np.arange(int(f_dur * SR)) / SR
        b0, b1 = 29 / FPS, (29 + 144) / FPS
        lv = np.clip((ft - b0) / (b1 - b0), 0, 1)
        river = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(CLIPS, "river-pfannkuchn.mp3"), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
        river = np.resize(np.frombuffer(river, np.float32).reshape(-1, 2).astype(np.float64), (len(ft), 2))
        river /= np.max(np.abs(river)) + 1e-9
        tr.add(finale_at, break_up(river, lv, tr.rng, fade_at=b1 - 0.6) * 0.6)
        fire = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(CLIPS, "fire-crackle-tosha73.mp3"), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
        fire = np.resize(np.frombuffer(fire, np.float32).reshape(-1, 2).astype(np.float64), (len(ft), 2))
        fire /= np.max(np.abs(fire)) + 1e-9
        fire_on = np.clip((lv - 0.45) / 0.3, 0, 1)
        tr.add(finale_at, fire * (0.45 * fire_on)[:, None])
        drone = hum(ft, 46, (1, 0.6, 0.3)) * 0.5 + lowpass(noise_bed(ft, tr.rng, smooth=30), 4) * 0.5
        tr.add(finale_at, pan(0.5, drone * 0.35 * lv**1.3))
        # The glyphs glitching into "Elemental": each element's stage is half done at
        # these corruption levels (scripts/elemental-stages.mjs).
        for c in (0.15, 0.305, 0.55, 0.79):
            at = (29 + int(np.ceil(c * 144)) - 1) / FPS
            zn = int(0.12 * SR)
            zt = np.arange(zn) / SR
            zap = np.sign(np.sin(2 * np.pi * (300 + 900 * tr.rng.random()) * zt)) * np.exp(-zt * 25)
            zap = np.round(zap * 3) / 3
            tr.add(finale_at + at, pan(0.5, zap * 0.3))
        # The poster lands: one big hit as the build completes, ringing into the hold.
        boom_n = int(2.5 * SR)
        bt = np.arange(boom_n) / SR
        boom = np.sin(2 * np.pi * 38 * bt * (1 - 0.15 * bt)) * np.exp(-bt * 1.6) + lowpass(tr.rng.normal(0, 1, boom_n), 20) * np.exp(-bt * 6) * 0.6
        tr.add(finale_at + b1, pan(0.5, boom * 0.9))

# Glue: a soft clip so the hits don't poke out, then the normal fades.
tr.out = np.tanh(tr.out * 1.4) / np.tanh(1.4)

# ---------- write ----------
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
wav = os.path.join(tmpdir, "teaser.wav")
out = tr.out.copy()
a_in, a_out = int((0.3 if CUT == "full" and not HOOK else 0.012) * SR), int(0.4 * SR)  # the short cuts and Reels hooks hit on their first frame (12 ms, so the encoder doesn't overshoot)
if a_in:
    out[:a_in] *= np.linspace(0, 1, a_in)[:, None]
out[-a_out:] *= np.linspace(1, 0, a_out)[:, None]
out /= (np.max(np.abs(out)) + 1e-9) / 0.84  # -1.5 dBFS, so the AAC encode has headroom
with wave.open(wav, "wb") as wf:
    wf.setnchannels(2)
    wf.setsampwidth(2)
    wf.setframerate(SR)
    wf.writeframes((out * 32767).astype(np.int16).tobytes())
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", silent, "-i", wav, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", OUT], check=True)
for f in (silent, wav):
    os.remove(f)
os.rmdir(tmpdir)
print(f"✅ {OUT} ({duration:.1f} s)")
