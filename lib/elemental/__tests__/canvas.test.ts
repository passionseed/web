/**
 * Elemental canvas notes (lib/elemental/canvas). The real-Excalidraw round trip
 * runs outside Jest: pnpm exec tsx scripts/elemental/excalidraw-roundtrip.ts.
 */
import * as original from "@/lib/whiteboard/shift-cards";

import fixture from "../canvas/fixtures/shift-test-note.json";
import { isValidIndex, keyBetween, lastIndex } from "../canvas/fracIndex";
import * as copy from "../canvas/geometry";
import {
  buildNote,
  type BuildNoteInput,
  buildTombstone,
  ELEMENTAL_NOTE_KINDS,
  layoutNoteText,
  normalizeNoteText,
  type Note,
  NOTE_COLORS,
  NOTE_FONT_SIZE,
  NOTE_TEXT_MAX,
  noteIds,
  rewriteNote,
} from "../canvas/note";

type Box = copy.Box;
const OWNER = "00000000-0000-4000-8000-000000000001";

/** A seeded generator, so a failing case repeats. */
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => (state = (Math.imul(state, 1103515245) + 12345) >>> 0) / 2 ** 32;
}

/** Zones and frame of a project canvas placed as projectCanvasSkeleton places them (frame at 100, 100). */
function canvas(grow: Partial<Record<original.ShiftCardKind, number>> = {}) {
  const ox = 140;
  const oy = 172;
  const zones = original.canvasZones().map((z) => ({ ...z, height: z.height + (grow[z.kind] ?? 0) }));
  const zoneBox = (kind: original.ShiftCardKind): Box => {
    const z = zones.find((zone) => zone.kind === kind)!;
    return { x: ox + z.x, y: oy + z.y, width: z.width, height: z.height };
  };
  const frame: Box = { x: 100, y: 100, width: 2224 + 80, height: 72 + Math.max(...zones.map((z) => z.y + z.height)) + 40 };
  return { zoneBox, frame };
}

const shape = (el: Record<string, unknown>) =>
  Object.fromEntries(
    Object.keys(el)
      .sort()
      .map((k) => [k, el[k] === null ? "null" : Array.isArray(el[k]) ? "array" : typeof el[k]]),
  );

const inside = (outer: Box, b: Box) => b.x >= outer.x && b.y >= outer.y && b.x + b.width <= outer.x + outer.width && b.y + b.height <= outer.y + outer.height;

/** Adds `n` notes one after another, each placed around the ones before. */
function fill(zone: Box, n: number, base: Partial<BuildNoteInput> = {}): Note[] {
  const notes: Note[] = [];
  let after: string | null = "a5";
  for (let i = 0; i < n; i++) {
    const note = buildNote({
      entryId: `e${i}`,
      kind: "test",
      text: `entry ${i}`,
      frameId: "frame-1",
      zoneBox: zone,
      obstacles: notes.map(([rect]) => rect),
      afterIndex: after,
      ownerId: OWNER,
      now: 1,
      ...base,
    });
    after = note[1].index;
    notes.push(note);
  }
  return notes;
}

const input = (over: Partial<BuildNoteInput> = {}): BuildNoteInput => ({
  entryId: "0b6f1c1e-6c0e-4f57-9d43-0f3c2a9a1b11",
  kind: "test",
  text: "x",
  frameId: "frame-1",
  zoneBox: canvas().zoneBox("test"),
  obstacles: [],
  afterIndex: "a3",
  ownerId: OWNER,
  now: 1_790_000_000_000,
  ...over,
});

