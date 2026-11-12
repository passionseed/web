import {
  GUIDE_HOST,
  XP_RULES,
  buildProfileCard,
  emptyProgress,
  levelMap,
  levelSceneSrc,
  maxXp,
  mergeGameResult,
  minutesLeft,
  nextLevelKey,
  normalizeProgress,
  prevLevelKey,
  profileTraits,
  reduceProgress,
  splitDialogue,
  stepProgress,
  storyContext,
  trackableGames,
  xpSummary,
  type GuideProgress,
  type ProgressAction,
} from "../story";
import type { GuideBlock, GuideIndexEntry } from "../guide-types";

const ENTRY: GuideIndexEntry = {
  slug: "cybersecurity",
  alias: "cyber",
  nameTh: "ไซเบอร์",
  nameEn: "Cybersecurity",
  accent: "#5cff5c",
  status: "draft",
  asOf: "2026-11-11",
  intentPathSlug: "interested",
  pages: [
    { key: "mythos", order: 1, titleTh: "บั๊ก", navLabelTh: "บั๊ก", minutes: 2, games: 2, cutscene: true },
    { key: "doors", order: 2, titleTh: "ประตู", navLabelTh: "ประตู", minutes: 2, games: 1 },
    { key: "next", order: 3, titleTh: "แล้วเธอล่ะ", navLabelTh: "จบ", minutes: 1, games: 0 },
  ],
  story: {
    profileTitleTh: "โปรไฟล์สายไซเบอร์ของฉัน",
    badges: [
      { id: "mythos", nameTh: "ตาไว", descTh: "ผ่านด่านแรก", icon: "bug", trigger: { on: "clear", pageKey: "mythos" } },
      { id: "perfect-doors", nameTh: "กุญแจครบ", descTh: "ถูกหมด", icon: "key", trigger: { on: "game", game: "doors:*", perfect: true } },
      { id: "redteam", nameTh: "ทีมแดง", descTh: "เลือกทีมแดง", icon: "key", trigger: { on: "choice", key: "doors:card3", value: "redteam" } },
      { id: "all", nameTh: "ครบ", descTh: "ครบทุกด่าน", icon: "star", trigger: { on: "allCleared" } },
      { id: "xp", nameTh: "สะสมแต้ม", descTh: "แต้มถึง", icon: "coin", trigger: { on: "xp", atLeast: 250 } },
    ],
    traits: [
      { id: "breaker", labelTh: "ชอบหาจุดพัง", icon: "bug", when: [{ fit: "A" }, { favourite: "mythos" }] },
      { id: "people", labelTh: "ใจอยู่กับคน", icon: "heart", when: [{ fit: "C" }] },
      { id: "perfect", labelTh: "ตาคม", icon: "eye", when: [{ perfect: "doors:*" }] },
      { id: "explorer", labelTh: "นักสำรวจ", icon: "map", when: [{ always: true }] },
      { id: "curious", labelTh: "อยากรู้", icon: "eye", when: [{ always: true }] },
      { id: "first", labelTh: "รันแรก", icon: "star", when: [{ always: true }] },
    ],
  },
};
const CTX = storyContext(ENTRY);

function apply(actions: ProgressAction[], from: GuideProgress = emptyProgress()) {
  let state = from;
  const earned: string[] = [];
  let xp = 0;
  for (const a of actions) {
    const r = stepProgress(state, a, CTX);
    state = r.state;
    earned.push(...r.earned.map((b) => b.id));
    xp += r.xpGained;
  }
  return { state, earned, xp };
}

