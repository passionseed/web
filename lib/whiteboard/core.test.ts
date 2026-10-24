import {
  canEdit,
  canManage,
  changedSince,
  colorFor,
  commentSchema,
  formatClock,
  remapIds,
  restoreVersion,
  secondsLeft,
  joinRole,
  markSeen,
  mergeElements,
  patchBoardSchema,
  shareUrl,
} from "./core";

describe("whiteboard roles", () => {
  it("lets owners and editors edit, and only owners manage", () => {
    expect(canEdit("owner")).toBe(true);
    expect(canEdit("editor")).toBe(true);
    expect(canEdit("viewer")).toBe(false);
    expect(canEdit(null)).toBe(false);
    expect(canManage("owner")).toBe(true);
    expect(canManage("editor")).toBe(false);
  });

  it("gives the link's role and never lowers existing access", () => {
    expect(joinRole(null, "edit")).toBe("editor");
    expect(joinRole(null, "view")).toBe("viewer");
    expect(joinRole(null, "none")).toBeNull();
    expect(joinRole("editor", "view")).toBe("editor");
    expect(joinRole("viewer", "edit")).toBe("editor");
    expect(joinRole("viewer", "none")).toBe("viewer");
  });
});

describe("element sync", () => {
  const a1 = { id: "a", version: 1 };
  const a2 = { id: "a", version: 2 };
  const b1 = { id: "b", version: 1 };

  it("finds elements changed since they were last seen", () => {
    const seen = new Map<string, number>();
    expect(changedSince([a1, b1], seen)).toEqual([a1, b1]);
    markSeen(seen, [a1, b1]);
    expect(changedSince([a2, b1], seen)).toEqual([a2]);
  });

  it("keeps the higher version per element and adds new ones", () => {
    expect(mergeElements([a2, b1], [a1])).toEqual([a2, b1]);
    expect(mergeElements([a1], [a2, b1])).toEqual([a2, b1]);
  });
});

describe("patchBoardSchema", () => {
  it("accepts elements that carry an id and version", () => {
    const parsed = patchBoardSchema.parse({ elements: [{ id: "x", version: 3, type: "rectangle" }] });
    expect(parsed.elements?.[0]).toMatchObject({ id: "x", type: "rectangle" });
  });

  it("rejects unknown fields and non-image thumbnails", () => {
    expect(patchBoardSchema.safeParse({ ownerId: "me" }).success).toBe(false);
    expect(patchBoardSchema.safeParse({ thumbnail: "javascript:alert(1)" }).success).toBe(false);
  });
});

it("builds share links and stable colours", () => {
  expect(shareUrl("https://passionseed.org/", "abc")).toBe("https://passionseed.org/whiteboard/join/abc");
  expect(colorFor("user-1")).toEqual(colorFor("user-1"));
});

describe("restoreVersion", () => {
  it("deletes newer elements and lifts restored ones above every current version", () => {
    const current = [
      { id: "a", version: 5 },
      { id: "b", version: 2 },
      { id: "old", version: 3, isDeleted: true },
    ];
    const snapshot = [
      { id: "a", version: 2 },
      { id: "c", version: 1 },
    ];
    const out = restoreVersion(current, snapshot);
    const byId = Object.fromEntries(out.map((el) => [el.id, el]));
    expect(byId.a).toMatchObject({ version: 6, isDeleted: false });
    expect(byId.b).toMatchObject({ version: 3, isDeleted: true });
    expect(byId.c).toMatchObject({ version: 2, isDeleted: false });
    expect(byId.old).toMatchObject({ version: 3, isDeleted: true });
  });
});

describe("timer helpers", () => {
  it("counts down to zero and formats as m:ss", () => {
    expect(secondsLeft(null)).toBe(0);
    expect(secondsLeft(new Date(10_500).toISOString(), 0)).toBe(11);
    expect(secondsLeft(new Date(0).toISOString(), 5000)).toBe(0);
    expect(formatClock(65)).toBe("1:05");
  });
});

it("requires a position for new comment threads but not replies", () => {
  expect(commentSchema.safeParse({ body: "hi" }).success).toBe(false);
  expect(commentSchema.safeParse({ body: "hi", x: 1, y: 2 }).success).toBe(true);
  expect(commentSchema.safeParse({ body: "hi", parentId: "6f1c1b7e-6a43-4c55-9d3e-0f7a2b1c3d4e" }).success).toBe(true);
});

it("remaps ids and every reference between imported elements", () => {
  let n = 0;
  const out = remapIds(
    [
      { id: "box", boundElements: [{ id: "txt", type: "text" }, { id: "arr", type: "arrow" }] },
      { id: "txt", containerId: "box" },
      { id: "arr", startBinding: { elementId: "box" }, endBinding: { elementId: "outside" } },
    ],
    () => `n${++n}`,
  );
  expect(out.map((e) => e.id)).toEqual(["n1", "n2", "n3"]);
  expect(out[0].boundElements).toEqual([{ id: "n2", type: "text" }, { id: "n3", type: "arrow" }]);
  expect(out[1].containerId).toBe("n1");
  expect(out[2].startBinding).toEqual({ elementId: "n1" });
  expect(out[2].endBinding).toEqual({ elementId: "outside" });
});
