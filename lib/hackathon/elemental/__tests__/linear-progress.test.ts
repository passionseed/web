import { aggregateTasks, linearTeamUrl, ownerName, parseOwnerNames, type LinearIssue } from "../linear-progress";

let n = 0;
function issue(partial: Partial<LinearIssue> & { identifier: string }): LinearIssue {
  n += 1;
  return {
    title: `Task ${n}`,
    url: `https://linear.app/x/issue/${partial.identifier}`,
    state: { name: "Todo", type: "unstarted" },
    dueDate: null,
    priority: 0,
    assignee: null,
    parent: null,
    completedAt: null,
    ...partial,
  };
}

const done = { name: "Done", type: "completed" };
const a = { id: "u1", displayName: "alpha" };
const b = { id: "u2", displayName: "bravo@example.org" };

const fixture: LinearIssue[] = [
  issue({ identifier: "HAC-1", title: "Promotion", assignee: a, dueDate: "2026-12-03" }),
  issue({ identifier: "HAC-2", parent: { identifier: "HAC-1" }, assignee: a, state: done }),
  issue({ identifier: "HAC-3", parent: { identifier: "HAC-1" }, assignee: b, dueDate: "2026-11-20" }),
  issue({ identifier: "HAC-4", parent: { identifier: "HAC-3" }, assignee: b, state: done }),
  issue({ identifier: "HAC-5", title: "Sponsors", assignee: b, dueDate: "2026-11-26" }),
  issue({ identifier: "HAC-6", parent: { identifier: "HAC-5" }, dueDate: "2026-11-21", priority: 1 }),
  issue({ identifier: "HAC-7", parent: { identifier: "HAC-5" }, dueDate: "2026-11-23", assignee: a }),
  issue({ identifier: "HAC-8", title: "Venue check", state: done }),
  issue({ identifier: "HAC-9", parent: { identifier: "HAC-99" }, dueDate: "2026-11-22", assignee: a }),
  issue({ identifier: "HAC-10", state: { name: "Canceled", type: "canceled" }, assignee: a }),
];