describe("the fixture note from the editor", () => {
  const [fixRect, fixText] = fixture.elements as Record<string, unknown>[];
  const [rect, text] = buildNote(input());

  it("has the same fields, of the same types, as a built note", () => {
    expect(shape(rect)).toEqual(shape(fixRect));
    expect(shape(text)).toEqual(shape(fixText));
  });

  it("is styled like the built note", () => {
    for (const key of ["type", "width", "height", "strokeColor", "backgroundColor", "fillStyle", "strokeWidth", "roughness", "roundness", "opacity", "angle"]) {
      expect([key, rect[key as keyof typeof rect]]).toEqual([key, fixRect[key]]);
    }
    for (const key of ["fontSize", "fontFamily", "textAlign", "verticalAlign", "lineHeight", "strokeColor", "roughness", "strokeWidth", "autoResize", "text"]) {
      expect([key, text[key as keyof typeof text]]).toEqual([key, fixText[key]]);
    }
    // Bound text sits 5 px in from its note's top-left, as Excalidraw places it.
    expect(text.x - rect.x).toBe((fixText.x as number) - (fixRect.x as number));
    expect(text.y - rect.y).toBe((fixText.y as number) - (fixRect.y as number));
    expect(text.height).toBe(fixText.height);
  });

  it("carries the editor's authorship keys, plus card and source on the rectangle", () => {
    expect(Object.keys(rect.customData).sort()).toEqual([...Object.keys(fixRect.customData as object), "source"].sort());
    expect(Object.keys(text.customData).sort()).toEqual(Object.keys(fixText.customData as object).sort());
  });
});

describe("keyBetween", () => {
  it("starts at a0 and grows strictly over 1,000 appends", () => {
    const keys: string[] = [];
    let last: string | null = null;
    for (let i = 0; i < 1000; i++) {
      last = keyBetween(last, null);
      keys.push(last);
    }
    expect(keys[0]).toBe("a0");
    expect(keys.slice(0, 3)).toEqual(["a0", "a1", "a2"]);
    for (let i = 1; i < keys.length; i++) expect(keys[i - 1] < keys[i]).toBe(true);
    expect(keys.every(isValidIndex)).toBe(true);
    expect(lastIndex(keys.map((index) => ({ index })))).toBe(keys.at(-1));
  });

  it("finds a key strictly between any two keys", () => {
    const keys: string[] = [];
    let last: string | null = null;
    for (let i = 0; i < 1000; i++) keys.push((last = keyBetween(last, null)));
    const random = seeded(7);
    for (let n = 0; n < 2000; n++) {
      let i = Math.floor(random() * keys.length);
      let j = Math.floor(random() * keys.length);
      if (i === j) continue;
      if (i > j) [i, j] = [j, i];
      const k = keyBetween(keys[i], keys[j]);
      expect(keys[i] < k && k < keys[j]).toBe(true);
      expect(isValidIndex(k)).toBe(true);
    }
  });

  it("keeps splitting the same gap and prepending", () => {
    let lo = "a0";
    const hi = "a1";
    for (let i = 0; i < 200; i++) {
      const k = keyBetween(lo, hi);
      expect(lo < k && k < hi).toBe(true);
      lo = k;
    }
    let first = "a0";
    for (let i = 0; i < 200; i++) {
      const k = keyBetween(null, first);
      expect(k < first).toBe(true);
      first = k;
    }
  });

  it("matches fractional-indexing on known values", () => {
    expect(keyBetween(null, null)).toBe("a0");
    expect(keyBetween("a0", "a1")).toBe("a0V");
    expect(keyBetween("az", null)).toBe("b00");
    expect(keyBetween(null, "a0")).toBe("Zz");
    expect(keyBetween("a0", "a0V")).toBe("a0G");
  });

  it("refuses bad keys and wrong order", () => {
    expect(() => keyBetween("a1", "a0")).toThrow();
    expect(() => keyBetween("a0", "a0")).toThrow();
    expect(() => keyBetween("a10", null)).toThrow();
    expect(() => keyBetween("", null)).toThrow();
    expect(() => keyBetween("a!", null)).toThrow();
    expect(isValidIndex(null)).toBe(false);
    expect(isValidIndex("a0")).toBe(true);
  });

  it("lastIndex reads the board's highest valid index, deleted elements included", () => {
    expect(lastIndex([])).toBeNull();
    expect(lastIndex([{ index: "a1" }, { index: "b0V" }, { index: null }, { index: "zz!" }, { index: "a5" }])).toBe("b0V");
  });
});

