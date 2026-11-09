import { shiftCardStartText } from "./shift-cards";
import { authorIds, boardToMarkdown, summarizeElements } from "./summary";

const base = { width: 100, height: 40 };
const text = (id: string, x: number, y: number, t: string, extra = {}) => ({ id, type: "text", x, y, ...base, text: t, ...extra });
const box = (id: string, x: number, y: number, w: number, h: number, extra = {}) => ({
  id,
  type: "rectangle",
  x,
  y,
  width: w,
  height: h,
  ...extra,
});

describe("summarizeElements", () => {
  it("puts stickies inside the zone under the title above it", () => {
    const summary = summarizeElements([
      box("zone", 0, 0, 600, 600, { backgroundColor: "#eef" }),
      text("title", 10, -60, "Went well"),
      box("s1", 50, 50, 200, 200, { backgroundColor: "#FFE680" }),
      text("s1-label", 60, 60, "ส่งงานตรงเวลา", { containerId: "s1" }),
      box("s2", 300, 50, 200, 200, { backgroundColor: "#a8d8ff" }),
      text("loose", 900, 900, "Parking lot"),
    ]);
    expect(summary.areas).toEqual([
      {
        id: "zone",
        title: "Went well",
        items: [
          { id: "s1", kind: "sticky", text: "ส่งงานตรงเวลา", color: "Yellow" },
          { id: "s2", kind: "sticky", text: "", color: "Blue" },
        ],
      },
    ]);
    expect(summary.loose).toEqual([{ id: "loose", kind: "text", text: "Parking lot" }]);
  });

  it("uses frame membership and names", () => {
    const summary = summarizeElements([
      { id: "f", type: "frame", x: 0, y: 0, width: 200, height: 200, name: "Ideas" },
      text("t", 5000, 5000, "far away but in the frame", { frameId: "f" }),
    ]);
    expect(summary.areas[0]).toMatchObject({ title: "Ideas", items: [{ text: "far away but in the frame" }] });
  });

  it("lists arrows by the labels at each end and skips deleted elements", () => {
    const summary = summarizeElements([
      text("a", 0, 0, "Problem"),
      text("b", 400, 0, "Idea"),
      { id: "arr", type: "arrow", x: 0, y: 0, ...base, startBinding: { elementId: "a" }, endBinding: { elementId: "b" } },
      text("arr-label", 200, 0, "leads to", { containerId: "arr" }),
      text("gone", 0, 300, "deleted", { isDeleted: true }),
    ]);
    expect(summary.links).toEqual([{ from: "Problem", to: "Idea", label: "leads to" }]);
    expect(summary.loose.map((i) => i.text)).toEqual(["Problem", "Idea"]);
    expect(summary.counts).toEqual({ text: 3, arrow: 1 });
  });
});

describe("boardToMarkdown", () => {
  it("renders areas, arrows and comment threads", () => {
    const md = boardToMarkdown(
      { title: "Retro", owner: "Fang", updatedAt: "2026-10-24 08:00", members: ["Mint"] },
      {
        areas: [{ id: "z", title: "Went well", items: [{ id: "s", kind: "sticky", text: "Demo day", color: "Green" }] }],
        loose: [],
        links: [{ from: "A", to: "B" }],
        counts: { rectangle: 1 },
      },
      [{ author: "Mint", body: "เห็นด้วย", createdAt: "2026-10-24T08:00:00Z", resolved: true, replies: [{ author: "Fang", body: "ok", createdAt: "" }] }],
    );
    expect(md).toContain("## Went well\n- [Green sticky] Demo day");
    expect(md).toContain("- A → B");
    expect(md).toContain("- Mint (2026-10-24) [resolved]: เห็นด้วย\n  - Fang: ok");
  });
});

describe("who wrote what", () => {
  it("credits a note to whoever typed its text, and shows later editors", () => {
    const summary = summarizeElements([
      box("s", 0, 0, 200, 200, { backgroundColor: "#ffe680", customData: { createdBy: "fang", updatedBy: "fang" } }),
      text("s-label", 10, 10, "ทำแบบสอบถาม", { containerId: "s", customData: { createdBy: "mint", updatedBy: "beam" } }),
      text("t", 0, 400, "old text from before tracking"),
    ]);
    expect(authorIds(summary).sort()).toEqual(["beam", "mint"]);
    const md = boardToMarkdown(
      { title: "B", owner: "Fang", updatedAt: "", members: [] },
      summary,
      [],
      new Map([
        ["mint", "Mint"],
        ["beam", "Beam"],
      ]),
    );
    expect(md).toContain("- [Yellow sticky] ทำแบบสอบถาม (by Mint, edited by Beam)");
    expect(md).toContain("- old text from before tracking\n");
  });
});

