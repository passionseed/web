import { lintText } from "@/lib/marketing/copyRules";
import { SHIFT_CARD_KINDS, shortTitle } from "@/lib/whiteboard/shift-cards";

import * as questCanvas from "../quest-canvas";
import {
  CANVAS_RELOAD_CODES,
  CANVAS_SIDE_SLUGS,
  CARD_LIMITS,
  CARD_REFLECTION_FALLBACK,
  HINT_DETAIL,
  MAIN_SLUGS,
  questGuide,
  questGuideSpec,
  UNTITLED_CANVAS,
  canvasTitleOf,
  type GuideSpec,
  type HintRule,
} from "../quest-canvas";

/** The side quests of 20261111090900 and 20261115090000 (side-fix-one-thing is retired). */
const SIDE_SLUGS = [
  "side-stakeholder-map",
  "side-practice-talk",
  "side-question-check",
  "side-warm-intro",
  "side-five-voices",
  "side-open-on-phone",
  "side-readme",
  "side-thirty-second-cut",
  "side-clear-offer",
  "side-outside-circle",
  "side-demo-three-minutes",
  "side-handoff-page",
  "side-review-a-friend",
  "side-share-a-lesson",
  "side-help-a-builder",
  "side-improve-community",
];

const SIDE_ZONES: Record<string, string[]> = {
  "side-five-voices": ["interview", "target"],
  "side-outside-circle": ["test"],
  "side-open-on-phone": ["ship", "idea"],
  "side-thirty-second-cut": ["ship", "idea"],
  "side-clear-offer": ["ship", "idea"],
  "side-demo-three-minutes": ["problem", "idea", "ship"],
};

const mainSpecs = Object.values(MAIN_SLUGS).map((slug) => [slug, questGuideSpec({ kind: "main", slug })] as const);

