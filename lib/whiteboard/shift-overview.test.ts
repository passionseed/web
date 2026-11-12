import { progressOf, shiftCanvasesOf } from "./shift-overview";
import { canvasToMarkdown, summarizeElements } from "./summary";

const MINT = "11111111-1111-4111-8111-111111111111";
const PLOY = "22222222-2222-4222-8222-222222222222";
const TON = "33333333-3333-4333-8333-333333333333";

const text = (id: string, x: number, y: number, t: string, extra = {}) => ({ id, type: "text", x, y, width: 100, height: 40, text: t, ...extra });
const box = (id: string, x: number, y: number, w: number, h: number, extra = {}) => ({
  id,
  type: "rectangle",
  x,
  y,
  width: w,
  height: h,
  ...extra,
});
const version = (v: number, t: string) => ({ v, text: t, at: "2026-11-09T10:00:00.000Z", by: MINT });

/** Two canvases side by side: Mint's (with Ploy on the team) and Ton's, plus a plain frame. */
function board() {
  return [
    {
      id: "fa",
      type: "frame",
      x: 0,
      y: 0,
      width: 2000,
      height: 2000,
      name: "โปรเจกต์ · Mint",
      updated: 100,
      customData: { project: "pa", owner: MINT, editors: [PLOY] },
    },
    box("za-problem", 40, 80, 600, 400, { frameId: "fa", customData: { zone: "problem" } }),
    box("za-interview", 700, 80, 600, 400, { frameId: "fa", customData: { zone: "interview" } }),
    box("za-pivot", 1300, 80, 600, 400, { frameId: "fa", customData: { zone: "pivot" } }),
    box("za-d1", 40, 600, 300, 300, { frameId: "fa", customData: { zone: "daily", day: 1 } }),
    box("za-d2", 400, 600, 300, 300, { frameId: "fa", customData: { zone: "daily", day: 2 } }),
    box("pa1", 60, 180, 240, 200, {
      frameId: "fa",
      updated: 200,
      customData: { card: "problem", createdBy: MINT, versions: [version(1, "คนแก่ลืมกินยา"), version(2, "คนแก่ลืมกินยามื้อเย็น")] },
    }),
    text("pa1-l", 70, 190, "คนแก่ลืมกินยามื้อเย็น", { containerId: "pa1", frameId: "fa", updated: 900 }),
    box("ia1", 720, 180, 240, 200, { frameId: "fa", updated: 300, customData: { card: "interview", createdBy: PLOY } }),
    text("ia1-l", 730, 190, "พี่เภสัชบอกว่าคนแก่ถามซ้ำ", { containerId: "ia1", frameId: "fa" }),
    // An empty starter note does not count as written.
    box("ia2", 980, 180, 240, 200, { frameId: "fa", customData: { card: "interview" } }),
    text("ia2-l", 990, 190, " ", { containerId: "ia2", frameId: "fa" }),
    box("pv1", 1320, 180, 240, 200, { frameId: "fa", customData: { card: "pivot", createdBy: MINT } }),
    text("pv1-l", 1330, 190, "เปลี่ยนไปทำแจ้งเตือนมื้อเย็น", { containerId: "pv1", frameId: "fa" }),
    { id: "arrow", type: "arrow", x: 960, y: 280, width: 360, height: 0, startBinding: { elementId: "ia1" }, endBinding: { elementId: "pv1" } },
    box("da1", 60, 680, 240, 200, { frameId: "fa", customData: { card: "daily", createdBy: MINT } }),
    text("da1-l", 70, 690, "สัมภาษณ์ 3 คน", { containerId: "da1", frameId: "fa" }),

    { id: "fb", type: "frame", x: 3000, y: 0, width: 2000, height: 2000, name: "โปรเจกต์ · Ton", updated: 50, customData: { project: "pb", owner: TON } },
    box("zb-idea", 3040, 80, 600, 400, { frameId: "fb", customData: { zone: "idea" } }),
    box("ib1", 3060, 180, 240, 200, { frameId: "fb", customData: { card: "idea", createdBy: TON } }),
    text("ib1-l", 3070, 190, "แอปจับคู่ติวเตอร์", { containerId: "ib1", frameId: "fb" }),

    { id: "plain", type: "frame", x: 6000, y: 0, width: 500, height: 500, name: "Brainstorm" },
    { id: "gone", type: "frame", x: 7000, y: 0, width: 500, height: 500, name: "Deleted canvas", isDeleted: true, customData: { project: "pc", owner: TON } },
  ];
}

