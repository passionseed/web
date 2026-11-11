/**
 * @jest-environment node
 */
import { createHash } from "node:crypto";

import { PNG } from "pngjs";

import { PALETTE, SPRITES } from "../../../assets/island/sprites";
import {
  MAX_WIDTH,
  RenderError,
  SPOTS,
  glyphFor,
  layoutFor,
  plotBoxes,
  plotSpots,
  renderIsland,
  type IslandPlot,
  type PlotBox,
} from "../island/render";
import { I, PENDING_SLOT, SQ, STAGE_NAMES, WIP_CORNER, nextUnlock, pendingSlot, seasonLines, type SeasonView } from "../island/copy";

/** sha256 of the decoded RGBA pixels of renderIsland(plots(6), { markMine, festival }). Update only with a sprite or layout change you meant. */
const PINNED_6 = "c763498f1351ca17485e76264c996dcae5a91bbe38b5fae89192e839e8d426ab";

function plots(n: number): IslandPlot[] {
  return Array.from({ length: n }, (_, k) => ({
    slot: k + 1,
    stage: k % 8,
    visitor: k % 8 >= 3,
    key: k % 5 === 0,
    helper: k % 4 === 0,
    lantern: k % 7 === 0,
    name: null,
    mine: k === 2,
  }));
}

const hash = (b: Buffer) => createHash("sha256").update(b).digest("hex");

describe("sprites", () => {
  it("has every sprite the renderer draws, with rectangular rows and known colours", () => {
    const needed = [
      "water_a", "water_b", "sand", "sand_b", "grass_a", "grass_b", "grass_c", "path", "plaza",
      "shore_n", "shore_s", "shore_e", "shore_w", "visitor", "key_flag", "lantern", "marker", "banner", "well", "boat",
      ...Array.from({ length: 8 }, (_, k) => `stage_${k}`),
    ];
    for (const name of needed) {
      const rows = SPRITES[name];
      expect([name, Array.isArray(rows)]).toEqual([name, true]);
      expect(new Set(rows.map((r) => r.length)).size).toBe(1);
      for (const ch of rows.join("")) if (ch !== ".") expect([name, ch, Boolean(PALETTE[ch])]).toEqual([name, ch, true]);
    }
    // Tree stages share one footprint so they line up on their plots.
    const sizes = new Set(Array.from({ length: 8 }, (_, k) => `${SPRITES[`stage_${k}`][0].length}x${SPRITES[`stage_${k}`].length}`));
    expect(sizes.size).toBe(1);
  });
});

/** Decoded RGBA pixels, so a Node or zlib upgrade cannot change the pinned hash. */
const pixelHash = (png: Buffer) => hash(PNG.sync.read(png).data);

/**
 * Share of a stage-5 tree's opaque pixels found where the slot's spot says,
 * measured from the plaza centre of the island actually drawn. Rows 6 to 25
 * only: number tags (its own below, a neighbour's above) never reach them.
 */
function treeMatch(input: IslandPlot[], slot: number): number {
  const out = renderIsland(input);
  const png = PNG.sync.read(out.png);
  const layout = layoutFor(Math.max(...input.map((p) => p.slot)));
  const s = SPOTS[slot - 1];
  const left = (layout.pcx + s.x) * 16;
  const top = (layout.pcy + s.y + 1) * 16 - 40;
  const rows = SPRITES.stage_5;
  let total = 0;
  let hit = 0;
  rows.slice(6, 26).forEach((row, r) => {
    const j = r + 6;
    [...row].forEach((ch, i) => {
      if (ch === ".") return;
      total++;
      const k = ((top + j) * out.scale * png.width + (left + i) * out.scale) * 4;
      const rgb = `#${[0, 1, 2].map((c) => png.data[k + c].toString(16).padStart(2, "0")).join("")}`;
      if (rgb === PALETTE[ch].toLowerCase().slice(0, 7)) hit++;
    });
  });
  return hit / total;
}

const bare = (n: number) => plots(n).map((p) => ({ ...p, stage: 5, visitor: false, key: false, helper: false, lantern: false, mine: false }));