describe("buildNote", () => {
  it("is a rectangle and its bound text, indexed after the board, in order", () => {
    const [rect, text] = buildNote(input({ afterIndex: "a3" }));
    expect(rect.type).toBe("rectangle");
    expect(text.type).toBe("text");
    expect(rect.index > "a3").toBe(true);
    expect(text.index > rect.index).toBe(true);
    expect(rect.boundElements).toEqual([{ id: text.id, type: "text" }]);
    expect(text.containerId).toBe(rect.id);
    expect(rect.frameId).toBe("frame-1");
    expect(text.frameId).toBe("frame-1");
    expect(rect.customData).toEqual({ card: "test", source: "tester", createdBy: OWNER, updatedBy: OWNER });
    expect(text.customData).toEqual({ createdBy: OWNER, updatedBy: OWNER });
    expect(rect.version).toBe(1);
    expect(rect.isDeleted).toBe(false);
    expect(buildNote(input({ afterIndex: null }))[0].index).toBe("a0");
  });

  it("gives the same entry the same ids and elements, and another entry other ids", () => {
    const a = buildNote(input());
    const b = buildNote(input());
    expect(a).toEqual(b);
    expect(a.map((el) => el.id)).toEqual(["el-0b6f1c1e-6c0e-4f57-9d43-0f3c2a9a1b11-r", "el-0b6f1c1e-6c0e-4f57-9d43-0f3c2a9a1b11-t"]);
    expect(noteIds("abc")).toEqual({ rect: "el-abc-r", text: "el-abc-t" });
    const c = buildNote(input({ entryId: "other" }));
    expect(c.map((el) => el.id)).toEqual(["el-other-r", "el-other-t"]);
    expect(c[0].seed).not.toBe(a[0].seed);
  });

  it("only ever uses SHIFT card kinds, in SHIFT's colours", () => {
    for (const kind of ELEMENTAL_NOTE_KINDS) {
      expect(original.SHIFT_CARD_KINDS).toContain(kind);
      expect(NOTE_COLORS[kind]).toBe(original.SHIFT_CARDS[kind].color);
      expect(original.SHIFT_CARD_KINDS).toContain(buildNote(input({ kind }))[0].customData.card);
    }
    expect(buildNote(input({ kind: "reference" }))[0].customData.source).toBe("lesson");
    expect(buildNote(input({ kind: "ship" }))[0].customData.source).toBe("handin");
    expect(buildNote(input({ kind: "reference", source: "tester" }))[0].customData.source).toBe("tester");
    expect(() => buildNote(input({ kind: "problem" as never }))).toThrow(/kind/);
    expect(() => buildNote(input({ source: "dm" as never }))).toThrow(/source/);
  });

  it("refuses ids that would break the element id", () => {
    expect(() => buildNote(input({ entryId: "" }))).toThrow(/entryId/);
    expect(() => buildNote(input({ entryId: "a b" }))).toThrow(/entryId/);
    expect(() => buildNote(input({ entryId: "x".repeat(65) }))).toThrow(/entryId/);
    expect(() => buildNote(input({ frameId: "" }))).toThrow(/frameId/);
    expect(() => buildNote(input({ ownerId: "" }))).toThrow(/ownerId/);
  });

  it("puts 12 notes in a zone that has room for them without any overlap", () => {
    // A Test zone grown by one line of notes, as the editor grows a full zone.
    const { zoneBox, frame } = canvas({ test: original.SHIFT_CARD_HEIGHT + 24 });
    const zone = zoneBox("test");
    const rects = fill(zone, 12).map(([rect]) => rect);
    for (let i = 0; i < rects.length; i++) {
      expect(inside(zone, rects[i])).toBe(true);
      expect(inside(frame, rects[i])).toBe(true);
      for (let j = i + 1; j < rects.length; j++) expect(copy.overlaps(rects[i], rects[j])).toBe(false);
    }
  });

  it("past a zone's capacity, stacks notes inside the zone and the frame", () => {
    const { zoneBox, frame } = canvas();
    const zone = zoneBox("test");
    const notes = fill(zone, 12);
    const rects = notes.map(([rect]) => rect);
    // A fresh Test zone holds 4 x 2 notes side by side.
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) expect(copy.overlaps(rects[i], rects[j])).toBe(false);
    for (const [rect, text] of notes) {
      expect(inside(zone, rect)).toBe(true);
      expect(inside(frame, rect)).toBe(true);
      expect(inside(rect, text)).toBe(true);
    }
    // Indices keep growing note after note.
    const indices = notes.flatMap((n) => n.map((el) => el.index));
    for (let i = 1; i < indices.length; i++) expect(indices[i - 1] < indices[i]).toBe(true);
  });

  it("avoids notes already on the canvas", () => {
    const zone = canvas().zoneBox("test");
    const inner = copy.zoneInner(zone);
    const existing = { x: inner.x, y: inner.y, width: 240, height: 200 };
    const [rect] = buildNote(input({ zoneBox: zone, obstacles: [existing] }));
    expect(copy.overlaps(rect, existing)).toBe(false);
    expect(rect.y).toBe(inner.y);
  });
});

