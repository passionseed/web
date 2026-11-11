import { findQuests, mayRetag, newQuestTag, questName, questsToMarkdown, questTagOf, questWork, withBoundText } from "./quests";

const text = (id: string, x: number, y: number, t: string, extra: object = {}) => ({ id, type: "text", x, y, width: 160, height: 60, text: t, ...extra });
const tag = (questId: string, by: string, session = "s1") => ({ quest: newQuestTag(questId, session, by, new Date("2026-11-11T10:00:00Z")) });

// Laid out like SHIFT[3] Day 2: labels in a row, each task 110 units under its label.
const board = [
  text("q2", -8360, 6820, "Quest"),
  text("t2", -8400, 6930, "หา reference คนที่เขาแก้ปัญหา\nแบบเดียวกับเรา"),
  text("q1", -10210, 6820, "quest ⭐"),
  text("t1", -10250, 6930, "แยกกลุ่มกันคุย"),
  text("q3", -6610, 6820, "Quest"),
  text("far", -6650, 9000, "too far below to be the task"),
  text("note", -9000, 8000, "Quest is not the whole text here"),
];

describe("findQuests", () => {
  it("finds the labels in reading order, each with the task under it", () => {
    const quests = findQuests(board);
    expect(quests.map((q) => [q.id, q.number, q.title])).toEqual([
      ["q1", 1, "แยกกลุ่มกันคุย"],
      ["q2", 2, "หา reference คนที่เขาแก้ปัญหา แบบเดียวกับเรา"],
      ["q3", 3, ""],
    ]);
  });

  it("ignores deleted labels and boards without quests", () => {
    expect(findQuests([{ ...text("q", 0, 0, "Quest"), isDeleted: true }])).toEqual([]);
    expect(findQuests([text("x", 0, 0, "hello")])).toEqual([]);
  });

  it("names a quest with or without a task", () => {
    expect(questName({ number: 2, title: "ทำ AI Studio" })).toBe("Quest 2: ทำ AI Studio");
    expect(questName({ number: 3, title: "" })).toBe("Quest 3");
  });
});

describe("tags", () => {
  it("reads a well-formed tag and rejects anything else", () => {
    expect(questTagOf({ customData: tag("q1", "u1") })).toEqual({ id: "q1", session: "s1", by: "u1", at: "2026-11-11T10:00:00.000Z" });
    expect(questTagOf({ customData: { quest: { id: "q1" } } })).toBeNull();
    expect(questTagOf({ customData: null })).toBeNull();
  });

  it("lets people retag their own work, and moderators anything", () => {
    const mine = { customData: { createdBy: "me", ...tag("q1", "me") } };
    const theirs = { customData: { createdBy: "them", ...tag("q1", "them") } };
    expect(mayRetag(mine, "me", false)).toBe(true);
    expect(mayRetag(theirs, "me", false)).toBe(false);
    expect(mayRetag(theirs, "me", true)).toBe(true);
    expect(mayRetag({ customData: { createdBy: "me" } }, "me", false)).toBe(true);
    expect(mayRetag({ customData: { createdBy: "them" } }, "me", false)).toBe(false);
    expect(mayRetag({ customData: null }, "me", false)).toBe(true);
  });

  it("retags a note together with its words", () => {
    const els = [
      { id: "box", type: "rectangle", x: 0, y: 0, width: 1, height: 1, boundElements: [{ id: "words", type: "text" }] },
      text("words", 0, 0, "hi", { containerId: "box" }),
      text("other", 0, 0, "x"),
    ];
    expect(withBoundText(els, new Set(["words"])).map((e) => e.id).sort()).toEqual(["box", "words"]);
    expect(withBoundText(els, new Set(["box"])).map((e) => e.id).sort()).toEqual(["box", "words"]);
  });
});

describe("questWork", () => {
  const work = [
    ...board,
    { id: "stroke", type: "freedraw", x: 0, y: 0, width: 1, height: 1, customData: tag("q2", "amy") },
    { id: "box", type: "rectangle", x: 0, y: 0, width: 1, height: 1, boundElements: [{ id: "w", type: "text" }], customData: tag("q2", "amy") },
    text("w", 0, 0, "Canva\nช่วยทำโพสต์", { containerId: "box", customData: tag("q2", "amy") }),
    text("typed", 0, 0, "ref 2", { containerId: "mentorBox", customData: tag("q2", "ben", "s2") }),
    { id: "gone", type: "freedraw", x: 0, y: 0, width: 1, height: 1, isDeleted: true, customData: tag("q2", "amy") },
    { id: "old", type: "freedraw", x: 0, y: 0, width: 1, height: 1, customData: tag("deleted-label", "amy") },
  ];

  it("groups what each person made by quest, words once, drawings counted", () => {
    const result = questWork(work);
    expect(result.map((w) => w.quest?.number ?? null)).toEqual([2, null]);
    expect(result[0].people).toEqual([
      { userId: "amy", texts: ["Canva ช่วยทำโพสต์"], drawings: 1, sessions: 1 },
      { userId: "ben", texts: ["ref 2"], drawings: 0, sessions: 1 },
    ]);
  });

  it("writes Markdown for the reader", () => {
    const md = questsToMarkdown(work, (id) => ({ amy: "Amy", ben: "Ben" })[id] ?? "Someone");
    expect(md).toContain("## Quest work");
    expect(md).toContain("### Quest 2: หา reference คนที่เขาแก้ปัญหา แบบเดียวกับเรา");
    expect(md).toContain('- Amy: "Canva ช่วยทำโพสต์"; 1 drawing');
    expect(md).toContain('- Ben: "ref 2"');
    expect(md).toContain("### A quest that was deleted");
    expect(questsToMarkdown(board, () => "x")).toBe("");
  });
});
