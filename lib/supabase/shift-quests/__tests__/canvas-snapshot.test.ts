/** @jest-environment node */
import { questGuideSpec, type GuideSpec, type PickableNote } from "@/lib/shift-island/quest-canvas";
import { accessOf } from "@/lib/whiteboard/canvas-access";
import { canvasItems, summarizeElements } from "@/lib/whiteboard/summary";

import {
  BOARD_OWNER,
  canvasElements,
  EDITOR,
  noise,
  OUTSIDER,
  OWNER,
  type NoteSpec,
} from "../__fixtures__/canvas-board";
import {
  buildContext,
  buildSnapshot,
  canvasNotes,
  fnv1a53,
  frameElements,
  liveFrame,
  noteHash,
  pickNotes,
  piiFlags,
  verifyLink,
  type SnapshotNote,
} from "../canvas-snapshot";

const link = { frame_id: "frame-1", canvas_project: "proj-1" };
const board = (elements: unknown[], owner = BOARD_OWNER) => ({ owner_id: owner, elements });

describe("verifyLink", () => {
  const canvas = canvasElements({ notes: [] });

  it.each([
    ["the canvas owner, a board member", board(canvas), true, OWNER, "ok"],
    ["the canvas owner who owns the board", board(canvas, OWNER), false, OWNER, "ok"],
    ["a teammate (editor)", board(canvas), true, EDITOR, "ok"],
    ["a board member not on the canvas team", board(canvas), true, OUTSIDER, "not_yours"],
    ["a removed editor", board(canvasElements({ editors: [] })), true, EDITOR, "not_yours"],
    [
      "the old owner after a hand-over (not kept on the team)",
      board(canvasElements({ owner: EDITOR, editors: [] })),
      true,
      OWNER,
      "not_yours",
    ],
    ["the new owner after a hand-over", board(canvasElements({ owner: EDITOR, editors: [] })), true, EDITOR, "ok"],
    ["the board owner who is only a moderator", board(canvas, BOARD_OWNER), false, BOARD_OWNER, "not_yours"],
    [
      "a duplicated board: its owner moderates the copy but is not on the canvas",
      board(canvasElements({ owner: OWNER, editors: [] }), OUTSIDER),
      false,
      OUTSIDER,
      "not_yours",
    ],
    ["a legacy canvas owned through createdBy only", board(canvasElements({ legacy: true })), true, OWNER, "ok"],
    ["someone on the canvas team who is not on the board", board(canvas), false, EDITOR, "not_yours"],
    ["a deleted canvas", board(canvasElements({ deleted: true })), true, OWNER, "gone"],
    ["a re-tagged canvas", board(canvasElements({ project: "proj-2" })), true, OWNER, "retagged"],
  ] as const)("%s: %s", (_label, b, isMember, userId, expected) => {
    expect(verifyLink({ board: b, isMember, userId, link })).toBe(expected);
  });

  it("is gone without a board, or without that frame", () => {
    expect(verifyLink({ board: null, isMember: true, userId: OWNER, link })).toBe("gone");
    expect(verifyLink({ board: board(canvas), isMember: true, userId: OWNER, link: { ...link, frame_id: "nope" } })).toBe("gone");
  });

  it("is gone when the frame is no longer a canvas (its project tag removed)", () => {
    const plain = canvasElements({}).map((e) => (e.id === "frame-1" ? { ...e, customData: { owner: OWNER } } : e));
    expect(verifyLink({ board: board(plain), isMember: true, userId: OWNER, link })).toBe("gone");
  });

  it("never lets an empty user id through", () => {
    expect(verifyLink({ board: board(canvas, ""), isMember: true, userId: "", link })).toBe("not_yours");
  });
});

