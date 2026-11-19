/**
 * @jest-environment node
 */
import { lintStories, lintStory, numbersIn, type StoryProblem, type StoryRule } from "../lint";
import type { StoryScript } from "../types";

/** A clean script; each test breaks one rule. */
function base(): StoryScript {
  return {
    id: "lost-99-test",
    series: "lost",
    titleTh: "ทดสอบ",
    hookTh: "ยังไม่รู้จะเลือกอะไร",
    hookVariantsTh: ["เพื่อนเลือกกันหมดแล้ว", "ไม่รู้ว่าชอบอะไร"],
    beats: [
      { who: "student", scene: "bedroom-night", lineTh: "เพื่อนเลือกคณะกันหมดแล้ว" },
      { who: "friend", scene: "school-gate", lineTh: "เธอเลือกอะไรไปแล้ว" },
      { who: "parent", scene: "dinner-table", lineTh: "กินข้าวก่อน แล้วค่อยคิด" },
      { who: "host", mood: "talk", scene: "dinner-table", lineTh: "ลองทำงานจริงดูสักชิ้นก่อน" },
      { who: "student", scene: "classroom", lineTh: "เริ่มจากตรงไหนดี" },
      { who: "host", mood: "wow", scene: "radar", lineTh: "เลือกอาชีพที่สงสัย แล้วลองเล่นดู" },
      { who: "text", scene: "radar", lineTh: "เริ่มได้คืนนี้", big: true },
    ],
    endCardTh: "คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้",
    sendToFriendTh: "ส่งให้เพื่อนที่ยังไม่รู้จะเลือกอะไร",
    captionIgTh: "ยังไม่รู้จะเลือกอะไร\nอยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM",
    captionTtTh: "ยังไม่รู้จะเลือกอะไร\nข้อมูลเต็ม พิมพ์ passionseed.org/radar",
    factRefs: [],
  };
}

const errors = (problems: StoryProblem[]) => problems.filter((p) => p.level === "error");
const rules = (problems: StoryProblem[], level: StoryProblem["level"] = "error") =>
  problems.filter((p) => p.level === level).map((p) => p.rule);

function expectError(mutate: (s: StoryScript) => void, rule: StoryRule) {
  const s = base();
  mutate(s);
  expect(rules(lintStory(s))).toContain(rule);
}