describe("questGuide", () => {
  it("knows the seven main quests by milestone", () => {
    expect(Object.keys(MAIN_SLUGS).map(Number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it.each([
    ["meet-one-real-person", ["target", "interview", "problem"]],
    ["real-stories-not-compliments", ["interview", "problem", "pivot"]],
    ["first-partner", ["target", "interview"]],
    ["in-their-hands", ["idea", "ship", "test"]],
    ["run-the-loop", ["test", "pivot", "ship"]],
    ["what-we-learned", ["pivot", "problem"]],
    ["beyond-the-first", ["test", "ship"]],
  ])("main %s reads zones %j, with 3 checklist items and examples", (slug, zones) => {
    const guide = questGuide({ kind: "main", slug });
    expect(guide.zones).toEqual(zones);
    expect(guide.checklist).toHaveLength(3);
    expect(guide.examples.length).toBeGreaterThanOrEqual(2);
    for (const item of guide.checklist) expect(Object.keys(item).sort()).toEqual(["id", "label"]);
  });

  it.each(SIDE_SLUGS)("side %s reads the planned zones, no checklist, no examples", (slug) => {
    const guide = questGuide({ kind: "side", slug });
    expect(guide.zones).toEqual(SIDE_ZONES[slug] ?? []);
    expect(guide.checklist).toEqual([]);
    expect(guide.examples).toEqual([]);
  });

  it("gives the ถือกุญแจเอง side quest the ownership checklist, no zones and no examples", () => {
    const guide = questGuide({ kind: "side", slug: "side-take-the-keys" });
    expect(guide.zones).toEqual([]);
    expect(guide.checklist.map((item) => item.id)).toEqual(["keys-checked", "keys-open", "keys-secrets"]);
    expect(guide.examples).toEqual([]);
    expect(questGuide({ kind: "main", slug: "side-take-the-keys" }).checklist).toEqual([]);
  });

  it("lists exactly the side quests that read the canvas", () => {
    expect([...CANVAS_SIDE_SLUGS].sort()).toEqual(Object.keys(SIDE_ZONES).sort());
  });

  it("gives proposed quests, unknown slugs and a missing slug no zones", () => {
    const none = { zones: [], checklist: [], examples: [] };
    expect(questGuide({ kind: "proposed", slug: "meet-one-real-person" })).toEqual(none);
    expect(questGuide({ kind: "main", slug: "nope" })).toEqual(none);
    expect(questGuide({ kind: "side", slug: null })).toEqual(none);
    expect(questGuide({ kind: "main", slug: "__proto__" })).toEqual(none);
    expect(questGuide({ kind: "side", slug: "meet-one-real-person" })).toEqual(none);
    expect(questGuide({ kind: "main", slug: "find-something-worth-fixing" })).toEqual(none);
  });

  it("never lets the caller change the shared config", () => {
    const guide = questGuide({ kind: "main", slug: "first-partner" });
    guide.zones.push("daily");
    guide.checklist.pop();
    expect(questGuide({ kind: "main", slug: "first-partner" }).zones).toEqual(["target", "interview"]);
    expect(questGuide({ kind: "main", slug: "first-partner" }).checklist).toHaveLength(3);
  });
});

describe("guide specs", () => {
  type LeafRule = Exclude<HintRule, { rule: "any" }>;
  const rulesOf = (rule: HintRule): LeafRule[] => (rule.rule === "any" ? rule.of.flatMap(rulesOf) : [rule]);

  it.each(mainSpecs)("%s: zones and rules use real card kinds, ids are unique, at most 3 items", (_slug, spec: GuideSpec) => {
    const kinds = new Set<string>(SHIFT_CARD_KINDS);
    for (const z of spec.zones) expect(kinds.has(z)).toBe(true);
    for (const row of spec.context) expect(kinds.has(row.zone)).toBe(true);
    for (const item of spec.checklist) for (const r of item.hint ? rulesOf(item.hint) : []) expect(kinds.has(r.zone)).toBe(true);
    expect(spec.checklist.length).toBeLessThanOrEqual(3);
    expect(new Set(spec.checklist.map((c) => c.id)).size).toBe(spec.checklist.length);
  });

  it("follows the plan's hint rules", () => {
    const hints = (slug: string) => questGuideSpec({ kind: "main", slug }).checklist.map((c) => c.hint);
    expect(hints("meet-one-real-person")).toEqual([
      { rule: "written", zone: "target" },
      { rule: "count", zone: "interview", min: 1 },
      null,
    ]);
    expect(hints("real-stories-not-compliments")).toEqual([
      { rule: "count", zone: "interview", min: 3 },
      null,
      { rule: "any", of: [{ rule: "version", zone: "problem", min: 2 }, { rule: "count", zone: "pivot", min: 1 }] },
    ]);
    expect(hints("in-their-hands")).toEqual([
      { rule: "written", zone: "idea" },
      { rule: "written", zone: "ship" },
      { rule: "count", zone: "test", min: 1 },
    ]);
    expect(hints("run-the-loop")).toEqual([
      { rule: "count", zone: "test", min: 2 },
      { rule: "any", of: [{ rule: "count", zone: "pivot", min: 1 }, { rule: "version", zone: "ship", min: 2 }] },
      null,
    ]);
    for (const slug of ["first-partner", "what-we-learned", "beyond-the-first"]) {
      expect(hints(slug)).toEqual([null, null, null]);
    }
  });

  it("labels side rows with the whiteboard's own zone names", () => {
    expect(questGuideSpec({ kind: "side", slug: "side-five-voices" }).context).toEqual([
      { zone: "interview", label: shortTitle("interview"), show: "note" },
      { zone: "target", label: shortTitle("target"), show: "note" },
    ]);
  });
});

describe("limits and helpers", () => {
  it("match the database's caps", () => {
    expect(CARD_LIMITS).toEqual({ notes: 8, line: 2000, link: 500, evidence: 2000, noteChars: 400, why: 140 });
  });

  it("reload the canvas after the canvas refusals", () => {
    expect([...CANVAS_RELOAD_CODES].sort()).toEqual(
      ["canvas_gone", "canvas_not_yours", "canvas_unlinked", "note_not_allowed", "notes_changed"].sort(),
    );
  });

  it("titles a canvas from its frame name", () => {
    expect(canvasTitleOf("  Lamp \n project ")).toBe("Lamp project");
    expect(canvasTitleOf("")).toBe(UNTITLED_CANVAS);
    expect(canvasTitleOf(null)).toBe(UNTITLED_CANVAS);
  });
});

/** Every user-facing string in quest-canvas.ts: labels, examples, hint details, fallbacks. */
function strings(): [string, string][] {
  const out: [string, string][] = [];
  for (const [slug, spec] of mainSpecs) {
    spec.context.forEach((r, i) => out.push([`${slug}.context[${i}]`, r.label]));
    spec.checklist.forEach((c, i) => out.push([`${slug}.checklist[${i}]`, c.label]));
    spec.examples.forEach((e, i) => out.push([`${slug}.examples[${i}]`, e]));
  }
  for (const slug of CANVAS_SIDE_SLUGS) {
    questGuideSpec({ kind: "side", slug }).context.forEach((r, i) => out.push([`${slug}.context[${i}]`, r.label]));
  }
  questGuideSpec({ kind: "side", slug: "side-take-the-keys" }).checklist.forEach((c, i) =>
    out.push([`side-take-the-keys.checklist[${i}]`, c.label]),
  );
  for (const kind of SHIFT_CARD_KINDS) {
    out.push([`HINT_DETAIL.count(${kind})`, HINT_DETAIL.count(shortTitle(kind), 2)]);
    out.push([`HINT_DETAIL.version(${kind})`, HINT_DETAIL.version(shortTitle(kind), 2)]);
  }
  out.push(["UNTITLED_CANVAS", UNTITLED_CANVAS], ["CARD_REFLECTION_FALLBACK", CARD_REFLECTION_FALLBACK]);
  return out;
}

describe("quest-canvas copy", () => {
  const all = strings();

  it("collects every string", () => {
    expect(all.length).toBeGreaterThan(60);
    expect(Object.keys(questCanvas)).toEqual(expect.arrayContaining(["HINT_DETAIL", "UNTITLED_CANVAS", "CARD_REFLECTION_FALLBACK"]));
  });

  it.each(all)("%s passes the marketing copy rules", (path, text) => {
    expect(lintText(text, path, "instagram")).toEqual([]);
  });

  it.each(all)("%s has no em dash, emoji, markdown or talking down", (_path, text) => {
    expect(text).not.toMatch(/[—–]/);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(text).not.toMatch(/\*\*|__|`|^#|\[[^\]]*\]\(/);
    expect(text).not.toMatch(/น้อง|ลูก(?!ค้า)|เด็ก/);
  });
});