const NOTES: NoteSpec[] = [
  {
    id: "n-problem",
    kind: "problem",
    text: "นักเรียน ม.5 ไม่มีเวลาอ่านหนังสือ\nเพราะเรียนพิเศษทุกวัน",
    by: OWNER,
    versions: [
      { v: 1, text: "อ่านหนังสือไม่ทัน" },
      { v: 2, text: "นักเรียน ม.5 ไม่มีเวลาอ่านหนังสือ", why: "คุยกับเพื่อนแล้วเจอว่าเรื่องเวลาสำคัญกว่า" },
    ],
  },
  { id: "n-target", kind: "target", text: "นักเรียน ม.5 ที่เรียนพิเศษ", by: EDITOR, versions: [{ v: 1, text: "นักเรียน ม.5 ที่เรียนพิเศษ" }] },
  { id: "n-int-1", kind: "interview", text: "คุยกับเพื่อนห้องข้างๆ", by: OWNER, updated: 2000 },
  { id: "n-int-2", kind: "interview", text: "โทรหาเขาที่ 081-234-5678", by: EDITOR, updated: 3000 },
  { id: "n-int-plain", kind: "interview", text: "สังเกตในห้องสมุด", by: OWNER, plain: true, updated: 2500 },
  { id: "n-idea", kind: "idea", text: "แอปจดตารางอ่านหนังสือ", by: OWNER, versions: [{ v: 1, text: "แอปจดตาราง" }, { v: 2, text: "แอปจดตารางอ่าน", why: "เพื่อนอยากเห็นเวลาว่าง" }, { v: 3, text: "แอปจดตารางอ่านหนังสือ", why: "เพิ่มเตือน" }] },
  { id: "n-test", kind: "test", text: "ให้เพื่อน 3 คนลอง", by: BOARD_OWNER },
  { id: "n-daily", kind: "daily", day: 3, text: "ทำหน้าแรกเสร็จ", by: OWNER },
  { id: "n-bare", kind: "reference", text: "แอปคู่แข่ง A", by: OWNER, bare: true },
  { id: "n-empty", kind: "ship", text: " ", by: OWNER },
  { id: "n-deleted", kind: "pivot", text: "ลบไปแล้ว", by: OWNER, deleted: true },
];

const elements = [...noise(), ...canvasElements({ notes: NOTES }), ...canvasElements({ frameId: "frame-2", x: 4000, owner: OUTSIDER, editors: [], project: "proj-x", notes: [{ id: "other-1", kind: "problem", text: "โน้ตของคนอื่น", by: OUTSIDER }] })];
const access = accessOf(liveFrame(elements, "frame-1")!);

describe("frameElements", () => {
  it("summarizes the canvas exactly as the full board does", () => {
    const full = summarizeElements(elements);
    const cut = frameElements(elements, "frame-1");
    const part = summarizeElements(cut);
    expect(canvasItems(part, "frame-1")).toEqual(canvasItems(full, "frame-1"));
    const canvasAreas = (s: typeof full) => s.areas.filter((a) => a.id === "frame-1" || a.parent === "frame-1");
    expect(canvasAreas(part)).toEqual(canvasAreas(full));
  });

  it("keeps the frame, what is in it and the text bound to that, and nothing else", () => {
    const ids = new Set(frameElements(elements, "frame-1").map((e) => e.id));
    expect(ids.has("frame-1")).toBe(true);
    expect(ids.has("frame-1-zone-0")).toBe(true);
    expect(ids.has("n-problem-text")).toBe(true);
    for (const outside of ["frame-2", "other-1", "other-1-text", "on-top", "on-top-text", "loose-1", "arrow-1", "n-deleted", "gone-1"]) {
      expect(ids.has(outside)).toBe(false);
    }
  });
});

