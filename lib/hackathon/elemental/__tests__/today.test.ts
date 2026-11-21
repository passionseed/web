import type { DueItem } from "../linear-progress";
import type { PipelineItem } from "../pipeline";
import { asOwner, buildTodayRows, filterTodayRows, unmappedOwnerCount } from "../today";

function item(p: Partial<PipelineItem>): PipelineItem {
  return {
    id: "id",
    event_slug: "elemental-2026",
    kind: "sponsor",
    name: "X",
    organisation: null,
    element: null,
    stage: "talking",
    owner: null,
    amount_thb: null,
    why_fit: null,
    reach: null,
    next_step: null,
    next_step_due: null,
    notes: null,
    position: null,
    in_kind: false,
    stage_changed_at: null,
    last_touched_at: null,
    updated_by: null,
    created_at: "2026-11-20T00:00:00Z",
    updated_at: "2026-11-20T00:00:00Z",
    ...p,
  };
}

const task = (p: Partial<DueItem>): DueItem => ({
  identifier: "HAC-1",
  title: "Post",
  url: "https://linear.app/x/issue/HAC-1",
  dueDate: "2026-11-21",
  owner: null,
  overdue: false,
  ...p,
});

const today = "2026-11-21";

describe("buildTodayRows", () => {
  const rows = buildTodayRows({
    today,
    slipsToCheck: 2,
    items: [
      item({ id: "a", name: "Acme", owner: "Big", next_step: "Send deck", next_step_due: "2026-11-21" }),
      item({ id: "b", name: "Bee", owner: "Kirt", next_step_due: "2026-11-19" }),
      item({ id: "c", name: "Later", owner: "Big", next_step_due: "2026-11-23" }),
      item({ id: "d", name: "Done", owner: "Big", stage: "signed", next_step_due: "2026-11-19" }),
    ],
    tasks: [
      task({ identifier: "HAC-2", title: "Reel", owner: "angpao", dueDate: "2026-11-20", overdue: true }),
      task({ identifier: "HAC-3", title: "Poster", owner: "Someone" }),
    ],
    elementsMissing: ["fire", "air"],
  });

  it("merges every source, slips first, overdue next, voices last", () => {
    expect(rows.map((r) => r.key)).toEqual(["slips", "p-b", "t-HAC-2", "p-a", "t-HAC-3", "voices"]);
    expect(rows[0].title).toBe("2 slips to check");
    expect(rows[0].href).toBe("/admin/hackathon/registrations");
    expect(rows.find((r) => r.key === "p-a")?.title).toBe("Acme: Send deck");
    expect(rows.at(-1)?.title).toBe("No speaker yet: Fire, Air");
  });

  it("maps owners onto the fixed list", () => {
    expect(rows.find((r) => r.key === "t-HAC-2")?.owner).toBe("Angpao");
    expect(rows.find((r) => r.key === "t-HAC-3")?.owner).toBeNull();
  });

  it("keeps the Linear name of an assignee who matches no owner, and counts them", () => {
    expect(rows.find((r) => r.key === "t-HAC-3")?.ownerLabel).toBe("Someone");
    expect(rows.find((r) => r.key === "t-HAC-2")).not.toHaveProperty("ownerLabel");
    expect(unmappedOwnerCount(rows)).toBe(1);
  });

  it("links a follow-up to its card and the voices row to the Speakers tab", () => {
    expect(rows.find((r) => r.key === "p-a")?.href).toBe("#pipeline-item-a");
    expect(rows.find((r) => r.key === "voices")?.href).toBe("#pipeline-kind-speaker");
  });

  it("filters by owner, keeping team rows and hiding unowned ones", () => {
    expect(filterTodayRows(rows, "Big").map((r) => r.key)).toEqual(["slips", "p-a", "voices"]);
    expect(filterTodayRows(rows, "Angpao").map((r) => r.key)).toEqual(["slips", "t-HAC-2", "voices"]);
    expect(filterTodayRows(rows, "all")).toHaveLength(6);
  });

  it("leaves out sources that did not load or have nothing", () => {
    expect(buildTodayRows({ today, slipsToCheck: 0, items: null, tasks: null, elementsMissing: [] })).toEqual([]);
  });
});

describe("asOwner", () => {
  it("matches the fixed owners in any case", () => {
    expect(asOwner(" kirt ")).toBe("Kirt");
    expect(asOwner("Someone")).toBeNull();
    expect(asOwner(null)).toBeNull();
  });
});
