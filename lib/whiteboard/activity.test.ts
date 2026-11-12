import { describeCounts, elementAuthorIds, groupChanges, type ChangeRow } from "./activity";

const at = (minute: number) => new Date(Date.UTC(2026, 9, 24, 19, minute)).toISOString();

describe("groupChanges", () => {
  it("folds one person's back-to-back saves into a session", () => {
    const rows: ChangeRow[] = [
      { userId: "mint", createdAt: at(0), items: [{ id: "t1", action: "added", type: "text", text: "" }] },
      { userId: "mint", createdAt: at(1), items: [{ id: "t1", action: "edited", type: "text", text: "ไอเดีย", before: "" }] },
      { userId: "mint", createdAt: at(2), items: [{ id: "t2", action: "changed", type: "rectangle" }] },
    ];
    const [session] = groupChanges(rows);
    expect(session.userId).toBe("mint");
    expect(session.from).toBe(at(0));
    expect(session.to).toBe(at(2));
    expect(session.items).toEqual([
      { id: "t1", action: "added", type: "text", text: "ไอเดีย" },
      { id: "t2", action: "changed", type: "rectangle" },
    ]);
    expect(session.counts).toEqual({ added: 1, edited: 0, changed: 1, deleted: 0 });
  });

  it("drops things added and deleted in the same session", () => {
    const rows: ChangeRow[] = [
      { userId: "mint", createdAt: at(0), items: [{ id: "x", action: "added", type: "text", text: "oops" }] },
      { userId: "mint", createdAt: at(1), items: [{ id: "x", action: "deleted", type: "text" }] },
    ];
    expect(groupChanges(rows)).toEqual([]);
  });

  it("keeps the first text before an edit, and reverting is not an edit", () => {
    const edit = (minute: number, before: string, text: string): ChangeRow => ({
      userId: "beam",
      createdAt: at(minute),
      items: [{ id: "t", action: "edited", type: "text", text, before }],
    });
    expect(groupChanges([edit(0, "a", "b"), edit(1, "b", "c")])[0].items[0]).toMatchObject({ before: "a", text: "c" });
    expect(groupChanges([edit(0, "a", "b"), edit(1, "b", "a")])[0].items[0]).toMatchObject({ action: "changed" });
  });

  it("splits sessions by person and by gaps, newest first", () => {
    const row = (userId: string, minute: number): ChangeRow => ({
      userId,
      createdAt: at(minute),
      items: [{ id: `${userId}${minute}`, action: "added", type: "text" }],
    });
    const sessions = groupChanges([row("mint", 0), row("beam", 1), row("mint", 2), row("mint", 30)]);
    expect(sessions.map((s) => [s.userId, s.items.length])).toEqual([
      ["mint", 1],
      ["mint", 2],
      ["beam", 1],
    ]);
  });
});

describe("activity helpers", () => {
  it("describes counts without zeros", () => {
    expect(describeCounts({ added: 4, edited: 1, changed: 0, deleted: 2 })).toBe("เพิ่ม 4 · แก้ข้อความ 1 · ลบ 2");
  });

  it("collects element authors", () => {
    expect(
      elementAuthorIds([
        { id: "a", customData: { createdBy: "mint", updatedBy: "beam" } },
        { id: "b", customData: { createdBy: "mint" } },
        { id: "c" },
      ]),
    ).toEqual(["mint", "beam"]);
  });
});