describe("buildContext", () => {
  const cut = frameElements(elements, "frame-1");
  const summary = summarizeElements(cut);
  const context = (slug: string, kind: "main" | "side" = "main") =>
    buildContext(questGuideSpec({ kind, slug }), summary, cut, "frame-1", access);

  it("quest 1: problem and target notes, interviews counted, hints from notes", () => {
    const { context: rows, hints, notes } = context("find-something-worth-fixing");
    expect(rows).toEqual([
      { kind: "problem", label: "ปัญหาตอนนี้", text: "นักเรียน ม.5 ไม่มีเวลาอ่านหนังสือ\nเพราะเรียนพิเศษทุกวัน", version: 2, count: null },
      { kind: "target", label: "คนที่เจอ", text: "นักเรียน ม.5 ที่เรียนพิเศษ", version: 1, count: null },
      { kind: "interview", label: "สัมภาษณ์", text: null, version: null, count: 3 },
    ]);
    expect(hints).toEqual([
      { id: "m1-problem", hinted: true, detail: null },
      { id: "m1-target", hinted: true, detail: null },
      { id: "m1-talked", hinted: true, detail: "สัมภาษณ์ 3 ใบ" },
    ]);
    // Reading order within a zone: left to right.
    expect(notes.map((n) => n.id)).toEqual(["n-problem", "n-target", "n-int-1", "n-int-2", "n-int-plain"]);
  });

  it("reads each note's own text, versions (newest first) and team, and flags contact details", () => {
    const { notes } = context("find-something-worth-fixing");
    const problem = notes.find((n) => n.id === "n-problem")!;
    expect(problem).toEqual({
      id: "n-problem",
      kind: "problem",
      day: null,
      zoneTitle: "🎯 ปัญหา",
      text: "นักเรียน ม.5 ไม่มีเวลาอ่านหนังสือ\nเพราะเรียนพิเศษทุกวัน",
      version: 2,
      editedSinceVersion: true,
      history: [
        { v: 2, why: "คุยกับเพื่อนแล้วเจอว่าเรื่องเวลาสำคัญกว่า" },
        { v: 1, why: null },
      ],
      byTeam: true,
      pii: false,
      hash: noteHash(2, "นักเรียน ม.5 ไม่มีเวลาอ่านหนังสือ\nเพราะเรียนพิเศษทุกวัน"),
    });
    expect(notes.find((n) => n.id === "n-target")!.editedSinceVersion).toBe(false);
    expect(notes.find((n) => n.id === "n-int-2")!.pii).toBe(true);
    expect(notes.find((n) => n.id === "n-int-plain")!.version).toBeNull();
  });

  it("never sends ids of people, version authors or anything outside the canvas", () => {
    const all = JSON.stringify([
      context("find-something-worth-fixing"),
      context("let-reality-surprise-you"),
      context("side-demo-three-minutes", "side"),
    ]);
    for (const secret of [OWNER, EDITOR, OUTSIDER, BOARD_OWNER, "2026-11-10T10:00", "โน้ตของคนอื่น", "วางทับไว้เฉยๆ", "ข้อความนอกแคนวาส", "ลบไปแล้ว"]) {
      expect(all).not.toContain(secret);
    }
  });

  it("quest 2: idea vN and the empty ship note, decision item never hinted", () => {
    const { context: rows, hints, notes } = context("make-it-exist");
    expect(rows.map((r) => [r.label, r.text, r.version])).toEqual([
      ["ปัญหาที่แก้", expect.stringContaining("ไม่มีเวลา"), 2],
      ["ไอเดีย", "แอปจดตารางอ่านหนังสือ", 3],
      ["ปล่อยแล้ว", null, null],
    ]);
    expect(hints.map((h) => [h.id, h.hinted])).toEqual([
      ["m2-idea", true],
      ["m2-ship", false],
      ["m2-why", false],
    ]);
    expect(notes.map((n) => n.id)).toEqual(["n-idea"]);
    expect(notes[0].history).toEqual([
      { v: 3, why: "เพิ่มเตือน" },
      { v: 2, why: "เพื่อนอยากเห็นเวลาว่าง" },
      { v: 1, why: null },
    ]);
  });

  it("quest 3: a test note from outside the team, and an idea at v3 counts as a change", () => {
    const { context: rows, hints, notes } = context("let-reality-surprise-you");
    expect(rows.map((r) => [r.label, r.count])).toEqual([
      ["ลองกับ", null],
      ["สิ่งที่จะให้ลอง", null],
      ["ทดสอบ", 1],
    ]);
    expect(hints).toEqual([
      { id: "m3-tested", hinted: true, detail: "ทดสอบ 1 ใบ" },
      { id: "m3-surprise", hinted: false, detail: null },
      { id: "m3-change", hinted: true, detail: "ไอเดีย v3" },
    ]);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ id: "n-test", kind: "test", byTeam: false });
  });

  it("quest 4: the latest test, no pivots yet", () => {
    const { context: rows, hints } = context("give-them-a-reason-to-return");
    expect(rows.map((r) => [r.label, r.text, r.count])).toEqual([
      ["งานตอนนี้", null, null],
      ["ผลทดสอบล่าสุด", "ให้เพื่อน 3 คนลอง", null],
      ["เปลี่ยนแผน", null, 0],
    ]);
    expect(hints.map((h) => h.hinted)).toEqual([false, true, false]);
  });

  it("picks the zone's note changed last for a note row", () => {
    const { context: rows } = buildContext(
      { zones: ["interview"], context: [{ zone: "interview", label: "x", show: "note" }], checklist: [], examples: [] },
      summary,
      cut,
      "frame-1",
      access,
    );
    expect(rows[0].text).toBe("โทรหาเขาที่ 081-234-5678");
  });

  it("side quests list each zone's latest note and no checklist", () => {
    const { context: rows, hints, notes } = context("side-five-voices", "side");
    expect(rows.map((r) => [r.kind, r.label])).toEqual([
      ["interview", "สัมภาษณ์"],
      ["target", "กลุ่มเป้าหมาย"],
    ]);
    expect(hints).toEqual([]);
    expect(notes.map((n) => n.kind)).toEqual(["target", "interview", "interview", "interview"]);
  });

  it("quests without zones get nothing to pick", () => {
    const empty: GuideSpec = questGuideSpec({ kind: "main", slug: "take-the-keys" });
    expect(buildContext(empty, summary, cut, "frame-1", access)).toEqual({
      context: [],
      hints: [{ id: "m5-checked", hinted: false, detail: null }, { id: "m5-open", hinted: false, detail: null }, { id: "m5-secrets", hinted: false, detail: null }],
      notes: [],
    });
  });

  it("reads bare text and daily cells with their day", () => {
    const all = canvasNotes(summary, cut, "frame-1", access);
    expect(all.find((n) => n.id === "n-bare")).toMatchObject({ kind: "reference", text: "แอปคู่แข่ง A", version: null, editedSinceVersion: false });
    expect(all.find((n) => n.id === "n-daily")).toMatchObject({ kind: "daily", day: 3, zoneTitle: "📅 วันที่ 3" });
    expect(all.some((n) => n.id === "n-empty" || n.id === "n-deleted")).toBe(false);
  });

  it("gives the same notes from the whole board as from the canvas alone", () => {
    const full = summarizeElements(elements);
    expect(canvasNotes(full, elements, "frame-1", access)).toEqual(canvasNotes(summary, cut, "frame-1", access));
  });

  it("strips an unchanged card header from old cards", () => {
    const old = canvasElements({ notes: [{ id: "old", kind: "test", text: "🧪 ทดสอบ\nอยากรู้อะไร ให้ใครลอง ผลเป็นยังไง?\nลองกับ 2 คน", by: OWNER }] });
    const s = summarizeElements(old);
    expect(canvasNotes(s, old, "frame-1", accessOf(liveFrame(old, "frame-1")!))[0].text).toBe("ลองกับ 2 คน");
  });
});

