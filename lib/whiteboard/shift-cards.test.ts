import {
  addVersion,
  answerOf,
  newLines,
  freeSlot,
  isPlacementObstacle,
  hasUnsavedEdit,
  isVersionedCard,
  isWritten,
  MAX_VERSION_TEXT,
  MAX_VERSIONS,
  canvasZones,
  projectCanvasSkeleton,
  zoneFreeSlot,
  zoneSlot,
  readVersions,
  settleVersions,
  SHIFT_CARD_KINDS,
  SHIFT_CARDS,
  shiftCardSkeleton,
  shiftCardStartText,
} from "./shift-cards";
import { CARD_KINDS } from "./cards";

const at = "2026-11-09T12:00:00.000Z";

describe("SHIFT cards", () => {
  it("never shares a kind with the room cards, so attendance ignores them", () => {
    for (const kind of SHIFT_CARD_KINDS) expect((CARD_KINDS as readonly string[]).includes(kind)).toBe(false);
  });

  it("versions beliefs, not events", () => {
    expect(SHIFT_CARD_KINDS.filter(isVersionedCard)).toEqual(["problem", "target", "idea", "ship"]);
  });

  it("uses no em dashes in card copy", () => {
    for (const kind of SHIFT_CARD_KINDS) {
      expect(shiftCardStartText(kind)).not.toContain("—");
      expect(SHIFT_CARDS[kind].title).not.toContain("—");
    }
  });

  it("starts a note empty: its zone says what it is for", () => {
    const blank = (shiftCardSkeleton("interview") as { label: { text: string } }).label.text;
    expect(blank.trim()).toBe("");
    expect(isWritten("interview", blank)).toBe(false);
    expect(isWritten("interview", "พี่เภสัชบอกว่า…")).toBe(true);
    // Cards from before the canvas carried a header and question; those alone are still unwritten.
    expect(isWritten("interview", shiftCardStartText("interview"))).toBe(false);
  });

  it("keeps a note's rounded corner clear of its text", () => {
    // Excalidraw sets a note's text 5px in from the top-left, and rounds an adaptive
    // corner by `roundness.value` (32px when unset) once the note is big enough.
    const PADDING = 5;
    const note = shiftCardSkeleton("interview") as { roundness: { type: number; value?: number }; width: number; height: number };
    const side = Math.min(note.width, note.height);
    const value = note.roundness.value ?? 32;
    const r = side <= value / 0.25 ? side * 0.25 : value;
    // How far the curve reaches in from the left edge at the text's top line.
    const curveInset = r - Math.sqrt(r * r - Math.max(r - PADDING, 0) ** 2);
    expect(PADDING - curveInset).toBeGreaterThanOrEqual(2);
  });

  it("tags each card with its kind, and examples as examples", () => {
    expect(shiftCardSkeleton("interview").customData).toEqual({ card: "interview" });
    expect(shiftCardSkeleton("problem", 0, 0, { example: true }).customData).toEqual({ card: "problem", example: true });
  });

  it("counts a card as written only beyond its prompts", () => {
    const start = shiftCardStartText("problem");
    expect(isWritten("problem", start)).toBe(false);
    expect(isWritten("problem", `${start}\n\n  `)).toBe(false);
    expect(isWritten("problem", "")).toBe(false);
    expect(isWritten("problem", `${start}\nนักเรียน ม.5 ลืมส่งงาน`)).toBe(true);
  });
});