describe("note text", () => {
  it("keeps short text at the note's size and font", () => {
    const [rect, text] = buildNote(input({ text: "ลองใช้แล้วชอบ" }));
    expect(text.fontSize).toBe(NOTE_FONT_SIZE);
    expect(rect.height).toBe(original.SHIFT_CARD_HEIGHT);
    expect(text.originalText).toBe("ลองใช้แล้วชอบ");
  });

  it("wraps long lines inside the note, and never starts a line with a Thai mark", () => {
    const layout = layoutNoteText("ทดลองกับคนในหมู่บ้านแล้วเขาบอกว่าใช้งานง่ายมากแต่ตัวหนังสือเล็กไป");
    const lines = layout.text.split("\n");
    expect(lines.length).toBeGreaterThan(1);
    expect(layout.textWidth).toBeLessThanOrEqual(230);
    for (const line of lines) expect(/^[ัิ-ฺ็-๎]/.test(line)).toBe(false);
    expect(lines.join("")).toBe("ทดลองกับคนในหมู่บ้านแล้วเขาบอกว่าใช้งานง่ายมากแต่ตัวหนังสือเล็กไป");
  });

  it("shrinks the font for longer text, then grows the note", () => {
    const medium = layoutNoteText("word ".repeat(50).trim());
    expect(medium.fontSize).toBeLessThan(NOTE_FONT_SIZE);
    expect(medium.rectHeight).toBe(original.SHIFT_CARD_HEIGHT);
    const long = layoutNoteText("word ".repeat(200).trim());
    expect(long.rectHeight).toBeGreaterThan(original.SHIFT_CARD_HEIGHT);
    expect(long.textHeight + 10).toBeLessThanOrEqual(long.rectHeight);
  });

  it("normalises text as Excalidraw keeps it", () => {
    expect(normalizeNoteText("a\r\nb\tc\u0007")).toBe("a\nb c");
    expect(normalizeNoteText("")).toBe(" ");
    expect(Array.from(normalizeNoteText("ก".repeat(NOTE_TEXT_MAX + 5))).length).toBe(NOTE_TEXT_MAX);
  });
});