describe("SHIFT cards and project frames", () => {
  const written = `${shiftCardStartText("problem")}\nนักเรียน ม.5`;

  it("reads typed cards in a project frame, with versions, and leaves unwritten ones empty", () => {
    const summary = summarizeElements([
      { id: "f", type: "frame", x: 0, y: 0, width: 1000, height: 1000, name: "โปรเจกต์ · growa", customData: { project: "p1" } },
      box("c1", 50, 50, 300, 260, {
        frameId: "f",
        customData: {
          card: "problem",
          createdBy: "mint",
          versions: [{ v: 1, text: "old problem", at: "2026-11-09T12:00:00Z", by: "mint", why: "คุยกับพี่เภสัชแล้ว" }],
        },
      }),
      text("c1-label", 60, 60, written, { containerId: "c1", frameId: "f", customData: { createdBy: "mint" } }),
      box("c2", 400, 50, 300, 260, { frameId: "f", customData: { card: "target", example: true } }),
      text("c2-label", 410, 60, shiftCardStartText("target"), { containerId: "c2", frameId: "f" }),
    ]);
    const [area] = summary.areas;
    expect(area).toMatchObject({ title: "โปรเจกต์ · growa", project: "p1" });
    expect(area.items.map((i) => [i.kind, i.card, Boolean(i.text)])).toEqual([
      ["card", "problem", true],
      ["card", "target", false],
    ]);
    expect(authorIds(summary)).toEqual(["mint"]);

    const md = boardToMarkdown({ title: "SHIFT", owner: "Fang", updatedAt: "", members: [] }, summary, [], new Map([["mint", "Mint"]]));
    expect(md).toContain("## [SHIFT project] โปรเจกต์ · growa");
    expect(md).toContain("- [🎯 ปัญหา v1] 🎯 ปัญหา ใครลำบากเรื่องอะไร ตอนไหน เพราะอะไร? นักเรียน ม.5");
    expect(md).toContain("  - v1 2026-11-09 by Mint: old problem (why: คุยกับพี่เภสัชแล้ว)");
    expect(md).toContain("- [👥 กลุ่มเป้าหมาย] (empty)");
  });

  it("names room cards too, and skips the name tag a Library card brings", () => {
    const summary = summarizeElements([
      text("tag", 0, -76, "👋 มาถึงแล้ว", { customData: { cardTitle: "arrive" } }),
      box("r", 0, 0, 220, 220, { backgroundColor: "#ffe680", customData: { card: "arrive" } }),
      text("r-label", 10, 10, "👋 วันนี้อยากทำอะไรให้เสร็จ? ทำหน้าแรก", { containerId: "r" }),
    ]);
    const md = boardToMarkdown({ title: "Room", owner: "Fang", updatedAt: "", members: [] }, summary);
    expect(md).toContain("- [👋 มาถึงแล้ว] 👋 วันนี้อยากทำอะไรให้เสร็จ? ทำหน้าแรก");
    expect(md).not.toContain("\n- 👋 มาถึงแล้ว");
  });
});

describe("SHIFT project canvas", () => {
  it("reads a canvas as one project with a section per zone, without its layout text", () => {
    const summary = summarizeElements([
      { id: "f", type: "frame", x: 0, y: 0, width: 2000, height: 2000, name: "โปรเจกต์ · growa", customData: { project: "p1" } },
      text("hint", 40, 20, "กด + ในช่องเพื่อเพิ่มโน้ต", { frameId: "f", customData: { canvasHint: true } }),
      box("z1", 40, 80, 600, 400, { frameId: "f", customData: { zone: "interview" } }),
      text("z1-t", 60, 100, "🎤 สัมภาษณ์", { frameId: "f", customData: { zoneLabel: "interview" } }),
      box("z2", 700, 80, 300, 400, { frameId: "f", customData: { zone: "daily", day: 2 } }),
      box("n1", 60, 180, 240, 200, { frameId: "f", customData: { card: "interview", createdBy: "mint" } }),
      text("n1-l", 70, 190, "พี่เภสัชบอกว่าคนแก่ถามซ้ำ", { containerId: "n1", frameId: "f" }),
      box("s1", 320, 180, 200, 200, { frameId: "f", backgroundColor: "#ffe680" }),
      text("s1-l", 330, 190, "โน้ตธรรมดาในช่องสัมภาษณ์", { containerId: "s1", frameId: "f" }),
    ]);
    const zones = summary.areas.filter((a) => a.parent === "f");
    expect(zones.map((z) => [z.title, z.zone, z.items.length])).toEqual([
      ["🎤 สัมภาษณ์", "interview", 2],
      ["📅 วันที่ 2", "daily", 0],
    ]);
    const md = boardToMarkdown({ title: "SHIFT", owner: "Fang", updatedAt: "", members: [] }, summary);
    expect(md).toContain("## [SHIFT project] โปรเจกต์ · growa\n\n### 🎤 สัมภาษณ์\n- [🎤 สัมภาษณ์] พี่เภสัชบอกว่าคนแก่ถามซ้ำ");
    expect(md).toContain("- [Yellow sticky] โน้ตธรรมดาในช่องสัมภาษณ์");
    expect(md).toContain("### 📅 วันที่ 2\n(empty)");
    expect(md).not.toContain("กด + ในช่อง");
  });

  it("does not count something lying on a canvas, outside it, as part of the project", () => {
    const summary = summarizeElements([
      { id: "f", type: "frame", x: 0, y: 0, width: 2000, height: 2000, name: "โปรเจกต์", customData: { project: "p1" } },
      box("z1", 40, 80, 600, 400, { frameId: "f", customData: { zone: "interview" } }),
      box("o", 60, 180, 200, 200, { backgroundColor: "#ffe680" }),
      text("o-l", 70, 190, "แปะทับจากข้างนอก", { containerId: "o" }),
    ]);
    expect(summary.areas.find((a) => a.zone === "interview")!.items).toEqual([]);
    expect(summary.loose.map((i) => i.text)).toEqual(["แปะทับจากข้างนอก"]);
  });
});
