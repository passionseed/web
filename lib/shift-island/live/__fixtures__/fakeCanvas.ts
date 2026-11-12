/**
 * A tiny software 2D context for tests: integer drawImage (nearest
 * neighbour), fillRect, rectangular clips and source-over blending with the
 * same rounding the bot's PNG renderer uses. Enough to prove the live island
 * draws the PNG's pixels without a browser.
 */
import type { DrawContext } from "../draw";
import { intersect, type Rect } from "../geometry";

export class FakeImage {
  readonly data: Uint8ClampedArray;
  constructor(
    readonly width: number,
    readonly height: number,
    data?: Uint8ClampedArray
  ) {
    this.data = data ?? new Uint8ClampedArray(width * height * 4);
  }

  /** An opaque black image, like a canvas with alpha:false. */
  static opaque(width: number, height: number): FakeImage {
    const img = new FakeImage(width, height);
    for (let k = 3; k < img.data.length; k += 4) img.data[k] = 255;
    return img;
  }

  private view: Uint32Array | null = null;

  /** The pixels as RGBA words (alpha in the top byte on little-endian machines). */
  words(): Uint32Array {
    if (!this.view) this.view = new Uint32Array(this.data.buffer, this.data.byteOffset, this.width * this.height);
    return this.view;
  }

  /** RGB bytes only, for comparisons. */
  rgb(): Uint8Array {
    const out = new Uint8Array(this.width * this.height * 3);
    for (let i = 0, o = 0; i < this.data.length; i += 4) {
      out[o++] = this.data[i];
      out[o++] = this.data[i + 1];
      out[o++] = this.data[i + 2];
    }
    return out;
  }
}

function parseColour(style: unknown): [number, number, number, number] {
  if (typeof style !== "string") throw new Error(`unsupported fillStyle ${String(style)}`);
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(style);
  if (hex) return [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16), 255];
  const m = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/.exec(style);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3]), Math.round(Number(m[4]) * 255)];
  throw new Error(`unsupported fillStyle ${style}`);
}

export class FakeContext implements DrawContext<FakeImage> {
  imageSmoothingEnabled = true;
  globalAlpha = 1;
  fillStyle: unknown = "#000000";
  readonly calls = { drawImage: 0, fillRect: 0 };
  private clipRect: Rect;
  private path: Rect | null = null;
  private readonly stack: { clip: Rect; alpha: number; fill: unknown }[] = [];

  /**
   * `origin` is the scene point drawn at the target's top-left corner, like
   * the engine's setTransform(1, 0, 0, 1, -frame.x, -frame.y).
   */
  constructor(
    readonly target: FakeImage,
    private readonly origin: { x: number; y: number } = { x: 0, y: 0 }
  ) {
    this.clipRect = { x: 0, y: 0, w: target.width, h: target.height };
  }

  save(): void {
    this.stack.push({ clip: this.clipRect, alpha: this.globalAlpha, fill: this.fillStyle });
  }

  restore(): void {
    const top = this.stack.pop();
    if (!top) return;
    this.clipRect = top.clip;
    this.globalAlpha = top.alpha;
    this.fillStyle = top.fill;
  }

  beginPath(): void {
    this.path = null;
  }

  rect(x: number, y: number, w: number, h: number): void {
    this.path = { x: x - this.origin.x, y: y - this.origin.y, w, h };
  }

  clip(): void {
    this.clipRect = (this.path && intersect(this.clipRect, this.path)) ?? { x: 0, y: 0, w: 0, h: 0 };
  }

  /** Source-over, rounded like the PNG renderer's alpha blend. */
  private blend(k: number, r: number, g: number, b: number, a: number): void {
    const d = this.target.data;
    if (a >= 255) {
      d[k] = r;
      d[k + 1] = g;
      d[k + 2] = b;
      d[k + 3] = 255;
      return;
    }
    if (a <= 0) return;
    const sa = a / 255;
    const da = d[k + 3] / 255;
    const outA = sa + da * (1 - sa);
    d[k] = Math.round((r * sa + d[k] * da * (1 - sa)) / outA);
    d[k + 1] = Math.round((g * sa + d[k + 1] * da * (1 - sa)) / outA);
    d[k + 2] = Math.round((b * sa + d[k + 2] * da * (1 - sa)) / outA);
    d[k + 3] = Math.round(outA * 255);
  }

  fillRect(x: number, y: number, w: number, h: number): void {
    this.calls.fillRect++;
    const [r, g, b, a] = parseColour(this.fillStyle);
    const area = intersect(this.clipRect, { x: x - this.origin.x, y: y - this.origin.y, w, h });
    if (!area) return;
    const alpha = Math.round(a * this.globalAlpha);
    for (let py = area.y; py < area.y + area.h; py++) {
      for (let px = area.x; px < area.x + area.w; px++) this.blend((py * this.target.width + px) * 4, r, g, b, alpha);
    }
  }

  drawImage(img: FakeImage, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void {
    this.calls.drawImage++;
    for (const v of [sx, sy, sw, sh, dx, dy, dw, dh]) if (!Number.isInteger(v)) throw new Error(`non-integer drawImage argument ${v}`);
    if (sx < 0 || sy < 0 || sx + sw > img.width || sy + sh > img.height) throw new Error("drawImage source outside the image");
    dx -= this.origin.x;
    dy -= this.origin.y;
    const area = intersect(this.clipRect, { x: dx, y: dy, w: dw, h: dh });
    if (!area) return;
    const src = img.words();
    const dst = this.target.words();
    const W = this.target.width;
    for (let py = area.y; py < area.y + area.h; py++) {
      const v = sy + Math.floor(((py - dy) * sh) / dh);
      if (v < 0 || v >= img.height) continue;
      for (let px = area.x; px < area.x + area.w; px++) {
        const u = sw === dw ? sx + px - dx : sx + Math.floor(((px - dx) * sw) / dw);
        if (u < 0 || u >= img.width) continue;
        const word = src[v * img.width + u];
        const alpha = word >>> 24;
        if (alpha === 0) continue;
        if (alpha === 255 && this.globalAlpha === 1) {
          dst[py * W + px] = word;
          continue;
        }
        const s = (v * img.width + u) * 4;
        this.blend((py * W + px) * 4, img.data[s], img.data[s + 1], img.data[s + 2], Math.round(alpha * this.globalAlpha));
      }
    }
  }
}