describe("project canvas", () => {
  const els = projectCanvasSkeleton("โปรเจกต์ · Mint", "p1") as unknown as {
    id: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    locked?: boolean;
    name?: string;
    children?: string[];
    customData?: Record<string, unknown>;
  }[];
  const frame = els.at(-1)!;
  const zones = els.filter((e) => e.customData?.zone);

  it("is a tagged frame holding every other element", () => {
    expect(frame).toMatchObject({ type: "frame", name: "โปรเจกต์ · Mint", customData: { project: "p1" } });
    expect(frame.children).toEqual(els.slice(0, -1).map((e) => e.id));
  });

  it("has one locked zone per kind, a Daily cell per day, all inside the frame", () => {
    expect(zones).toHaveLength(8 + 7);
    expect(new Set(zones.map((z) => z.customData!.zone))).toEqual(new Set(SHIFT_CARD_KINDS));
    expect(zones.filter((z) => z.customData!.zone === "daily").map((z) => z.customData!.day)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    for (const z of zones) {
      expect(z.locked).toBe(true);
      expect(z.x).toBeGreaterThan(frame.x);
      expect(z.x + z.width).toBeLessThan(frame.x + frame.width);
      expect(z.y + z.height).toBeLessThan(frame.y + frame.height);
    }
  });

  it("starts each belief zone with one example note, and no zones overlap", () => {
    const notes = els.filter((e) => e.customData?.card);
    expect(notes.map((n) => n.customData!.card)).toEqual(["problem", "target", "idea", "ship"]);
    expect(notes.every((n) => n.customData!.example)).toBe(true);
    const specs = canvasZones();
    for (let i = 0; i < specs.length; i++)
      for (let j = i + 1; j < specs.length; j++) {
        const a = specs[i];
        const b = specs[j];
        expect(a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height).toBe(false);
      }
  });

  it("gives each new canvas its own project id", () => {
    const id = (s: ReturnType<typeof projectCanvasSkeleton>) => s.at(-1)?.customData?.project;
    expect(id(projectCanvasSkeleton("a"))).not.toBe(id(projectCanvasSkeleton("b")));
  });
});

describe("card versions", () => {
  const written = (s: string) => `${shiftCardStartText("problem")}\n${s}`;

  it("saves the first version and numbers the next", () => {
    const v1 = addVersion("problem", { card: "problem", createdBy: "u1" }, { text: written("ม.5"), by: "u1", at })!;
    expect(v1.createdBy).toBe("u1");
    expect(readVersions(v1)).toEqual([{ v: 1, text: written("ม.5"), by: "u1", at }]);

    const v2 = addVersion("problem", v1, { text: written("ม.6"), by: "u2", at, why: "  คุยกับพี่ ม.6 แล้ว  " })!;
    expect(readVersions(v2).map((v) => [v.v, v.by, v.why])).toEqual([
      [1, "u1", undefined],
      [2, "u2", "คุยกับพี่ ม.6 แล้ว"],
    ]);
  });

  it("refuses an unwritten card or unchanged text", () => {
    expect(addVersion("problem", { card: "problem" }, { text: shiftCardStartText("problem"), by: "u1", at })).toBeNull();
    const v1 = addVersion("problem", { card: "problem" }, { text: written("ม.5"), by: "u1", at })!;
    expect(addVersion("problem", v1, { text: `${written("ม.5")}\n`, by: "u1", at })).toBeNull();
  });

  it("drops the example flag once a version is saved", () => {
    const v1 = addVersion("problem", { card: "problem", example: true }, { text: written("ม.5"), by: "u1", at })!;
    expect(v1.example).toBeUndefined();
    expect(v1.card).toBe("problem");
  });

  it("keeps the newest versions without reusing numbers", () => {
    let data: Record<string, unknown> = { card: "idea" };
    for (let i = 1; i <= MAX_VERSIONS + 3; i++) {
      data = addVersion("idea", data, { text: `${shiftCardStartText("idea")}\n${i}`, by: "u1", at })!;
    }
    const versions = readVersions(data);
    expect(versions).toHaveLength(MAX_VERSIONS);
    expect(versions[0].v).toBe(4);
    expect(versions.at(-1)!.v).toBe(MAX_VERSIONS + 3);
  });

  it("treats a card longer than the limit as saved once its kept part is saved", () => {
    const long = `${shiftCardStartText("problem")}\n${"ก".repeat(MAX_VERSION_TEXT)}`;
    const v1 = addVersion("problem", { card: "problem" }, { text: long, by: "u1", at })!;
    expect(readVersions(v1)[0].text).toHaveLength(MAX_VERSION_TEXT);
    expect(hasUnsavedEdit(v1, long)).toBe(false);
  });

  it("ignores malformed versions and flags unsaved edits", () => {
    const data = { versions: [{ v: 1, text: "a", at, by: "u1" }, { v: "2", text: 3 }, null] };
    expect(readVersions(data)).toHaveLength(1);
    expect(readVersions(null)).toEqual([]);
    expect(hasUnsavedEdit(data, "a")).toBe(false);
    expect(hasUnsavedEdit(data, "b")).toBe(true);
    expect(hasUnsavedEdit({}, "b")).toBe(false);
  });
});

describe("settling versions (as Postgres keeps them)", () => {
  const ME = "00000000-0000-4000-8000-000000000001";
  const YOU = "00000000-0000-4000-8000-000000000002";
  const now = Date.parse("2026-11-10T12:00:00.000Z");
  const entry = (v: number, extra: Record<string, unknown> = {}) => ({ v, text: `v${v}`, at: "2026-11-10T11:59:00.000Z", by: ME, ...extra });

  it("leaves elements without versions alone", () => {
    expect(settleVersions({ card: "idea" }, { card: "idea" }, false, ME, now)).toBeUndefined();
    expect(settleVersions(null, undefined, true, ME, now)).toBeUndefined();
  });

  it("adds each number once, in order, and keeps the newest 20", () => {
    const saved = { versions: Array.from({ length: 19 }, (_, i) => entry(i + 1)) };
    const incoming = { versions: [...saved.versions, entry(21), entry(20), entry(20, { text: "again" }), { v: "x" }] };
    const out = settleVersions(saved, incoming, false, ME, now)!;
    expect(out.map((v) => v.v)).toEqual(Array.from({ length: 20 }, (_, i) => i + 2));
    expect(out.find((v) => v.v === 20)?.text).toBe("v20");
  });

  it("stamps new entries on an existing note with the person saving", () => {
    const [, added] = settleVersions({ versions: [entry(1)] }, { versions: [entry(1), entry(2, { by: YOU })] }, false, ME, now)!;
    expect(added).toEqual(entry(2));
  });

  it("ignores version numbers out of range", () => {
    expect(readVersions({ versions: [entry(1_000_001), entry(0), entry(1.5)] })).toEqual([]);
  });
});

describe("card placement", () => {
  const size = { width: 300, height: 260 };
  const at = (x: number, y: number) => ({ x: x - 150, y: y - 130, ...size });

  it("uses the middle when it is free, then fills the row to the right, and says when nothing is free", () => {
    expect(freeSlot([], { x: 0, y: 0 }, size)).toEqual({ x: 0, y: 0 });
    expect(freeSlot([at(0, 0)], { x: 0, y: 0 }, size)).toEqual({ x: 324, y: 0 });
    expect(freeSlot([at(0, 0), at(324, 0)], { x: 0, y: 0 }, size)).toEqual({ x: 648, y: 0 });
    expect(freeSlot([at(0, 0)], { x: 0, y: 0 }, size, at(0, 0))).toBeNull();
  });

  it("stays inside a project frame", () => {
    const frame = { x: -200, y: -200, width: 600, height: 1000 };
    // Right of the middle is outside the frame, so the next slot is the row below.
    expect(freeSlot([at(0, 0)], { x: 0, y: 0 }, size, frame)).toEqual({ x: 0, y: 284 });
  });

  it("fills a zone from its top-left, below its title, and cascades when it is full", () => {
    const zone = { x: 0, y: 0, width: 600, height: 340 };
    expect(zoneSlot(zone, [])).toEqual({ x: 24 + 120, y: 96 + 100 });
    expect(zoneSlot(zone, [{ x: 24, y: 96, width: 240, height: 200 }])).toEqual({ x: 24 + 240 + 24 + 120, y: 196 });
    const full = [
      { x: 24, y: 96, width: 240, height: 200 },
      { x: 288, y: 96, width: 240, height: 200 },
    ];
    expect(zoneSlot(zone, full, 2)).toEqual({ x: 144 + 60, y: 196 + 60 });
  });

  it("ignores zones, frames, card labels and deleted elements", () => {
    expect(isPlacementObstacle({ type: "rectangle", x: 0, y: 0, width: 300, height: 260 })).toBe(true);
    expect(isPlacementObstacle({ type: "text", x: 0, y: 0, width: 600, height: 50 })).toBe(true);
    expect(isPlacementObstacle({ type: "rectangle", x: 0, y: 0, width: 900, height: 900 })).toBe(false);
    expect(isPlacementObstacle({ type: "frame", x: 0, y: 0, width: 300, height: 300 })).toBe(false);
    expect(isPlacementObstacle({ type: "text", x: 0, y: 0, width: 100, height: 40, containerId: "c" })).toBe(false);
    expect(isPlacementObstacle({ type: "rectangle", x: 0, y: 0, width: 300, height: 260, isDeleted: true })).toBe(false);
    expect(isPlacementObstacle({ type: "rectangle", x: 0, y: 0, width: 300, height: 300, customData: { zone: "daily" } })).toBe(false);
    expect(isPlacementObstacle({ type: "text", x: 0, y: 0, width: 200, height: 30, customData: { zoneLabel: "test" } })).toBe(false);
  });
});

describe("version history display", () => {
  it("shows only what the student wrote under the question", () => {
    expect(answerOf("problem", `${shiftCardStartText("problem")}\n\nคนป่วย ซื้อยาไม่สะดวก\n`)).toBe("คนป่วย ซื้อยาไม่สะดวก");
    expect(answerOf("problem", shiftCardStartText("problem"))).toBe("");
    // A student who rewrote the question keeps their whole text.
    expect(answerOf("problem", "ปัญหาของเรา\nคนป่วย")).toBe("ปัญหาของเรา\nคนป่วย");
  });

  it("marks lines that are new since the previous version", () => {
    expect([...newLines("คนป่วย\nซื้อยาไม่สะดวก", "ผู้สูงอายุ\nซื้อยาไม่สะดวก\n\nลืมกินยา")]).toEqual([0, 3]);
    expect(newLines("a", "a").size).toBe(0);
  });
});

describe("zoneFreeSlot", () => {
  // A zone two notes wide and three lines tall: 96 of title, then lines of 200 with 24 between.
  const zone = { x: 0, y: 0, width: 24 + 240 + 24 + 240 + 24, height: 96 + 3 * 200 + 2 * 24 + 12 };
  const at = (x: number, y: number) => ({ x, y, width: 240, height: 200 });

  it("fills a zone line by line, reading from its top-left", () => {
    expect(zoneFreeSlot(zone, [])).toEqual({ x: 24 + 120, y: 96 + 100 });
    expect(zoneFreeSlot(zone, [at(24, 96)])).toEqual({ x: 24 + 264 + 120, y: 96 + 100 });
  });

  it("reaches every line of a zone that has grown, however tall", () => {
    const full = [at(24, 96), at(288, 96), at(24, 320), at(288, 320)];
    expect(zoneFreeSlot(zone, full)).toEqual({ x: 24 + 120, y: 544 + 100 });
  });

  it("says when a zone is full", () => {
    const full = [96, 320, 544].flatMap((y) => [at(24, y), at(288, y)]);
    expect(zoneFreeSlot(zone, full)).toBeNull();
  });
});
