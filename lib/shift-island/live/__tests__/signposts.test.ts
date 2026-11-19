/**
 * @jest-environment node
 */
import { PALETTE } from "@/bot/assets/island/sprites";
import { DIGITS, buildScene, tagRect, type IslandPlot, type SceneTree } from "@/bot/src/quests/island/scene";

import { FakeContext, FakeImage } from "../__fixtures__/fakeCanvas";
import { buildAtlasData } from "../atlas";
import { SHADOW_LEAN, webSprites } from "../atmosphere";
import { gradeKey, gradeRgb } from "../grade";
import { BOARD, boardInk, paintSignposts, plankWidth, signSprites, signpostFor, signposts, wholeUnit } from "../signposts";
import type { LightPhase } from "../types";

const PHASES: LightPhase[] = ["dawn", "day", "dusk", "night"];

const plots = (n: number): IslandPlot[] =>
  Array.from({ length: n }, (_, k) => ({ slot: k + 1, stage: k % 8, visitor: k % 3 === 0, key: k % 4 === 0, helper: false, lantern: k % 5 === 0, name: null, mine: false }));

/** A tree as the scene places one, for any slot (3-digit slots need no 100-plot island). */
const tree = (slot: number, left = 200, top = 120): SceneTree => ({
  slot,
  stage: 3,
  sprite: "stage_3",
  left,
  top,
  w: 32,
  h: 40,
  key: null,
  visitor: null,
  lantern: null,
  mine: false,
});

const within = (inner: { x: number; y: number; w: number; h: number }, outer: { x: number; y: number; w: number; h: number }) =>
  inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;

/** WCAG contrast of two colours. */
function contrast(a: readonly number[], b: readonly number[]): number {
  const lum = (rgb: readonly number[]) => {
    const [r, g, bl] = rgb.map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const hexRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

describe("signpost sprites", () => {
  const sprites = signSprites();

  it("are rectangles of palette keys, in the web's sprite set and never the bot's", () => {
    for (const [name, rows] of Object.entries(sprites)) {
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row).toHaveLength(rows[0].length);
        for (const ch of row) if (ch !== ".") expect(PALETTE[ch]).toBeDefined();
      }
      expect(webSprites()[name]).toBe(rows);
    }
  });

  it("are a plank as wide as its digits on a post centred under it, with a foot", () => {
    for (const digits of [1, 2, 3]) {
      for (const hung of [false, true]) {
        const rows = sprites[`signpost_${digits}${hung ? "_hung" : ""}`];
        const w = plankWidth(digits, hung);
        expect(rows[0]).toHaveLength(w);
        // Notched corners on the plank, and the post's three columns in the middle of the sprite.
        expect(rows[0][0]).toBe(".");
        expect(rows[0][w - 1]).toBe(".");
        const post = rows[rows.length - 2];
        const inked = [...post].flatMap((ch, x) => (ch === "." ? [] : [x]));
        if (!hung) expect(inked).toEqual([(w - 1) / 2 - 1, (w - 1) / 2, (w - 1) / 2 + 1]);
        expect(rows[rows.length - 1].replace(/\./g, "")).toHaveLength(5);
      }
    }
  });

  it("hang a board on two ropes from the plank's ends, clear of the post", () => {
    for (const digits of [1, 2, 3]) {
      const rows = sprites[`signpost_${digits}_hung`];
      const w = plankWidth(digits, true);
      expect(w).toBeGreaterThanOrEqual(plankWidth(2));
      // The rows between the plank and the board's top edge: a rope at each end, the post between.
      for (let y = 10; y <= BOARD.top; y++) {
        const row = rows[y];
        expect(row[1]).not.toBe(".");
        expect(row[w - 2]).not.toBe(".");
        expect(row[2]).toBe(".");
        expect(row[w - 3]).toBe(".");
      }
      // Under the board, the post alone.
      for (let y = BOARD.top + 1; y < rows.length - 1; y++) expect(rows[y][1]).toBe(".");
    }
  });

  it("paint the bot's own digit shapes", () => {
    DIGITS.forEach((bits, d) => {
      expect(sprites[`sign_digit_${d}`].join("").replace(/[^.]/g, "1").replace(/\./g, "0")).toBe(bits);
    });
  });
});

