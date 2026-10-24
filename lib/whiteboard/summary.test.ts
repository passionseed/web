import { boardToMarkdown, summarizeElements } from "./summary";

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