describe("shiftCanvasesOf", () => {
  const elements = board();
  const summary = summarizeElements(elements);
  const [mint, ton, ...rest] = shiftCanvasesOf(elements, summary);

  it("lists each live canvas once, with its owner and team, and skips plain and deleted frames", () => {
    expect(rest).toEqual([]);
    expect(mint).toMatchObject({ frameId: "fa", project: "pa", title: "โปรเจกต์ · Mint", owner: MINT, editors: [PLOY] });
    expect(ton).toMatchObject({ frameId: "fb", project: "pb", owner: TON, editors: [] });
  });

  it("counts written notes and saved versions on each canvas only", () => {
    expect(mint.notes).toBe(4);
    expect(mint.versions).toBe(2);
    expect(ton.notes).toBe(1);
    expect(ton.versions).toBe(0);
  });

  it("dates a canvas by its latest change, including typing inside a note", () => {
    expect(mint.lastEdited).toBe(900);
    expect(ton.lastEdited).toBe(50);
  });

  it("sums a canvas's progress by zone", () => {
    expect(mint.zones.find((z) => z.kind === "daily" && z.day === 2)).toMatchObject({ notes: 0, title: "📅 วันที่ 2" });
    expect(progressOf(mint.zones)).toEqual({
      beliefs: [
        { kind: "problem", written: true },
        { kind: "target", written: false },
        { kind: "idea", written: false },
        { kind: "ship", written: false },
      ],
      interviews: 1,
      references: 0,
      tests: 0,
      pivots: 1,
      daysLogged: 1,
      days: 2,
    });
  });
});

describe("canvasToMarkdown", () => {
  const summary = summarizeElements(board());
  const names = new Map([
    [MINT, "Mint"],
    [PLOY, "Ploy"],
  ]);
  const meta = { board: "SHIFT[3] Room A", owner: "Mint", team: ["Ploy"], updatedAt: "2026-11-09 10:00" };

  it("reads one canvas: its header, zones, notes with authors and versions, and its own arrows", () => {
    const md = canvasToMarkdown(summary, "fa", meta, [], names)!;
    expect(md).toContain("# โปรเจกต์ · Mint\n\nBoard: SHIFT[3] Room A · Owner: Mint · Team: Ploy · Updated: 2026-11-09 10:00");
    expect(md).toContain("## 🎤 สัมภาษณ์\n- [🎤 สัมภาษณ์] พี่เภสัชบอกว่าคนแก่ถามซ้ำ (by Ploy)");
    expect(md).toContain("  - v2 2026-11-09 by Mint: คนแก่ลืมกินยามื้อเย็น");
    expect(md).toContain("## Arrows\n- พี่เภสัชบอกว่าคนแก่ถามซ้ำ → เปลี่ยนไปทำแจ้งเตือนมื้อเย็น");
    expect(md).not.toContain("แอปจับคู่ติวเตอร์");
  });

  it("leaves out arrows that belong to another canvas", () => {
    const md = canvasToMarkdown(summary, "fb", { ...meta, owner: "Ton", team: [] }, [], names)!;
    expect(md).toContain("Team: nobody yet");
    expect(md).toContain("แอปจับคู่ติวเตอร์");
    expect(md).not.toContain("## Arrows");
  });

  it("includes the comment threads pinned on the canvas", () => {
    const md = canvasToMarkdown(summary, "fa", meta, [
      { author: "Fang", body: "สัมภาษณ์เพิ่มอีก 2 คน", createdAt: "2026-11-09T12:00:00Z", resolved: false, replies: [{ author: "Mint", body: "ได้ครับ", createdAt: "2026-11-09T13:00:00Z" }] },
    ])!;
    expect(md).toContain("## Comments\n- Fang (2026-11-09): สัมภาษณ์เพิ่มอีก 2 คน\n  - Mint: ได้ครับ");
  });

  it("returns null for a frame that is not a live canvas", () => {
    expect(canvasToMarkdown(summary, "plain", meta)).toBeNull();
    expect(canvasToMarkdown(summary, "gone", meta)).toBeNull();
    expect(canvasToMarkdown(summary, "nope", meta)).toBeNull();
  });
});