describe("where a signpost stands", () => {
  it("stands centred under its tree, its plank one row under the soil mound, never over the tree", () => {
    for (const slot of [1, 9, 10, 42, 100, 123]) {
      const t = tree(slot);
      for (const hung of [false, true]) {
        const post = signpostFor(t, 1, hung);
        expect(post.y).toBe(t.top + t.h);
        // Centred: the plank's middle on the tree's middle (odd widths: half a pixel right, as the bot's tags).
        const mid = post.x + post.rect.w / 2;
        expect(Math.abs(mid - (t.left + t.w / 2) - 0.5)).toBeLessThanOrEqual(0.5);
        expect(post.digits).toHaveLength(String(slot).length);
      }
    }
  });

  it("close up, stays inside the bot's biggest tag box, shadow and all, so nothing the plaza keeps clear of a tag ever meets it", () => {
    for (const slot of [1, 9, 10, 42, 100, 123]) {
      const t = tree(slot);
      const tag = tagRect(slot, t.left + Math.floor(t.w / 2), t.top + t.h, 3);
      for (const hung of [false, true]) {
        const post = signpostFor(t, 1, hung);
        expect(within(post.rect, tag)).toBe(true);
        for (const lean of Object.values(SHADOW_LEAN)) expect(within({ ...post.shadow, x: post.shadow.x + lean }, tag)).toBe(true);
      }
    }
  });

  it("paints its digits on the plank's face, centred, under the lit edge", () => {
    for (const slot of [7, 42, 123]) {
      for (const hung of [false, true]) {
        const post = signpostFor(tree(slot), 1, hung);
        const w = post.rect.w;
        const first = post.digits[0].x - post.x;
        const last = post.digits[post.digits.length - 1].x + 3 - post.x;
        expect(first).toBe(w - last);
        expect(first).toBeGreaterThanOrEqual(3);
        for (const d of post.digits) expect(d.y - post.y).toBe(3);
      }
    }
  });

  it("tells the name's board where to hang: under the ropes, at least as wide as they are apart", () => {
    const post = signpostFor(tree(4), 1, true);
    expect(post.hang).not.toBeNull();
    const hang = post.hang!;
    expect(hang.y).toBe(post.y + BOARD.top);
    expect(hang.cx).toBe(post.x + post.rect.w / 2);
    expect(hang.minW).toBe(post.rect.w);
    // The post goes on below the board to its foot.
    expect(post.rect.y + post.rect.h).toBeGreaterThan(hang.y + BOARD.h);
    expect(signpostFor(tree(4), 1, false).hang).toBeNull();
  });

  it("on the whole island, is drawn as big as the bot's tags (2x at most), and carries no board", () => {
    expect([1, 2, 3, 4].map((glyph) => wholeUnit({ glyph }))).toEqual([1, 2, 2, 2]);
    const scene = buildScene(plots(30));
    expect(scene.glyph).toBe(2);
    const posts = signposts(scene, { unit: wholeUnit(scene), hung: [1, 2, 3] });
    for (const post of posts) {
      expect(post.unit).toBe(2);
      expect(post.hang).toBeNull();
      const tag = scene.tags.find((t) => t.slot === post.slot)!;
      // Its digits as big as the tag's.
      expect(post.digits[0].y - post.y).toBe(3 * 2);
      expect(Math.abs(post.rect.x + post.rect.w / 2 - (tag.x + tag.w / 2))).toBeLessThanOrEqual(1);
    }
  });

  it("hangs boards only on the plots asked for", () => {
    const scene = buildScene(plots(8));
    const posts = signposts(scene, { hung: [2, 5] });
    expect(posts.filter((p) => p.hang).map((p) => p.slot)).toEqual([2, 5]);
    expect(posts.map((p) => p.slot)).toEqual(scene.trees.map((t) => t.slot));
  });
});

describe("signpost colours", () => {
  it("keep the painted digits and the board's name readable on the plank in every light (at least 4.5:1)", () => {
    for (const phase of PHASES) {
      expect(contrast(gradeKey("i", phase), gradeKey("b", phase))).toBeGreaterThanOrEqual(4.5);
      const ink = boardInk(phase);
      expect(contrast(hexRgb(ink.ink), hexRgb(ink.face))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("give the DOM board the very wood and paint the canvas draws the plank in", () => {
    for (const phase of PHASES) {
      const data = buildAtlasData(phase, webSprites(), [], gradeRgb);
      const atlas = new FakeImage(data.width, data.height, data.data);
      const post = signpostFor(tree(7, 0, -40), 1, true);
      const img = new FakeImage(40, 40);
      paintSignposts(new FakeContext(img), [post], atlas, data.rects);
      const at = (x: number, y: number) => {
        const i = (y * img.width + x) * 4;
        return `#${[0, 1, 2].map((k) => img.data[i + k].toString(16).padStart(2, "0")).join("")}`;
      };
      const ink = boardInk(phase);
      expect(at(post.x + 1, post.y + 1)).toBe(ink.lip);
      expect(at(post.x + 1, post.y + 2)).toBe(ink.face);
      expect(at(post.x, post.y + 2)).toBe(ink.edge);
      // The first lit pixel of the 7 is painted.
      const d = post.digits[0];
      expect(at(d.x, d.y)).toBe(ink.ink);
    }
  });
});