describe("lintStory", () => {
  it("passes a clean script", () => {
    expect(errors(lintStory(base()))).toEqual([]);
  });

  it("limits the hook to 28 characters, counting Thai marks with their letter", () => {
    // 28 visible characters, more code points.
    expect(errors(lintStory({ ...base(), hookTh: "ตีสองแล้ว ยังไม่รู้จะเลือกคณะอะไรนะ" }))).toEqual([]);
    expectError((s) => (s.hookTh = "ก".repeat(29)), "hook-length");
    expectError((s) => (s.hookVariantsTh[1] = "ข".repeat(29)), "hook-length");
    expectError((s) => (s.hookTh = "  "), "hook-length");
  });

  it("needs exactly two hook variants", () => {
    expectError((s) => ((s as unknown as { hookVariantsTh: string[] }).hookVariantsTh = ["หนึ่ง"]), "hook-variants");
  });

  it("limits lines to 60 characters", () => {
    expectError((s) => (s.beats[0].lineTh = "ก".repeat(61)), "line-length");
    expect(errors(lintStory({ ...base(), beats: base().beats.map((b, i) => (i ? b : { ...b, lineTh: "ก".repeat(60) })) }))).toEqual([]);
  });

  it("wants 6 to 10 beats", () => {
    expectError((s) => (s.beats = s.beats.slice(0, 5)), "beats-count");
    expectError((s) => (s.beats = [...s.beats, ...s.beats]), "beats-count");
  });

  it("rejects em and en dashes anywhere", () => {
    expectError((s) => (s.beats[2].lineTh = "กินข้าวก่อน — แล้วค่อยคิด"), "dash");
    expectError((s) => (s.captionIgTh += " 2025–2026"), "dash");
    expectError((s) => (s.titleTh = "ทดสอบ – ร่าง"), "dash");
  });

  it('rejects "น้องๆ"', () => {
    expectError((s) => (s.beats[0].lineTh = "น้องๆ ฟังทางนี้"), "nong");
    expectError((s) => (s.captionTtTh = "น้อง ๆ ทุกคน"), "nong");
  });

  it("needs factRefs when a digit appears, and real URLs in them", () => {
    expectError((s) => (s.beats[3].lineTh = "TCAS70 มี 4 รอบ"), "digits-need-facts");
    expectError((s) => (s.hookTh = "รอบ ๑ ดูอะไร"), "digits-need-facts");
    const backed = { ...base(), factRefs: [{ claim: "TCAS70 has 4 rounds", source: "mytcas", url: "https://www.mytcas.com/" }] };
    backed.beats[3] = { ...backed.beats[3], lineTh: "TCAS70 มี 4 รอบ" };
    expect(errors(lintStory(backed))).toEqual([]);
    expect(rules(lintStory(backed), "warning")).not.toContain("fact-numbers");
    backed.factRefs = [{ claim: "TCAS70 has rounds", source: "mytcas", url: "not a url" }];
    const problems = lintStory(backed);
    expect(rules(problems)).toContain("fact-ref");
    expect(rules(problems, "warning")).toContain("fact-numbers"); // 4 is not in the claim
  });

  it("only knows the generic scenes and career:<slug>/<page>", () => {
    expectError((s) => (s.beats[0].scene = "bedroom" as never), "scene");
    expectError((s) => (s.beats[0].scene = "career:ux-design" as never), "scene");
    expect(errors(lintStory({ ...base(), beats: base().beats.map((b, i) => (i ? b : { ...b, scene: "career:ux-design/work" as const })) }))).toEqual([]);
  });

  it("checks scene art when asked", () => {
    const s = base();
    s.beats[0].scene = "career:ux-design/work";
    const problems = lintStory(s, { sceneExists: (p) => !p.includes("ux-design") });
    expect(problems.find((p) => p.rule === "scene-art")?.message).toContain("public/radar/guides/ux-design/work.webp");
  });

  it("knows who speaks and P'Seed's moods", () => {
    expectError((s) => (s.beats[0].who = "teacher" as never), "who");
    expectError((s) => (s.beats[3].mood = "angry" as never), "mood");
    const s = base();
    s.beats[0].mood = "wow";
    expect(rules(lintStory(s), "warning")).toContain("mood");
  });

  it("never says P'Seed's name in a line", () => {
    expectError((s) => (s.beats[3].lineTh = "P'Seed มาแล้ว"), "host-name");
    expectError((s) => (s.hookTh = "พี่ซีดบอกว่า"), "host-name");
  });

  it("holds the house rules: no follow ask, no weekly day, no promises", () => {
    expectError((s) => (s.captionIgTh += "\nกดติดตามด้วยนะ"), "follow-ask");
    expectError((s) => (s.captionTtTh += "\nตอนใหม่ทุกวันศุกร์"), "weekly-day");
    expectError((s) => (s.beats[5].lineTh = "ทำแบบนี้ติดชัวร์"), "promise");
    expectError((s) => (s.beats[5].lineTh = "สายนี้เงินง่าย"), "promise");
    expectError((s) => (s.beats[5].lineTh = "การันตีว่าได้"), "banned");
    const s = base();
    s.beats[5].lineTh = "รอบ 3 หมดหวังแล้ว";
    s.factRefs = [{ claim: "round 3", source: "mytcas", url: "https://www.mytcas.com/" }];
    expect(rules(lintStory(s), "warning")).toContain("promise");
  });

  it("checks explicit beat lengths", () => {
    expectError((s) => (s.beats[0].ms = 200), "ms");
    const s = base();
    s.beats[0].ms = 1000;
    expect(rules(lintStory(s), "warning")).toContain("ms");
  });

  it("wants a career slug for career stories and kebab-case ids", () => {
    expectError((s) => (s.series = "career"), "slug");
    expectError((s) => (s.id = "Lost 01"), "id");
  });

  it("checks the end card, share line and captions", () => {
    expectError((s) => (s.endCardTh = ""), "end-card");
    expectError((s) => (s.sendToFriendTh = ""), "send-to-friend");
    expectError((s) => (s.captionIgTh = ""), "caption-ig");
    expectError((s) => (s.captionTtTh = ""), "caption-tt");
    const s = base();
    s.captionIgTh = "ไม่มีคีย์เวิร์ด";
    s.captionTtTh = "ไม่มีลิงก์";
    expect(rules(lintStory(s), "warning")).toEqual(expect.arrayContaining(["caption-ig", "caption-tt"]));
  });

  it("warns about a phrase too long for its box (lines break only at spaces)", () => {
    expect(rules(lintStory(base()), "warning")).not.toContain("long-phrase");
    const s = base();
    s.beats[6].lineTh = "เริ่มได้คืนนี้เลยไม่ต้องรอใคร"; // a big line: one long phrase
    s.sendToFriendTh = "ส่งให้เพื่อนที่ยังไม่รู้จะเลือกอะไรเหมือนกันเลยนะ";
    const problems = lintStory(s).filter((p) => p.rule === "long-phrase");
    expect(problems.map((p) => p.path)).toEqual(["beats[6].lineTh", "sendToFriendTh"]);
    expect(problems.every((p) => p.level === "warning")).toBe(true);
    s.beats[6].lineTh = "เริ่มได้คืนนี้ ไม่ต้องรอใคร";
    expect(lintStory(s).filter((p) => p.rule === "long-phrase").map((p) => p.path)).toEqual(["sendToFriendTh"]);
  });

  it("warns when the reel falls outside 20 to 40 seconds", () => {
    const s = base();
    s.beats = s.beats.map((b) => ({ ...b, ms: 6000 }));
    expect(rules(lintStory(s), "warning")).toContain("length");
  });
});

describe("lintStories", () => {
  it("catches duplicate ids", () => {
    expect(rules(lintStories([base(), base()]))).toContain("duplicate-id");
  });
});

describe("numbersIn", () => {
  it("reads Arabic and Thai digits, drops commas", () => {
    expect(numbersIn("TCAS70 มี ๔ รอบ, 7,585 ที่")).toEqual(["70", "4", "7585"]);
  });
});