describe("noteHash", () => {
  it("is FNV-1a 64 cut to 53 bits, in hex", () => {
    expect(fnv1a53("")).toBe("129ce484222325");
    expect(fnv1a53("a")).toBe("3dc4c8601ec8c");
    expect(fnv1a53("foobar")).toBe("144171f73967e8");
  });

  it("is stable and changes with the version or the text", () => {
    const h = noteHash(2, "ข้อความ");
    expect(noteHash(2, "ข้อความ")).toBe(h);
    expect(h).toMatch(/^[0-9a-f]{1,16}$/);
    expect(noteHash(3, "ข้อความ")).not.toBe(h);
    expect(noteHash(2, "ข้อความ ")).not.toBe(h);
    expect(noteHash(null, "x")).toBe(noteHash(0, "x"));
  });
});

const note = (over: Partial<SnapshotNote> = {}): SnapshotNote => ({
  kind: "test",
  day: null,
  text: "ลองกับเพื่อน 3 คน",
  version: null,
  history: [],
  byTeam: true,
  ...over,
});
const points = (s: string) => Array.from(s).length;

describe("buildSnapshot", () => {
  it("writes the card: title, then notes in zone order with headers and reasons", () => {
    const snap = buildSnapshot("  Lamp\nproject ", [
      note({ kind: "test", text: " ลองกับเพื่อน 3 คน " }),
      note({ kind: "idea", text: "แอปจดตาราง", version: 3, byTeam: false, history: [{ v: 3, why: "เพิ่มเตือน" }, { v: 2, why: "เพื่อนอยากเห็นเวลา" }, { v: 1, why: null }] }),
      note({ kind: "daily", day: 2, text: "ทำหน้าแรก" }),
    ]);
    expect(snap).toEqual({
      text: [
        "การ์ดเควสต์จากแคนวาส: Lamp project",
        "",
        "💡 ไอเดีย v3 (โน้ตจากคนนอกทีม)",
        "แอปจดตาราง",
        "v1 → v2 เปลี่ยนเพราะ: เพื่อนอยากเห็นเวลา",
        "v2 → v3 เปลี่ยนเพราะ: เพิ่มเตือน",
        "",
        "🧪 ทดสอบ",
        "ลองกับเพื่อน 3 คน",
        "",
        "📅 วันที่ 2",
        "ทำหน้าแรก",
      ].join("\n"),
      cut: false,
      length: expect.any(Number),
      blocks: expect.any(Array),
    });
    expect(snap.length).toBe(points(snap.text));
  });

  it("hands the preview the same notes as blocks, so the tiles and the stored text cannot drift apart", () => {
    const snap = buildSnapshot("Lamp", [
      note({ kind: "test", text: "ลองกับเพื่อน 3 คน" }),
      note({ kind: "idea", text: "แอปจดตาราง", version: 3, history: [{ v: 3, why: "เพิ่มเตือน" }, { v: 2, why: null }] }),
    ]);
    expect(snap.blocks).toEqual([
      { kind: "idea", day: null, header: "💡 ไอเดีย v3", body: "แอปจดตาราง", whys: ["v2 → v3 เปลี่ยนเพราะ: เพิ่มเตือน"] },
      { kind: "test", day: null, header: "🧪 ทดสอบ", body: "ลองกับเพื่อน 3 คน", whys: [] },
    ]);
    for (const block of snap.blocks) expect(snap.text).toContain([block.header, block.body, ...block.whys].join("\n"));
  });

  it("says when the stored words were edited after the newest saved version", () => {
    const snap = buildSnapshot("Lamp", [note({ kind: "idea", text: "แก้แล้ว", version: 3, editedSinceVersion: true })]);
    expect(snap.text).toContain("💡 ไอเดีย v3 (แก้หลัง v3)\nแก้แล้ว");
  });

  it("is deterministic and never carries ids", () => {
    const notes = [note({ kind: "pivot" }), note({ kind: "problem", version: 1 })];
    expect(buildSnapshot("A", notes)).toEqual(buildSnapshot("A", notes));
    expect(buildSnapshot("A", notes).text).not.toMatch(/n-|frame|[0-9a-f]{8}-/);
  });

  it("cuts long notes to the budget with the marker and stays within 2000 code points", () => {
    const long = "ก".repeat(900);
    const snap = buildSnapshot("A", Array.from({ length: 8 }, (_, i) => note({ kind: "interview", text: `${i}${long}` })));
    expect(snap.cut).toBe(true);
    expect(snap.length).toBeLessThanOrEqual(2000);
    expect(snap.text).toContain("…(ตัด)");
    // min(400, floor((2000 - overhead) / 8)) per note.
    const bodies = snap.text.split("\n\n").slice(1).map((b) => b.split("\n")[1]);
    for (const body of bodies) expect(points(body)).toBeLessThanOrEqual(400);
  });

  it("gives a single note at most 400 characters", () => {
    const snap = buildSnapshot("A", [note({ text: "ข".repeat(1000) })]);
    const body = snap.text.split("\n")[3];
    expect(points(body)).toBe(400);
    expect(body.endsWith("…(ตัด)")).toBe(true);
    expect(snap.cut).toBe(true);
  });

  it("counts code points, not UTF-16 units", () => {
    const emoji = "😀".repeat(390);
    const snap = buildSnapshot("A", [note({ text: emoji })]);
    expect(snap.cut).toBe(false);
    expect(snap.length).toBe(points(snap.text));
    expect(snap.text.length).toBeGreaterThan(snap.length);
  });

  it("keeps at most two reason lines and cuts each reason to 140", () => {
    const why = "ร".repeat(300);
    const snap = buildSnapshot("A", [
      note({ kind: "idea", version: 4, history: [{ v: 4, why }, { v: 3, why: "สาม" }, { v: 2, why: "สอง" }] }),
    ]);
    const reasons = snap.text.split("\n").filter((l) => l.includes("เปลี่ยนเพราะ"));
    expect(reasons).toEqual(["v2 → v3 เปลี่ยนเพราะ: สาม", `v3 → v4 เปลี่ยนเพราะ: ${"ร".repeat(140)}`]);
  });

  it("drops reason lines before it squeezes the notes too far", () => {
    const why = "ร".repeat(140);
    const notes = Array.from({ length: 8 }, () =>
      note({ kind: "idea", version: 3, text: "ส".repeat(500), history: [{ v: 3, why }, { v: 2, why }] }),
    );
    const snap = buildSnapshot("A", notes);
    expect(snap.length).toBeLessThanOrEqual(2000);
    expect(snap.cut).toBe(true);
    const body = snap.text.split("\n\n")[1].split("\n")[1];
    expect(points(body)).toBeGreaterThanOrEqual(60);
  });

  it("names an untitled canvas and cuts a long title to 80", () => {
    expect(buildSnapshot("   ", []).text).toBe("การ์ดเควสต์จากแคนวาส: ไม่มีชื่อ");
    expect(points(buildSnapshot("ช".repeat(200), []).text)).toBe(points("การ์ดเควสต์จากแคนวาส: ") + 80);
  });

  it("orders the picked notes the canvas's way, whatever order they were ticked in", () => {
    const notes = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(pickNotes(notes, ["c", "a"]).map((n) => n.id)).toEqual(["a", "c"]);
  });

  it("is the text the server stores for the notes the composer shows", () => {
    const cut = frameElements(elements, "frame-1");
    const summary = summarizeElements(cut);
    const { notes } = buildContext(questGuideSpec({ kind: "main", slug: "find-something-worth-fixing" }), summary, cut, "frame-1", access);
    const fromComposer = buildSnapshot("Lamp project", pickNotes(notes, ["n-int-2", "n-problem"]));
    const server: PickableNote[] = canvasNotes(summarizeElements(elements), elements, "frame-1", access);
    expect(buildSnapshot("Lamp project", pickNotes(server, ["n-problem", "n-int-2"]))).toEqual(fromComposer);
  });
});

