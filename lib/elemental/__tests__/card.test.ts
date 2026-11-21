/**
 * @jest-environment node
 */
import { createHash } from "node:crypto";

import { PNG } from "pngjs";

import { ELEMENTAL_PALETTE, ELEMENTAL_SPRITES } from "../../../bot/assets/elemental/sprites";
import { DIGITS } from "../../../bot/src/quests/island/scene";
import { CARD_HEIGHT, CARD_WIDTH, cardIslandRect, cardPixels, cardPng, topElementOf, type CardProps } from "../island/card";
import { elementalLayout } from "../island/layout";
import { TAG_GLYPH } from "../island/pixelFont";
import { renderIslandPixels } from "../island/render";
import { buildElementalScene, type ElementalPlotInput, type ElementalScene } from "../island/scene";
import { SECTOR_ORDER, candidateSlots } from "../island/sectors";
import { hexRgba, pack } from "../island/surface";

/**
 * sha256 of the decoded RGB pixels of cardPng(props()).
 * Update only with a layout, sprite or island change you meant (and look at the PNG).
 */
const PINNED = "a22897dfde2f8160eb06bab53c3ed174fabd5b02386750b87e1e9015f88f0dde";

const MAX_BYTES = 1.5 * 1024 * 1024;

const sha = (b: Buffer | Uint8Array) => createHash("sha256").update(b).digest("hex");

function rgbHash(png: Buffer): string {
  const img = PNG.sync.read(png);
  const rgb = Buffer.alloc(img.width * img.height * 3);
  for (let i = 0, o = 0; i < img.data.length; i += 4) {
    rgb[o++] = img.data[i];
    rgb[o++] = img.data[i + 1];
    rgb[o++] = img.data[i + 2];
  }
  return sha(rgb);
}

/** The 30-team island of render.test.ts: every element, every stage, lanterns and 0..5 badges. */
function fixture(): ElementalScene {
  const taken: number[] = [];
  const rows: ElementalPlotInput[] = Array.from({ length: 30 }, (_, k) => {
    const element = SECTOR_ORDER[(k * 3) % 5];
    const slot = candidateSlots(element, taken)[0];
    taken.push(slot);
    return { slot, element, counted: k % 10, lit: k % 3 === 0, badges: k % 7 };
  });
  return buildElementalScene(rows);
}

/** All 200 slots, every piece drawn: the busiest (biggest) island. */
function full(): ElementalScene {
  return buildElementalScene(
    Array.from({ length: 200 }, (_, k) => ({ slot: k + 1, element: SECTOR_ORDER[k % 5], counted: 7, lit: true, badges: 5 }))
  );
}

function props(over: Partial<CardProps> = {}): CardProps {
  return {
    island: fixture(),
    helped: 1234,
    checkedIn: 27,
    topElement: "fire",
    levels: { water: 120, earth: 80, air: 45, fire: 300, aether: 0 },
    ...over,
  };
}

