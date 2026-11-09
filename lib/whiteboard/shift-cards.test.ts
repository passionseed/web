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
  projectFrameAt,
  projectFrameSkeleton,
  readVersions,
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

  it("starts each card with its header and one question, then room to write", () => {
    expect(shiftCardStartText("interview")).toBe("🎤 สัมภาษณ์\nคุยกับใคร (ไม่ใส่ชื่อจริง) เขาพูดอะไรที่ทำให้แปลกใจ?");
    const label = (shiftCardSkeleton("interview") as { label: { text: string } }).label.text;
    expect(label.endsWith("\n\n")).toBe(true);
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

describe("project frames", () => {
  it("builds a tagged frame holding a problem and a target card", () => {
    const skeletons = projectFrameSkeleton("โปรเจกต์ · Mint", "p1");
    const frame = skeletons.at(-1) as { type: string; name: string; children: string[]; customData: unknown };
    expect(frame.type).toBe("frame");
    expect(frame.name).toBe("โปรเจกต์ · Mint");
    expect(frame.customData).toEqual({ project: "p1" });
    const ids = skeletons.slice(0, -1).map((s) => (s as { id?: string }).id);
    expect(frame.children).toEqual(ids);
  });

  it("gives each new frame its own project id", () => {
    const id = (s: ReturnType<typeof projectFrameSkeleton>) => s.at(-1)?.customData?.project;
    expect(id(projectFrameSkeleton("a"))).not.toBe(id(projectFrameSkeleton("b")));
  });

  it("finds the smallest project frame under a point", () => {
    const outer = { type: "frame", x: 0, y: 0, width: 1000, height: 1000, customData: { project: "outer" } };
    const inner = { type: "frame", x: 100, y: 100, width: 300, height: 300, customData: { project: "inner" } };
    const plain = { type: "frame", x: 120, y: 120, width: 50, height: 50, customData: null };
    const deleted = { ...inner, width: 200, height: 200, isDeleted: true };
    expect(projectFrameAt([outer, inner, plain, deleted], { x: 150, y: 150 })).toBe(inner);
    expect(projectFrameAt([outer, inner], { x: 900, y: 900 })).toBe(outer);
    expect(projectFrameAt([outer], { x: 2000, y: 0 })).toBeNull();
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

describe("card placement", () => {
  const size = { width: 300, height: 260 };
  const at = (x: number, y: number) => ({ x: x - 150, y: y - 130, ...size });

  it("uses the middle when it is free, then fills the row to the right", () => {
    expect(freeSlot([], { x: 0, y: 0 }, size)).toEqual({ x: 0, y: 0 });
    expect(freeSlot([at(0, 0)], { x: 0, y: 0 }, size)).toEqual({ x: 324, y: 0 });
    expect(freeSlot([at(0, 0), at(324, 0)], { x: 0, y: 0 }, size)).toEqual({ x: 648, y: 0 });
  });

  it("stays inside a project frame", () => {
    const frame = { x: -200, y: -200, width: 600, height: 1000 };
    // Right of the middle is outside the frame, so the next slot is the row below.
    expect(freeSlot([at(0, 0)], { x: 0, y: 0 }, size, frame)).toEqual({ x: 0, y: 284 });
  });

  it("ignores zones, frames, card labels and deleted elements", () => {
    expect(isPlacementObstacle({ type: "rectangle", x: 0, y: 0, width: 300, height: 260 })).toBe(true);
    expect(isPlacementObstacle({ type: "text", x: 0, y: 0, width: 600, height: 50 })).toBe(true);
    expect(isPlacementObstacle({ type: "rectangle", x: 0, y: 0, width: 900, height: 900 })).toBe(false);
    expect(isPlacementObstacle({ type: "frame", x: 0, y: 0, width: 300, height: 300 })).toBe(false);
    expect(isPlacementObstacle({ type: "text", x: 0, y: 0, width: 100, height: 40, containerId: "c" })).toBe(false);
    expect(isPlacementObstacle({ type: "rectangle", x: 0, y: 0, width: 300, height: 260, isDeleted: true })).toBe(false);
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