describe("rewriteNote and buildTombstone", () => {
  const note = buildNote(input({ text: "before" }));

  it("rewrites in place, one version higher", () => {
    const [rect, text] = rewriteNote(note, "after", 5);
    expect([rect.id, text.id]).toEqual([note[0].id, note[1].id]);
    expect([rect.x, rect.y, rect.index, text.index]).toEqual([note[0].x, note[0].y, note[0].index, note[1].index]);
    expect(rect.version).toBe(2);
    expect(text.version).toBe(2);
    expect(text.originalText).toBe("after");
    expect(rect.versionNonce).not.toBe(note[0].versionNonce);
    expect(rect.customData).toEqual(note[0].customData);
    expect(rewriteNote([rect, text], "again", 6)[1].version).toBe(3);
  });

  it("gives two rewrites of the same copy different nonces, and a retry the same note", () => {
    const a = rewriteNote(note, "first edit", 5);
    const b = rewriteNote(note, "second edit", 5);
    expect(a[0].version).toBe(b[0].version);
    expect(a[0].versionNonce).not.toBe(b[0].versionNonce);
    expect(a[1].versionNonce).not.toBe(b[1].versionNonce);
    expect(rewriteNote(note, "first edit", 5)).toEqual(a);
  });

  it("wraps a rewrite to the note's current width", () => {
    const wide: Note = [{ ...note[0], width: 480 }, note[1]];
    const words = "word ".repeat(12).trim();
    const [rect, text] = rewriteNote(wide, words, 5);
    expect(rect.width).toBe(480);
    expect(text.text).toBe(layoutNoteText(words, 480).text);
    expect(text.text.split("\n").length).toBeLessThan(layoutNoteText(words).text.split("\n").length);
  });

  it("deletes with a version bump and nothing else changed", () => {
    const gone = buildTombstone(note[0], 9);
    expect(gone.isDeleted).toBe(true);
    expect(gone.version).toBe(note[0].version + 1);
    expect(gone.updated).toBe(9);
    const { isDeleted: _d, version: _v, versionNonce: _n, updated: _u, ...rest } = gone;
    const { isDeleted: _d2, version: _v2, versionNonce: _n2, updated: _u2, ...before } = note[0];
    expect(rest).toEqual(before);
    expect(buildTombstone(note[1]).isDeleted).toBe(true);
  });
});

describe("geometry parity with lib/whiteboard/shift-cards.ts", () => {
  it("copies the note size and zone padding", () => {
    expect(copy.SHIFT_CARD_WIDTH).toBe(original.SHIFT_CARD_WIDTH);
    expect(copy.SHIFT_CARD_HEIGHT).toBe(original.SHIFT_CARD_HEIGHT);
    expect(copy.ZONE_HEADER).toBe(original.ZONE_HEADER);
    expect(copy.ZONE_PAD).toBe(original.ZONE_PAD);
  });

  it("places notes exactly as the editor does, over 20 random zones", () => {
    const random = seeded(2026);
    const int = (lo: number, hi: number) => lo + Math.floor(random() * (hi - lo));
    for (let n = 0; n < 20; n++) {
      const zone: Box = { x: int(-500, 3000), y: int(-500, 3000), width: int(200, 1600), height: int(150, 1200) };
      const obstacles: Box[] = Array.from({ length: int(0, 14) }, () => ({
        x: zone.x + int(-100, zone.width),
        y: zone.y + int(-100, zone.height),
        width: int(20, 400),
        height: int(20, 400),
      }));
      const count = int(0, 12);
      expect(copy.zoneFreeSlot(zone, obstacles)).toEqual(original.zoneFreeSlot(zone, obstacles));
      expect(copy.zoneSlot(zone, obstacles, count)).toEqual(original.zoneSlot(zone, obstacles, count));
    }
  });

  it("treats the same elements as obstacles", () => {
    const els = [
      { type: "rectangle", x: 0, y: 0, width: 240, height: 200 },
      { type: "rectangle", x: 0, y: 0, width: 240, height: 200, isDeleted: true },
      { type: "rectangle", x: 0, y: 0, width: 1100, height: 544, customData: { zone: "test" } },
      { type: "text", x: 0, y: 0, width: 300, height: 60, customData: { zoneLabel: "test" } },
      { type: "text", x: 0, y: 0, width: 90, height: 40, containerId: "n" },
      { type: "text", x: 0, y: 0, width: 900, height: 25, customData: { canvasHint: true } },
      { type: "frame", x: 0, y: 0, width: 2304, height: 1900 },
      { type: "image", x: 0, y: 0, width: 400, height: 400 },
      { type: "image", x: 0, y: 0, width: 600, height: 600 },
      { type: "arrow", x: 0, y: 0, width: 10, height: 10 },
      { type: "ellipse", x: 0, y: 0, width: 50, height: 50 },
    ];
    for (const el of els) expect([el, copy.isPlacementObstacle(el)]).toEqual([el, original.isPlacementObstacle(el)]);
  });
});