describe("story: host and dialogue", () => {
  it("keeps the host in one constant with a placeholder name", () => {
    expect(GUIDE_HOST.nameTh).toBe("พี่โฮสต์");
    expect(GUIDE_HOST.sprites.idle).toMatch(/^\/radar\/guides\//);
    expect(levelSceneSrc("cybersecurity", "mythos")).toBe("/radar/guides/cybersecurity/mythos.webp");
  });

  it("splits dialogue at spaces into boxes of at most max chars", () => {
    const boxes = splitDialogue("หนึ่ง สอง สาม สี่ ห้า", 10);
    expect(boxes.every((b) => b.length <= 10)).toBe(true);
    expect(boxes.join(" ")).toBe("หนึ่ง สอง สาม สี่ ห้า");
    expect(splitDialogue("คำยาวมากเกินกล่องเดียวแน่นอน", 5)).toEqual(["คำยาวมากเกินกล่องเดียวแน่นอน"]);
    expect(splitDialogue("   ")).toEqual([]);
  });
});

describe("story: XP", () => {
  it("counts level clears and games, capped per level, skip worth less", () => {
    expect(maxXp(ENTRY.pages)).toBe(3 * XP_RULES.levelClear + 3 * XP_RULES.gamePlayed);
    const { state, xp } = apply([
      { type: "game", pageKey: "mythos", blockId: "find", result: { done: true, attempts: 2 } },
      { type: "game", pageKey: "mythos", blockId: "guess", result: { done: true, skipped: true } },
      { type: "game", pageKey: "mythos", blockId: "extra", result: { done: true } }, // over the cap of 2
      { type: "clear", pageKey: "mythos" },
    ]);
    // played (find, extra) fill the cap of 2; the skip earns nothing more.
    expect(xpSummary(state, ENTRY.pages).xp).toBe(XP_RULES.levelClear + 2 * XP_RULES.gamePlayed);
    expect(xp).toBe(XP_RULES.levelClear + 2 * XP_RULES.gamePlayed);
  });

  it("gives skip XP when no played game fills the slot", () => {
    const { state } = apply([{ type: "game", pageKey: "doors", blockId: "key", result: { done: true, skipped: true } }]);
    expect(xpSummary(state, ENTRY.pages).xp).toBe(XP_RULES.gameSkipped);
  });

  it("never farms XP on replays", () => {
    const actions: ProgressAction[] = [
      { type: "clear", pageKey: "doors" },
      { type: "game", pageKey: "doors", blockId: "key", result: { done: true, score: 3, total: 5 } },
    ];
    const once = apply(actions);
    const twice = apply(actions, once.state);
    expect(twice.xp).toBe(0);
    expect(xpSummary(twice.state, ENTRY.pages).ratio).toBeCloseTo((100 + 50) / 450);
  });

  it("ignores games that are not done", () => {
    const { state } = apply([{ type: "game", pageKey: "doors", blockId: "key", result: { done: false } }]);
    expect(xpSummary(state, ENTRY.pages).xp).toBe(0);
  });
});

describe("story: badges", () => {
  it("awards each badge once, in definition order", () => {
    const first = apply([{ type: "clear", pageKey: "mythos" }]);
    expect(first.earned).toEqual(["mythos"]);
    const again = apply([{ type: "clear", pageKey: "mythos" }], first.state);
    expect(again.earned).toEqual([]);
    expect(again.state.badges).toEqual(["mythos"]);
  });

  it("perfect game badges ignore skips and imperfect scores", () => {
    expect(apply([{ type: "game", pageKey: "doors", blockId: "k", result: { done: true, score: 4, total: 5 } }]).earned).toEqual([]);
    expect(apply([{ type: "game", pageKey: "doors", blockId: "k", result: { done: true, skipped: true, score: 5, total: 5 } }]).earned).toEqual([]);
    expect(apply([{ type: "game", pageKey: "doors", blockId: "k", result: { done: true, score: 5, total: 5 } }]).earned).toEqual(["perfect-doors"]);
  });

  it("awards choice, xp and all-cleared badges", () => {
    const { earned } = apply([
      { type: "choice", key: "doors:card3", value: "redteam" },
      { type: "game", pageKey: "mythos", blockId: "a", result: { done: true } },
      { type: "clear", pageKey: "mythos" },
      { type: "clear", pageKey: "doors" },
      { type: "clear", pageKey: "next" },
    ]);
    expect(earned).toEqual(["redteam", "mythos", "xp", "all"]);
  });

  it("reset clears progress and awards nothing", () => {
    const done = apply([{ type: "clear", pageKey: "mythos" }]);
    const r = stepProgress(done.state, { type: "reset" }, CTX);
    expect(r.state).toEqual(emptyProgress());
    expect(r.earned).toEqual([]);
  });
});

describe("story: reducer", () => {
  it("returns the same object when nothing changes", () => {
    const s = reduceProgress(emptyProgress(), { type: "visit", pageKey: "mythos" });
    expect(reduceProgress(s, { type: "visit", pageKey: "mythos" })).toBe(s);
    expect(reduceProgress(s, { type: "grade", grade: "m5" })).not.toBe(s);
  });

  it("tracks visits, last level, choices, cutscenes and local values", () => {
    let s = emptyProgress();
    s = reduceProgress(s, { type: "visit", pageKey: "mythos" });
    s = reduceProgress(s, { type: "visit", pageKey: "doors" });
    s = reduceProgress(s, { type: "cutscene", pageKey: "mythos", status: "watched" });
    s = reduceProgress(s, { type: "cutscene", pageKey: "mythos", status: "skipped" });
    s = reduceProgress(s, { type: "local", patch: { birthYear: 2010, gpax: 3.2 } });
    s = reduceProgress(s, { type: "local", patch: { gpax: undefined } });
    s = reduceProgress(s, { type: "fit", fit: "AB" });
    expect(s.visited).toEqual(["mythos", "doors"]);
    expect(s.last).toBe("doors");
    expect(s.cutscenes).toEqual({ mythos: "watched" });
    expect(s.local).toEqual({ birthYear: 2010 });
    expect(s.fit).toBe("AB");
  });

  it("keeps the better game result", () => {
    expect(mergeGameResult({ done: true, score: 4, total: 5 }, { done: true, score: 3, total: 5 }).score).toBe(4);
    expect(mergeGameResult({ done: true, skipped: true }, { done: true, score: 1, total: 5 }).skipped).toBeUndefined();
    expect(mergeGameResult({ done: true, score: 1, total: 5 }, { done: true, skipped: true }).score).toBe(1);
    expect(mergeGameResult({ done: false }, { done: true, skipped: true }).done).toBe(true);
  });
});

describe("story: normalizeProgress", () => {
  it("resets anything that is not v1 progress", () => {
    expect(normalizeProgress(null)).toEqual(emptyProgress());
    expect(normalizeProgress("x")).toEqual(emptyProgress());
    expect(normalizeProgress({ v: 2, visited: ["a"] })).toEqual(emptyProgress());
  });

  it("drops malformed fields and keeps good ones", () => {
    const s = normalizeProgress({
      v: 1,
      visited: ["mythos", 3],
      games: { "mythos:find": { done: true, score: 2, total: "x" }, bad: { score: 1 } },
      choices: { a: "b", c: 1 },
      grade: "m9",
      fit: "AB",
      cleared: ["mythos"],
      badges: ["mythos"],
      cutscenes: { mythos: "watched", doors: "maybe" },
      last: "doors",
    });
    expect(s.visited).toEqual(["mythos"]);
    expect(s.games).toEqual({ "mythos:find": { done: true, score: 2 } });
    expect(s.choices).toEqual({ a: "b" });
    expect(s.grade).toBeUndefined();
    expect(s.fit).toBe("AB");
    expect(s.cutscenes).toEqual({ mythos: "watched" });
    expect(s.last).toBe("doors");
  });
});

describe("story: level map and navigation", () => {
  it("marks cleared, current and ahead levels, all open", () => {
    const s = reduceProgress(emptyProgress(), { type: "clear", pageKey: "mythos" });
    const map = levelMap(s, ENTRY.pages);
    expect(map.map((n) => n.status)).toEqual(["cleared", "current", "ahead"]);
    expect(map.every((n) => n.open)).toBe(true);
    expect(map[0].hasCutscene).toBe(true);
    expect(levelMap(s, ENTRY.pages, "next").map((n) => n.status)).toEqual(["cleared", "ahead", "current"]);
  });

  it("finds next and previous levels and minutes left", () => {
    expect(nextLevelKey(ENTRY.pages, "mythos")).toBe("doors");
    expect(nextLevelKey(ENTRY.pages, "next")).toBeNull();
    expect(prevLevelKey(ENTRY.pages, "mythos")).toBeNull();
    expect(prevLevelKey(ENTRY.pages, "doors")).toBe("mythos");
    expect(minutesLeft(ENTRY.pages, "doors")).toBe(3);
  });

  it("counts trackable games, skipping phase 2", () => {
    const blocks: GuideBlock[] = [
      { kind: "copy", id: "c", role: "hero", text: { th: "x" } },
      { kind: "bespoke", id: "b1", component: "X", fallbackTh: ["x"] },
      { kind: "bespoke", id: "b2", component: "X", fallbackTh: ["x"], track: { done: "m:done", value: "none" } },
      {
        kind: "beat",
        id: "beat",
        unlockLabelTh: "ต่อ",
        blocks: [
          { kind: "game", id: "g1", game: { engine: "FlipCards", data: { highlightTh: "x", cards: [] } }, track: { done: "m:g", value: "none" }, answersTh: ["x"] },
          { kind: "game", id: "g2", phase: 2, game: { engine: "FlipCards", data: { highlightTh: "x", cards: [] } }, track: { done: "m:h", value: "none" }, answersTh: ["x"] },
        ],
      },
    ];
    expect(trackableGames(blocks)).toEqual(["b2", "g1"]);
  });
});

describe("story: profile card", () => {
  it("picks 3 traits by priority, with always fillers", () => {
    let s = emptyProgress();
    expect(profileTraits(s, ENTRY.story!.traits).map((t) => t.id)).toEqual(["explorer", "curious", "first"]);
    s = reduceProgress(s, { type: "fit", fit: "AC" });
    expect(profileTraits(s, ENTRY.story!.traits).map((t) => t.id)).toEqual(["breaker", "people", "explorer"]);
  });

  it("builds the card from local progress only", () => {
    const { state } = apply([
      { type: "clear", pageKey: "mythos" },
      { type: "game", pageKey: "doors", blockId: "k", result: { done: true, score: 5, total: 5 } },
      { type: "local", patch: { birthYear: 2010 } },
    ]);
    const card = buildProfileCard(state, ENTRY);
    expect(card.titleTh).toBe("โปรไฟล์สายไซเบอร์ของฉัน");
    expect(card.traits.map((t) => t.id)).toEqual(["perfect", "explorer", "curious"]);
    expect(card.levelsCleared).toBe(1);
    expect(card.levelsTotal).toBe(3);
    expect(card.xp).toBe(150);
    expect(card.badges.map((b) => b.id)).toEqual(["mythos", "perfect-doors"]);
    expect(JSON.stringify(card)).not.toContain("2010");
  });
});
