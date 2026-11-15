import { PEER_DAILY, PEER_ITEM_ID, PEER_LINE_MAX, PEER_SCHEMA, peerChecklist, tickedLabels } from "../peer";

describe("the peer check's limits", () => {
  it("match the database (20261115140000)", () => {
    expect(PEER_SCHEMA).toBe(15);
    expect(PEER_LINE_MAX).toBe(280);
    expect(PEER_DAILY).toBe(10);
    expect(PEER_ITEM_ID.test("m1-target")).toBe(true);
    expect(PEER_ITEM_ID.test("M1")).toBe(false);
  });
});

describe("peerChecklist", () => {
  it("uses a main quest's guide checklist, the items the quest page shows", () => {
    const items = peerChecklist({ kind: "main", slug: "meet-one-real-person", criteria: "ignored" });
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(3);
    expect(items.every((item) => PEER_ITEM_ID.test(item.id) && item.label.length > 0)).toBe(true);
  });

  it("falls back to the quest's own criteria, one item per line, at most five", () => {
    const items = peerChecklist({ kind: "proposed", slug: null, criteria: "ทำหน้าแรก\n\n  ให้เพื่อนลอง  \na\nb\nc\nd" });
    expect(items).toEqual([
      { id: "c1", label: "ทำหน้าแรก" },
      { id: "c2", label: "ให้เพื่อนลอง" },
      { id: "c3", label: "a" },
      { id: "c4", label: "b" },
      { id: "c5", label: "c" },
    ]);
    expect(peerChecklist({ kind: "side", slug: "no-such-side-quest", criteria: "" })).toEqual([]);
  });

  it("reads ticked ids back as labels, in the list's order, ignoring unknown ids", () => {
    const items = [{ id: "c1", label: "หนึ่ง" }, { id: "c2", label: "สอง" }];
    expect(tickedLabels(items, ["c2", "zz", "c1"])).toEqual(["หนึ่ง", "สอง"]);
  });
});