describe("island renderer", () => {
  it("is deterministic", () => {
    const a = renderIsland(plots(12), { markMine: true, festival: true });
    const b = renderIsland(plots(12), { markMine: true, festival: true });
    expect(hash(a.png)).toBe(hash(b.png));
  });

  it("draws a fixed small map to pinned pixels", () => {
    const out = renderIsland(plots(6), { markMine: true, festival: true });
    expect([out.width, out.height, out.scale]).toEqual([1024, 576, 2]);
    expect(pixelHash(out.png)).toBe(PINNED_6);
  });

  it("produces a valid PNG of the reported size, small enough for Discord", () => {
    for (const n of [1, 12, 50, 120, 200]) {
      const out = renderIsland(plots(n), { scale: 2 });
      const png = PNG.sync.read(out.png);
      expect([n, png.width, png.height]).toEqual([n, out.width, out.height]);
      expect(out.png.length).toBeLessThan(1_000_000);
      expect(out.width).toBeLessThanOrEqual(MAX_WIDTH);
    }
  });

  it("gives every slot one spot and one number, whatever else is on the island", () => {
    // Positions come from the slot alone: never from draw order or plot count.
    for (let n = 1; n < 200; n++) {
      const before = plotSpots(plots(n));
      const after = plotSpots(plots(n + 1));
      for (let slot = 1; slot <= n; slot++) expect(after.get(slot)).toEqual(before.get(slot));
    }
    const shuffled = plots(9).reverse();
    expect(plotSpots(shuffled)).toEqual(plotSpots(plots(9)));
    // Archiving slot 2 leaves a gap: nobody moves or is renumbered.
    const gap = plots(6).filter((p) => p.slot !== 2);
    const out = renderIsland(gap);
    expect([...out.numbers.entries()]).toEqual([1, 3, 4, 5, 6].map((slot) => [slot, slot]));
    for (const p of gap) expect(plotSpots(gap).get(p.slot)).toEqual(SPOTS[p.slot - 1]);
    expect(new Set(SPOTS.map((s) => `${s.x},${s.y}`)).size).toBe(SPOTS.length);
  });

  it("draws every tree at its slot's spot, across growth steps, gaps and any input order", () => {
    // Crosses the first growth steps and the drop from scale 2 to 1.
    for (const n of [4, 7, 11, 16, 28, 38, 48]) {
      for (const slot of [1, Math.ceil(n / 2), n]) {
        expect([n, slot, treeMatch(bare(n), slot) > 0.9]).toEqual([n, slot, true]);
        expect([n, slot, treeMatch(bare(n + 1), slot) > 0.9]).toEqual([n, slot, true]);
      }
    }
    const gap = bare(9).filter((p) => p.slot !== 2 && p.slot !== 5).reverse();
    for (const slot of [1, 3, 9]) expect([slot, treeMatch(gap, slot) > 0.9]).toEqual([slot, true]);
  });

  it("grows a step at a time to fit the plots, never shrinking and never overshooting", () => {
    let prev = 0;
    for (let n = 1; n <= 200; n++) {
      const { cols } = layoutFor(n);
      expect(cols).toBeGreaterThanOrEqual(prev);
      if (prev) expect([n, cols - prev <= 4]).toEqual([n, true]);
      prev = cols;
    }
    // A class of 9 to 12 gets an island close to the base, not one sized for 50.
    expect(layoutFor(12).cols).toBeLessThan(layoutFor(50).cols * 0.8);
    expect(renderIsland(plots(90)).numbers.size).toBe(90);
  });

  it("keeps plot numbers readable in Discord's inline preview", () => {
    // About 550 px wide: a 5-pixel-tall digit must stay at least 5 px tall there.
    for (let n = 1; n <= 200; n++) {
      const { cols } = layoutFor(n);
      expect([n, (5 * glyphFor(cols) * 550) / (cols * 16) >= 5]).toEqual([n, true]);
    }
  });

  it("never draws a helper path over water", () => {
    const path = SPRITES.path;
    const pathPx = (png: PNG, tx: number, ty: number, scale: number) => {
      for (let j = 0; j < 16; j++) {
        for (let i = 0; i < 16; i++) {
          const hex = PALETTE[path[j][i]];
          if (!hex) continue;
          const k = ((ty * 16 + j) * scale * png.width + (tx * 16 + i) * scale) * 4;
          const rgb = [png.data[k], png.data[k + 1], png.data[k + 2]].map((v) => v.toString(16).padStart(2, "0")).join("");
          if (`#${rgb}`.toLowerCase() !== hex.toLowerCase().slice(0, 7)) return false;
        }
      }
      return true;
    };
    let seen = 0;
    for (const n of [5, 9, 13, 18, 19, 25, 40]) {
      const all = plots(n).map((p) => ({ ...p, helper: true, key: false, visitor: false, lantern: false }));
      const out = renderIsland(all);
      const png = PNG.sync.read(out.png);
      const layout = layoutFor(n);
      for (let ty = 0; ty < layout.rows; ty++) {
        for (let tx = 0; tx < layout.cols; tx++) {
          if (!pathPx(png, tx, ty, out.scale)) continue;
          seen++;
          expect([n, tx, ty, layout.land[ty][tx]]).toEqual([n, tx, ty, true]);
        }
      }
    }
    expect(seen).toBeGreaterThan(20);
  });

  it("draws a plain plot as an empty slot, whatever stage or decorations it carries", () => {
    const empty = plots(6).map((p) => (p.slot === 4 ? { ...p, stage: 0, visitor: false, key: false, helper: false, lantern: false } : p));
    const plain = plots(6).map((p) => (p.slot === 4 ? { ...p, stage: 5, visitor: true, key: true, helper: true, lantern: true, plain: true } : p));
    expect(hash(renderIsland(plain).png)).toBe(hash(renderIsland(empty).png));
    expect(hash(renderIsland(plain).png)).not.toBe(hash(renderIsland(plots(6)).png));
  });

  it("marks only the caller's plot when asked", () => {
    const marked = renderIsland(plots(6), { markMine: true });
    const plain = renderIsland(plots(6), { markMine: false });
    expect(hash(marked.png)).not.toBe(hash(plain.png));
  });

  it("fails with a typed error, never student text", () => {
    const named = plots(3).map((p) => ({ ...p, name: "ความลับของนักเรียน" }));
    const bad = (input: IslandPlot[]) => {
      try {
        renderIsland(input);
      } catch (error) {
        return error as RenderError;
      }
      throw new Error("expected a render error");
    };
    expect(bad([...named, { ...named[0] }])).toMatchObject({ code: "bad_plot", detail: "slot 1" });
    expect(bad([{ ...named[0], slot: 0 }])).toMatchObject({ code: "bad_plot" });
    expect(bad([{ ...named[0], slot: SPOTS.length + 1 }])).toMatchObject({ code: "too_large" });
    expect(bad(plots(201))).toMatchObject({ code: "too_large" });
    const boat = SPRITES.boat;
    delete SPRITES.boat;
    try {
      const error = bad(named);
      expect(error).toBeInstanceOf(RenderError);
      expect(error).toMatchObject({ code: "missing_sprite", detail: "boat" });
      expect(error.message).not.toContain("ความลับ");
    } finally {
      SPRITES.boat = boat;
    }
  });
});