describe("aggregateTasks", () => {
  const today = "2026-11-21";
  const p = aggregateTasks(fixture, today, { alpha: "Al" });

  it("counts done over total, leaving canceled issues out", () => {
    expect(p.overall).toEqual({ done: 3, total: 9 });
  });

  it("rolls every sub-issue up to its top-level operation", () => {
    const byId = Object.fromEntries(p.operations.map((o) => [o.identifier, o]));
    expect(byId["HAC-1"]).toMatchObject({ title: "Promotion", done: 2, total: 3, single: false, owner: "Al", pastDue: false });
    expect(byId["HAC-5"]).toMatchObject({ done: 0, total: 2, owner: "bravo", pastDue: false });
    // No sub-issues: the operation counts itself.
    expect(byId["HAC-8"]).toMatchObject({ done: 1, total: 1, single: true });
    // A parent we don't have makes the issue its own operation.
    expect(byId["HAC-9"]).toMatchObject({ done: 0, total: 1 });
    // Sorted by due date, undated last.
    expect(p.operations.map((o) => o.identifier)).toEqual(["HAC-9", "HAC-5", "HAC-1", "HAC-8"]);
  });

  it("lists today and overdue, then the next 48 hours, on Bangkok dates", () => {
    expect(p.todayAndOverdue.map((i) => [i.identifier, i.overdue])).toEqual([
      ["HAC-3", true],
      ["HAC-6", false],
    ]);
    expect(p.next48h.map((i) => i.identifier)).toEqual(["HAC-9", "HAC-7"]);
    expect(p.todayAndOverdue[1].owner).toBeNull();
  });

  it("keeps Linear user ids out of the output", () => {
    expect(JSON.stringify(p)).not.toMatch(/"u1"|"u2"/);
  });

  it("flags an operation past its due date and not finished", () => {
    const later = aggregateTasks(fixture, "2026-11-27");
    const byId = Object.fromEntries(later.operations.map((o) => [o.identifier, o]));
    expect(byId["HAC-5"].pastDue).toBe(true);
    expect(byId["HAC-1"].pastDue).toBe(false);
    // Finished operations are never past due.
    const doneOp = aggregateTasks(
      [issue({ identifier: "HAC-50", dueDate: "2026-11-01", state: done })],
      "2026-11-27",
    );
    expect(doneOp.operations[0].pastDue).toBe(false);
  });

  it("counts open issues with no due date instead of dropping them", () => {
    // Every open issue in the fixture has a date, so the fixture counts 0;
    // two open undated issues (one top-level, one sub-issue) count 2.
    const extra = aggregateTasks(
      [
        ...fixture,
        issue({ identifier: "HAC-20" }),
        issue({ identifier: "HAC-21", parent: { identifier: "HAC-1" } }),
        issue({ identifier: "HAC-22", state: done }),
      ],
      today,
    );
    expect(extra.noDueDate - p.noDueDate).toBe(2);
    expect(p.noDueDate).toBe(0);
  });

  it("lays out the promotion posts as day cells", () => {
    const posts = aggregateTasks(
      [
        issue({ identifier: "HAC-30", title: "Promotion posts" }),
        issue({ identifier: "HAC-31", parent: { identifier: "HAC-30" }, dueDate: "2026-11-20", state: done }),
        issue({ identifier: "HAC-32", parent: { identifier: "HAC-30" }, dueDate: "2026-11-20" }),
        issue({ identifier: "HAC-33", parent: { identifier: "HAC-30" }, dueDate: "2026-11-21" }),
        issue({ identifier: "HAC-34", parent: { identifier: "HAC-30" }, dueDate: "2026-11-23" }),
        issue({ identifier: "HAC-35", parent: { identifier: "HAC-30" } }),
        issue({ identifier: "HAC-36", parent: { identifier: "HAC-34" }, dueDate: "2026-11-22" }),
        issue({ identifier: "HAC-40", title: "Venue", dueDate: "2026-11-22" }),
      ],
      today,
    ).promotionPosts;
    expect(posts.map((x) => [x.identifier, x.state])).toEqual([
      ["HAC-31", "done"],
      ["HAC-32", "missed"],
      ["HAC-33", "today"],
      ["HAC-36", "upcoming"],
      ["HAC-34", "upcoming"],
    ]);
  });

  it("has no post cells when there is no promotion operation", () => {
    expect(aggregateTasks([issue({ identifier: "HAC-1", title: "Venue" })], today).promotionPosts).toEqual([]);
  });

  it("never outputs an email address anywhere", () => {
    expect(JSON.stringify(p)).not.toMatch(/@/);
  });

  it("is empty for no issues", () => {
    expect(aggregateTasks([], today)).toEqual({
      overall: { done: 0, total: 0 },
      operations: [],
      promotionPosts: [],
      todayAndOverdue: [],
      next48h: [],
      noDueDate: 0,
    });
  });
});

describe("linearTeamUrl", () => {
  it("builds the team's list from an issue link", () => {
    expect(linearTeamUrl("https://linear.app/acme/issue/HAC-1/x", "HAC")).toBe("https://linear.app/acme/team/HAC/all");
    expect(linearTeamUrl(undefined, "HAC")).toBeNull();
    expect(linearTeamUrl("https://evil.example/acme/issue/HAC-1", "HAC")).toBeNull();
  });
});

describe("ownerName", () => {
  it("uses the short name from the map", () => {
    expect(ownerName("alpha", { alpha: "Al" })).toBe("Al");
  });

  it("cuts an email-like display name at the @", () => {
    expect(ownerName("someone@example.com")).toBe("someone");
    expect(ownerName("  first.last@school.ac.th ")).toBe("first.last");
  });

  it("never returns an email, even when the map holds one", () => {
    expect(ownerName("x", { x: "leak@example.com" })).toBe("leak");
    expect(ownerName("@example.com")).toBe("Someone");
    expect(ownerName(null)).toBe("Someone");
    for (const out of [ownerName("a@b.c"), ownerName("q", { q: "r@s.t" })]) expect(out).not.toContain("@");
  });
});

describe("parseOwnerNames", () => {
  it("reads a flat JSON map and ignores anything else", () => {
    expect(parseOwnerNames('{"alpha":"Al","n":3,"e":" "}')).toEqual({ alpha: "Al" });
    expect(parseOwnerNames("not json")).toEqual({});
    expect(parseOwnerNames("[1,2]")).toEqual({});
    expect(parseOwnerNames(undefined)).toEqual({});
  });
});
