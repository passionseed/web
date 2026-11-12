import type { GuideBlock, GuidePage } from "@/lib/radar-guide/guide-types";
import {
  advanceLabel,
  buildLevelSteps,
  copySpeaker,
  DEMO_SCRIPT_GAP_MS,
  dialogueGroups,
  initialCursor,
  nextStepIndex,
  pageDemoScript,
  PROFILE_STEP_ID,
  stepMeta,
  stepShown,
} from "../level-steps";

const blocks: GuideBlock[] = [
  { kind: "safety", id: "safe", lineTh: "ทำในแล็บที่ได้รับอนุญาตเท่านั้น" },
  { kind: "dialogue", id: "intro", lines: [{ speaker: "host", text: { th: "สวัสดี" } }] },
  {
    kind: "beat",
    id: "b1",
    unlockLabelTh: "ไปดูของจริง",
    blocks: [
      { kind: "item", id: "intel", item: "intel", text: { th: "ข่าวจริง" } },
      {
        kind: "game",
        id: "g",
        game: { engine: "FlipCards", data: { highlightTh: "x", cards: [] } },
        track: { done: "lv:done", value: "none" },
        answersTh: ["เฉลย"],
        demoScript: [
          { at: 0, action: "tap", target: "a" },
          { at: 500, action: "tap", target: "b" },
        ],
      },
    ],
  },
  {
    kind: "bespoke",
    id: "later",
    component: "X",
    fallbackTh: ["x"],
    phase: 2,
    demoScript: [{ at: 0, action: "tap", target: "hidden" }],
  },
  {
    kind: "bespoke",
    id: "bs",
    component: "Y",
    fallbackTh: ["y"],
    demoScript: [{ at: 100, action: "tap", target: "c" }],
  },
];

describe("buildLevelSteps", () => {
  it("flattens beats, labels the beat's first step, pins safety and drops phase 2", () => {
    const steps = buildLevelSteps({ blocks });
    expect(steps.map((s) => s.id)).toEqual(["safe", "intro", "intel", "g", "bs"]);
    expect(steps[0].pinned).toBe(true);
    expect(steps[2].labelTh).toBe("ไปดูของจริง");
    expect(steps[3].labelTh).toBeUndefined();
  });

  it("appends the profile card to the final level only", () => {
    expect(buildLevelSteps({ blocks }, { final: true }).at(-1)?.id).toBe(PROFILE_STEP_ID);
    expect(buildLevelSteps({ blocks }).some((s) => s.id === PROFILE_STEP_ID)).toBe(false);
  });

  it("stepMeta is serializable and keeps only the client fields", () => {
    const meta = stepMeta(buildLevelSteps({ blocks }));
    expect(JSON.parse(JSON.stringify(meta))).toEqual(meta);
    expect(meta[0]).toEqual({ id: "safe", kind: "safety", pinned: true });
  });
});

describe("cursor helpers", () => {
  const steps = stepMeta(buildLevelSteps({ blocks }, { final: true }));

  it("starts past leading pinned steps and skips pinned steps when advancing", () => {
    expect(initialCursor(steps)).toBe(1);
    expect(nextStepIndex(steps, 1)).toBe(2);
    expect(nextStepIndex(steps, steps.length - 1)).toBe(-1);
    expect(initialCursor([{ pinned: true }])).toBe(0);
  });

  it("shows steps up to the cursor plus pinned ones", () => {
    expect(stepShown(steps, 0, 1)).toBe(true);
    expect(stepShown(steps, 2, 1)).toBe(false);
    expect(stepShown(steps, 2, 2)).toBe(true);
  });

  it("labels the sticky button", () => {
    expect(advanceLabel(steps, 1, true)).toBe("ไปดูของจริง");
    expect(advanceLabel(steps, 2, true)).toBe("ต่อ");
    expect(advanceLabel(steps, steps.length - 2, true)).toBe("ดูโปรไฟล์ของฉัน");
    expect(advanceLabel(steps, steps.length - 1, true)).toBe("ด่านต่อไป");
    expect(advanceLabel(steps, steps.length - 1, false)).toBe("แผนที่ด่าน");
  });
});

describe("dialogue", () => {
  it("groups consecutive lines by speaker and splits long lines into boxes", () => {
    const long = Array.from({ length: 30 }, () => "คำ").join(" ");
    const groups = dialogueGroups([
      { speaker: "host", text: { th: "หนึ่ง" } },
      { speaker: "host", text: { th: long } },
      { speaker: "player", text: { th: "ฉันเอง" } },
      { speaker: "host", text: { th: "สาม" } },
    ]);
    expect(groups.map((g) => g.speaker)).toEqual(["host", "player", "host"]);
    expect(groups[0].lines.length).toBeGreaterThan(2);
    expect(groups[0].lines[0]).toBe("หนึ่ง");
  });

  it("speaks honesty/update/caption copy as system notes, the rest as the host", () => {
    expect(copySpeaker("honesty")).toBe("system");
    expect(copySpeaker("update")).toBe("system");
    expect(copySpeaker("body")).toBe("host");
    expect(copySpeaker("hero")).toBe("host");
  });
});

describe("pageDemoScript", () => {
  it("chains every visible block's script, offsetting later ones", () => {
    const steps = pageDemoScript({ blocks } as Pick<GuidePage, "blocks">);
    expect(steps.map((s) => s.action === "tap" && s.target)).toEqual(["a", "b", "c"]);
    expect(steps.map((s) => s.at)).toEqual([0, 500, 500 + DEMO_SCRIPT_GAP_MS + 100]);
  });
});