describe("piiFlags", () => {
  it.each([
    "โทร 0812345678",
    "เบอร์ 081-234-5678",
    "เบอร์ 081 234 5678",
    "09 1234 5678 ได้เลย",
    "+66 81 234 5678",
    "+66812345678",
    "อีเมล mint.k@example.co.th",
    "ไลน์ somchai99",
    "ไลน์: @somchai",
    "Line: mint_k",
    "line id mint.k",
    "ID: mint1234",
    "ทักไอจี @mint.studio",
    "@mint_k ช่วยลองให้",
    // Handles written the way Thai teens share them, without "@".
    "น้องมิ้นท์ ไอจี mint.k ลองแล้วงง",
    "ไอจี mint.k",
    "ig: mint.k",
    "IG mint_k99",
    "fb: Mint Kanya",
    "เฟสบุ๊ก mint.kanya",
    "tiktok: mintk",
    "ติ๊กต็อก mintk",
    // Thai digits and landlines.
    "๐๘๑ ๒๓๔ ๕๖๗๘",
    "เบอร์ 02-123-4567",
  ])("flags %s", (text) => {
    expect(piiFlags(text)).toBe(true);
  });

  it.each([
    "ทดสอบกับเพื่อน 5 คน",
    "v2 เปลี่ยนเพราะราคาแพง",
    "ราคา 80 บาท",
    "วันที่ 2026-11-14",
    "เวอร์ชัน 0.8.1",
    "idea: ทำแอปจดตาราง",
    "ทำ line chart ให้ดูง่าย",
    "online 3 วัน",
    "ไอเดียใหม่",
    "นักเรียน ม.5 สองคน",
    "08:30 เริ่มทดสอบ",
    "big idea ทำให้ง่ายขึ้น",
    "แก้ config file แล้ว",
    "ทดสอบ 02-11-2026",
    "อายุ ๑๕ ปี",
    "ไอเดีย ig ยังไม่ชัด",
  ])("does not flag %s", (text) => {
    expect(piiFlags(text)).toBe(false);
  });
});