/** Width and height from the IHDR chunk, read straight from the bytes. */
function ihdr(png: Buffer): { width: number; height: number; type: string } {
  return { type: png.toString("ascii", 12, 16), width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

/** True when the card's island rect holds exactly the portrait island's land box, pixel for pixel. */
function islandCopiedExactly(card: Uint32Array, scene: ElementalScene): boolean {
  const island = renderIslandPixels(scene, { layout: "portrait" });
  const at = cardIslandRect();
  for (let j = 0; j < at.h; j++) {
    for (let i = 0; i < at.w; i++) {
      if (card[(at.y + j) * CARD_WIDTH + at.x + i] !== island.px[(at.crop.y + j) * island.width + at.crop.x + i]) return false;
    }
  }
  return true;
}

describe("cardPng", () => {
  it("is exactly 1080 x 1920 (IHDR), the same bytes for the same props, and pinned", () => {
    const a = cardPng(props());
    expect(ihdr(a)).toEqual({ type: "IHDR", width: 1080, height: 1920 });
    expect([CARD_WIDTH, CARD_HEIGHT]).toEqual([1080, 1920]);
    expect(sha(cardPng(props()))).toBe(sha(a));
    expect(a.length).toBeLessThan(MAX_BYTES);
    expect(rgbHash(a)).toBe(PINNED);
  });

  it.each([
    ["0", 0],
    ["9999", 9999],
  ])("renders %s everywhere, under 1.5 MB", (_label, n) => {
    const png = cardPng(props({ helped: n, checkedIn: n, levels: Object.fromEntries(SECTOR_ORDER.map((e) => [e, n])) }));
    expect(ihdr(png)).toMatchObject({ width: 1080, height: 1920 });
    expect(png.length).toBeLessThan(MAX_BYTES);
    expect(PNG.sync.read(png).width).toBe(1080);
  });

  it("stays under 1.5 MB with all 200 plots drawn and the biggest numbers", () => {
    const png = cardPng(props({ island: full(), helped: 99_999, checkedIn: 200, levels: { water: 99_999, fire: 1 } }));
    expect(png.length).toBeLessThan(MAX_BYTES);
  });

  it("draws an empty island (0 teams) and empty totals", () => {
    const png = cardPng({ island: buildElementalScene([]), helped: 0, checkedIn: 0, topElement: null, levels: {} });
    expect(ihdr(png)).toMatchObject({ width: 1080, height: 1920 });
  });

  it("draws the island at integer scale 1: the land box copied pixel for pixel, centred, above the band", () => {
    const at = cardIslandRect();
    const L = elementalLayout("portrait");
    expect(at.crop).toEqual(L.landBoxPx);
    expect([at.w, at.h]).toEqual([L.landBoxPx.w, L.landBoxPx.h]);
    expect(at.x).toBe((CARD_WIDTH - at.w) / 2);
    expect(at.y + at.h).toBeLessThan(CARD_HEIGHT - 400);
    for (const scene of [fixture(), full(), buildElementalScene([])]) {
      expect(islandCopiedExactly(cardPixels(props({ island: scene })).px, scene)).toBe(true);
    }
  });

  it("keeps every plot (tree, flag, lantern, tag, pips) inside the land box, so the crop never cuts one", () => {
    const box = elementalLayout("portrait").landBoxPx;
    for (const p of renderIslandPixels(full(), { layout: "portrait" }).plots) {
      expect(p.box.x >= box.x && p.box.y >= box.y && p.box.x + p.box.w <= box.x + box.w && p.box.y + p.box.h <= box.y + box.h).toBe(true);
    }
  });

  it("draws plot tag digits with 2 x 2 (or bigger) pixels", () => {
    expect(TAG_GLYPH).toBeGreaterThanOrEqual(2);
    const scene = buildElementalScene([{ slot: 7, element: "water", counted: 3, lit: false, badges: 0 }]);
    const { px } = cardPixels(props({ island: scene }));
    const at = cardIslandRect();
    const tag = renderIslandPixels(scene, { layout: "portrait" }).plots[0].tag;
    const white = pack([255, 255, 255, 255]);
    const g = TAG_GLYPH;
    const bits = DIGITS[7];
    for (let j = 0; j < 5; j++) {
      for (let i = 0; i < 3; i++) {
        const x = at.x - at.crop.x + tag.x + (2 + i) * g;
        const y = at.y - at.crop.y + tag.y + (2 + j) * g;
        for (let dy = 0; dy < g; dy++) {
          for (let dx = 0; dx < g; dx++) expect(px[(y + dy) * CARD_WIDTH + x + dx] === white).toBe(bits[j * 3 + i] === "1");
        }
      }
    }
  });

  it("continues the sea around the crop on the island's own tile grid", () => {
    // Sea pixels just outside the crop match the portrait island's own water there.
    const scene = buildElementalScene([]);
    const { px } = cardPixels(props({ island: scene }));
    const island = renderIslandPixels(scene, { layout: "portrait" });
    const at = cardIslandRect();
    const ox = at.x - at.crop.x;
    const oy = at.y - at.crop.y;
    for (let y = 0; y < 1400; y += 37) {
      for (const x of [0, 40, 90, 930, 970]) {
        const ix = x - ox;
        const iy = y - oy;
        if (ix < 0 || iy < 0 || ix >= island.width || iy >= island.height) continue;
        expect(px[y * CARD_WIDTH + x]).toBe(island.px[iy * island.width + ix]);
      }
    }
  });

  it("puts island health (healthFor's output) through to the island", () => {
    const scene = fixture();
    const healthy = sha(cardPng(props({ island: { plots: scene.plots, health: { water: 1, fire: 1 } } })));
    expect(healthy).toBe(sha(cardPng(props({ island: scene }))));
  });

  it("draws the top element's flag big in its frame, and an empty frame for null or an unknown key", () => {
    const fire = cardPixels(props({ topElement: "fire" })).px;
    const cloth = pack(hexRgba(ELEMENTAL_PALETTE[ELEMENTAL_SPRITES.flag_fire[2][3]])!);
    // Flag at 8x, centred in the 168 x 208 frame at (48, 1668): cloth pixel (3, 2) of the sprite.
    const fx = 48 + (168 - 9 * 8) / 2 + 3 * 8 + 4;
    const fy = 1668 + (208 - 16 * 8) / 2 + 2 * 8 + 4;
    expect(fire[fy * CARD_WIDTH + fx]).toBe(cloth);
    const none = sha(cardPng(props({ topElement: null })));
    expect(sha(cardPng(props({ topElement: "metal" as unknown as CardProps["topElement"] })))).toBe(none);
    expect(none).not.toBe(sha(cardPng(props())));
  });

  it("reads numbers safely: negatives, NaN, fractions and huge values never break the card", () => {
    const odd = props({ helped: -5, checkedIn: Number.NaN, levels: { water: 2.7, fire: Number.POSITIVE_INFINITY } });
    expect(sha(cardPng(odd))).toBe(sha(cardPng(props({ helped: 0, checkedIn: 0, levels: { water: 2 } }))));
    expect(ihdr(cardPng(props({ helped: 10 ** 12 })))).toMatchObject({ width: 1080 });
  });

  it("ignores fields outside the props: extra strings never reach the picture", () => {
    const base = sha(cardPng(props()));
    const scene = fixture();
    const tainted = {
      ...props(),
      name: "Someone",
      island: { ...scene, plots: scene.plots.map((p) => ({ ...p, name: "Team", discord_user_id: "1" })) },
    } as CardProps;
    expect(sha(cardPng(tainted))).toBe(base);
  });
});

describe("topElementOf", () => {
  it("breaks a tie by the fixed element order", () => {
    expect(topElementOf({ fire: 3, water: 3 })).toBe("water");
    expect(topElementOf({ aether: 2, earth: 2, fire: 1 })).toBe("earth");
    expect(topElementOf({ aether: 5, air: 5, fire: 5 })).toBe("air");
    expect(topElementOf({ aether: 6, air: 5 })).toBe("aether");
  });

  it("is null when no element is above 0", () => {
    expect(topElementOf({})).toBeNull();
    expect(topElementOf({ water: 0, fire: -1, air: Number.NaN })).toBeNull();
  });

  it("draws a tie's pick the same as naming that element", () => {
    const tie = topElementOf({ fire: 4, water: 4 });
    expect(sha(cardPng(props({ topElement: tie })))).toBe(sha(cardPng(props({ topElement: "water" }))));
  });
});

// ---- Type tests: the props are exactly these five, and none is free text. ----

type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

type HasFreeString<T> = T extends string
  ? string extends T
    ? true
    : never
  : T extends readonly (infer U)[]
    ? HasFreeString<U>
    : T extends object
      ? { [K in keyof T]-?: HasFreeString<T[K]> }[keyof T]
      : never;
type NoFreeString<T> = [HasFreeString<T>] extends [never] ? true : false;

const typeChecks: {
  keys: Equals<keyof CardProps, "island" | "helped" | "checkedIn" | "topElement" | "levels">;
  noFreeText: NoFreeString<CardProps>;
  control: Equals<keyof CardProps, "island" | "helped">;
} = { keys: true, noFreeText: true, control: false };

it("has only {island, helped, checkedIn, topElement, levels} as props, with no free-text field (type test)", () => {
  expect(typeChecks).toEqual({ keys: true, noFreeText: true, control: false });
});