describe("plot boxes", () => {
  /** Decoded scale-1 render: one image pixel per native pixel. */
  const native = (input: IslandPlot[], options: { markMine?: boolean; festival?: boolean } = {}) => {
    const out = renderIsland(input, { ...options, scale: 1 });
    expect(out.scale).toBe(1);
    return PNG.sync.read(out.png);
  };
  /** Pixels (x, y) where two same-sized renders differ. */
  const diff = (a: PNG, b: PNG) => {
    expect([a.width, a.height]).toEqual([b.width, b.height]);
    const out: [number, number][] = [];
    for (let k = 0; k < a.data.length; k += 4) {
      if (a.data[k] !== b.data[k] || a.data[k + 1] !== b.data[k + 1] || a.data[k + 2] !== b.data[k + 2]) {
        const i = k / 4;
        out.push([i % a.width, Math.floor(i / a.width)]);
      }
    }
    return out;
  };
  const inside = (box: PlotBox, [x, y]: [number, number]) =>
    x >= box.left && x < box.left + box.width && y >= box.top && y < box.top + box.height;
  /** First sprite row with a visible pixel. */
  const inkTop = (name: string) => SPRITES[name].findIndex((row) => /[^. ]/.test(row));

  it("matches the size of the scale-1 picture, smallest island included", () => {
    for (const n of [0, 1, 6, 12, 38, 50, 120, 200]) {
      const out = renderIsland(plots(n), { scale: 1 });
      const boxes = plotBoxes(plots(n));
      expect([n, boxes.width, boxes.height]).toEqual([n, out.width, out.height]);
      expect(boxes.boxes.map((b) => b.slot)).toEqual(plots(n).map((p) => p.slot));
    }
  });

  it("keeps every box inside the image, covering the tree sprite and its number tag", () => {
    const wrong: string[] = [];
    for (let n = 1; n <= 200; n++) {
      const { width, height, boxes } = plotBoxes(plots(n));
      const layout = layoutFor(n);
      const glyph = glyphFor(layout.cols);
      for (const box of boxes) {
        const at = `n=${n} slot=${box.slot}`;
        if (box.left < 0 || box.top < 0 || box.left + box.width > width || box.top + box.height > height) wrong.push(`${at} outside`);
        // The tree's 32 x 40 sprite stands on its spot, and the tag hangs 9 glyphs below it.
        const s = SPOTS[box.slot - 1];
        const treeLeft = (layout.pcx + s.x) * 16;
        const treeTop = (layout.pcy + s.y + 1) * 16 - 40;
        if (box.top !== treeTop || box.top + box.height !== treeTop + 40 + 9 * glyph) wrong.push(`${at} rows`);
        if (box.left > treeLeft || box.left + box.width < treeLeft + 32) wrong.push(`${at} columns`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it("holds every pixel its plot draws, tag included, at any island size", () => {
    for (const n of [3, 9, 16, 38, 48]) {
      const all = bare(n).map((p) => ({ ...p, stage: p.slot % 8 }));
      const { boxes } = plotBoxes(all);
      for (const slot of [1, Math.ceil(n / 2), n - 1]) {
        // Same highest slot, so the same island: only this plot's pixels change.
        const without = native(all.filter((p) => p.slot !== slot));
        const changed = diff(native(all), without);
        const box = boxes.find((b) => b.slot === slot)!;
        expect([n, slot, changed.length > 100]).toEqual([n, slot, true]);
        expect([n, slot, changed.filter((px) => !inside(box, px))]).toEqual([n, slot, []]);
        // The tag's bottom row is the box's bottom row.
        expect([n, slot, Math.max(...changed.map(([, y]) => y))]).toEqual([n, slot, box.top + box.height - 1]);
      }
    }
  });

  it("puts the caller's marker over the middle of their box, above the tree", () => {
    for (const stage of [0, 3, 7]) {
      const input = bare(9).map((p) => (p.slot === 5 ? { ...p, stage, mine: true } : p));
      const box = plotBoxes(input).boxes.find((b) => b.slot === 5)!;
      const pin = diff(native(input, { markMine: true }), native(input, { markMine: false }));
      expect(pin.length).toBeGreaterThan(10);
      const xs = pin.map(([x]) => x);
      const centre = (Math.min(...xs) + Math.max(...xs) + 1) / 2;
      expect(Math.abs(centre - (box.left + box.width / 2))).toBeLessThanOrEqual(1);
      expect(Math.max(...pin.map(([, y]) => y))).toBeLessThan(box.top + inkTop(`stage_${stage}`));
    }
  });

  it("does not depend on input order, and places plain plots like the picture does", () => {
    const input = plots(14);
    expect(plotBoxes([...input].reverse())).toEqual(plotBoxes(input));
    const plain = input.map((p) => (p.slot === 4 ? { ...p, plain: true } : p));
    expect(plotBoxes(plain)).toEqual(plotBoxes(input));
    const gap = input.filter((p) => p.slot !== 2);
    expect(plotBoxes(gap).boxes).toEqual(plotBoxes(input).boxes.filter((b) => b.slot !== 2));
  });

  it("fails with the renderer's typed errors", () => {
    const fail = (input: IslandPlot[]) => {
      try {
        plotBoxes(input);
      } catch (error) {
        expect(error).toBeInstanceOf(RenderError);
        return (error as RenderError).code;
      }
      throw new Error("expected a render error");
    };
    const [one] = plots(1);
    expect(fail([one, { ...one }])).toBe("bad_plot");
    expect(fail([{ ...one, slot: 0 }])).toBe("bad_plot");
    expect(fail([{ ...one, slot: 1.5 }])).toBe("bad_plot");
    expect(fail([{ ...one, stage: Number.NaN }])).toBe("bad_plot");
    expect(fail([{ ...one, slot: SPOTS.length + 1 }])).toBe("too_large");
    expect(fail(plots(201))).toBe("too_large");
  });
});

describe("island copy", () => {
  it("names all eight stages", () => {
    expect(STAGE_NAMES).toHaveLength(8);
  });

  it("states the season as a date and a bar, never a rank", () => {
    const lines = seasonLines(
      {
        name: "Season 1",
        demo_day: "2027-05-15",
        days_to_demo: 30,
        table_bar: 2,
        stage_bar: 3,
        stage_at_cutoff: 1,
        qualifies: null,
        goal: { milestone: 3, target: 30, count: 12, deadline: "2027-04-15", unlock: "ลานกลางเปิดไฟ", reached: false },
        unlocks: [{ id: "u", label: "สติกเกอร์", milestone_count: 2, deadline: "2027-03-01", earned: false }],
      },
      "ให้ความจริงทำให้คุณแปลกใจ"
    ).join("\n");
    expect(lines).toContain("อีก 30 วัน");
    expect(lines).toContain("12/30");
    expect(lines).not.toMatch(/อันดับ|rank/i);
    expect(lines).not.toContain("—");
  });

  const season = (over: Partial<SeasonView> = {}): SeasonView => ({
    name: "Season 1",
    demo_day: "2027-05-15",
    days_to_demo: 30, // today in Bangkok: 2027-04-15
    table_bar: 2,
    stage_bar: 3,
    stage_at_cutoff: 1,
    qualifies: null,
    goal: null,
    unlocks: [],
    ...over,
  });
  const unlock = (id: string, deadline: string, milestone_count: number, earned = false, live?: boolean) => ({
    id,
    label: `ของ ${id}`,
    milestone_count,
    deadline,
    earned,
    ...(live === undefined ? {} : { live }),
  });

  it("aims at the earliest unlock still open, never a missed or earned one", () => {
    const s = season({
      unlocks: [unlock("missed", "2027-02-05", 2), unlock("got", "2027-03-01", 1, true), unlock("pin", "2027-06-01", 3), unlock("soon", "2027-04-15", 4)],
    });
    expect(nextUnlock(s)?.id).toBe("soon"); // due today still counts
    const text = seasonLines(s, null).join("\n");
    expect(text).toContain("ปลดล็อกแล้ว: ของ got");
    expect(text).not.toContain("ของ missed");
    expect(text).toContain("ของ soon");
    expect(nextUnlock(season({ unlocks: [unlock("missed", "2027-02-05", 2)] }))).toBeUndefined();
    // The database's own flag wins when it sends one.
    expect(nextUnlock(season({ unlocks: [unlock("x", "2027-12-01", 2, false, false), unlock("y", "2027-12-02", 2)] }))?.id).toBe("y");
  });

  it("follows the database's expired flag for an unlock", () => {
    const u = { ...unlock("late", "2027-12-01", 2), expired: true };
    expect(nextUnlock(season({ unlocks: [u, unlock("open", "2027-12-02", 3)] }))?.id).toBe("open");
    expect(nextUnlock(season({ unlocks: [{ ...unlock("past", "2027-01-01", 2), expired: false }] }))?.id).toBe("past");
  });

  it("asks for milestone 2 before a table and milestone 3 before a stage slot, whatever the bars", () => {
    const titles = (n: number) => ({ 2: "ทำให้มันมีอยู่จริง", 3: "ให้ความจริงทำให้คุณแปลกใจ" })[n] ?? null;
    // The bar of 1 is met by milestone 1, but a table needs milestone 2.
    const below = seasonLines(season({ table_bar: 1, stage_bar: 2, stage_at_cutoff: 1, season_milestones: [1] }), null, titles).join("\n");
    expect(below).toContain('อีก 1 ขั้น ได้โต๊ะโชว์งานใน Demo Day (ต้องมีขั้น "ทำให้มันมีอยู่จริง" ด้วย)');
    // Short of the bar by two, milestone 2 among them.
    expect(seasonLines(season({ table_bar: 3, stage_at_cutoff: 1, season_milestones: [1] }), null, titles).join("\n")).toContain("อีก 2 ขั้น ได้โต๊ะ");
    // A table, and the stage bar of 2 met, but a stage slot needs milestone 3.
    const table = seasonLines(season({ table_bar: 1, stage_bar: 2, stage_at_cutoff: 2, season_milestones: [1, 2], qualifies: "table" }), null, titles).join("\n");
    expect(table).toContain('✅ ได้โต๊ะโชว์งานแล้ว อีก 1 ขั้นได้ขึ้นเวที (ต้องมีขั้น "ให้ความจริงทำให้คุณแปลกใจ" ด้วย)');
    // Milestone 3 already counted: just the shortfall, no hint.
    const near = seasonLines(season({ stage_at_cutoff: 2, season_milestones: [2, 3], qualifies: "table" }), null, titles).join("\n");
    expect(near).toContain("✅ ได้โต๊ะโชว์งานแล้ว อีก 1 ขั้นได้ขึ้นเวที");
    expect(near).not.toContain("ต้องมีขั้น");
  });

  it("says a slot that rests on work a mentor has not decided yet is waiting for the mentor", () => {
    // Below the bars on approved work, at the table bar with the work already sent (also after the cutoff).
    for (const days_to_demo of [10, -2]) {
      const text = seasonLines(
        season({ days_to_demo, stage_at_cutoff: 1, season_milestones: [1], qualifies: null, stage_with_pending: 2, qualifies_with_pending: "table" }),
        null
      ).join("\n");
      expect(text).toContain(PENDING_SLOT.table);
      expect(text).toContain("รอพี่เลี้ยงยืนยัน");
      expect(text).not.toContain("✅");
    }
    // A confirmed table, and the stage once pending work is confirmed.
    const stage = seasonLines(season({ stage_at_cutoff: 2, season_milestones: [1, 2], qualifies: "table", qualifies_with_pending: "stage" }), null).join("\n");
    expect(stage).toContain("✅ ได้โต๊ะโชว์งานใน Demo Day แล้ว");
    expect(stage).toContain(PENDING_SLOT.stage);
    // Pending work that changes nothing says nothing.
    for (const s of [
      season({ qualifies: "table", qualifies_with_pending: "table", stage_at_cutoff: 2 }),
      season({ qualifies: "stage", qualifies_with_pending: "stage", stage_at_cutoff: 3 }),
      season({ qualifies: null, qualifies_with_pending: null }),
      season({ qualifies: null }),
    ]) {
      expect(pendingSlot(s)).toBeNull();
      expect(seasonLines(s, null).join("\n")).not.toContain("รอพี่เลี้ยงยืนยัน");
    }
    for (const text of Object.values(PENDING_SLOT)) expect(text).not.toMatch(/—|อันดับ/);
  });

  it("tells builders below the bars about the open work-in-progress corner", () => {
    expect(seasonLines(season(), null)).toContain(WIP_CORNER);
    expect(seasonLines(season({ qualifies: "table", stage_at_cutoff: 2 }), null)).not.toContain(WIP_CORNER);
    expect(seasonLines(season({ qualifies: "stage", stage_at_cutoff: 3 }), null)).not.toContain(WIP_CORNER);
    expect(WIP_CORNER).not.toMatch(/อันดับ|—/);
  });

  it("never promises growth for a repeat, and calls squads สควอด, not ทีม", () => {
    expect(I.sentRepeat).not.toContain("โต");
    expect(I.sent).toContain("โต");
    for (const text of Object.values(SQ)) {
      const value = typeof text === "function" ? (text as (x: never) => string)("x" as never) : text;
      expect([value, value.includes("ทีม")]).toEqual([value, false]);
    }
    // Squad invites live 3 days (the plan), and the copy says so.
    expect(SQ.invited("x")).toContain("3 วัน");
    // The tester-privacy hint is a ban, and fits a placeholder.
    expect(I.proofHint.startsWith("ห้าม")).toBe(true);
    expect(I.proofHint.length).toBeLessThanOrEqual(100);
  });
});
