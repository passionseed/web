import { buildDeckSections, isExcludedFromDeck, isSkillsCard, outroCtaCard, type DeckCardRow, type DeckSection } from "../deck-sections";
import { visibleFixtureCards } from "@/lib/radar-guide/__fixtures__";

function card(kind: string, content: Record<string, unknown> = {}, position = 0): DeckCardRow {
  return {
    id: `${kind}-${position}`,
    field_id: "f",
    position,
    kind,
    content_th: content as DeckCardRow["content_th"],
    content_en: null,
    image_url: null,
    image_prompt: null,
    image_credit: null,
    image_license: null,
    image_alt_th: null,
    image_alt_en: null,
    is_hidden: false,
    created_at: null,
    updated_at: null,
  };
}

/** Score card as app/radar/[slug]/page.tsx injects it. */
const scoreCard = { ...card("careerSurvival", { title: "แนวโน้ม" }, -1), id: "__score__" };

function kinds(sections: DeckSection[]): string[] {
  return sections.map((s) => (s.type === "card" ? s.card.kind : s.type));
}

describe("buildDeckSections on real fixtures", () => {
  it.each(["data-scientist", "software-engineer"] as const)(
    "%s: story order, realPeople before the outro, sources last",
    (slug) => {
      const cards = [scoreCard, ...visibleFixtureCards(slug)];
      const sections = buildDeckSections(cards, [{}]);

      expect(kinds(sections)).toEqual([
        "hook",
        "fantasyReality",
        "salaryProgression",
        "careerSurvival",
        "marketThailand",
        "midShare",
        "aiImpact",
        "dayInLife",
        "realPeople",
        "risks",
        "entryRoutes",
        "skills",
        "text",
        "outro",
        "sources",
      ]);
      expect(outroCtaCard(cards)?.kind).toBe("cta");
      sections.forEach((section, i) => expect(section.index).toBe(i));
      const realPeople = sections.findIndex((s) => s.type === "card" && s.card.kind === "realPeople");
      const outro = sections.findIndex((s) => s.type === "outro");
      expect(realPeople).toBeLessThan(outro);
    }
  );

  it("carries no chapter keys on any section", () => {
    const sections = buildDeckSections(visibleFixtureCards("data-scientist"), [{}]);
    for (const section of sections) {
      expect(Object.keys(section).sort()).toEqual(
        section.type === "card" ? ["card", "index", "type"] : ["index", "type"]
      );
    }
  });
});

describe("card rules", () => {
  it("drops reflection, jobs, startCarousel and explore cards", () => {
    const sections = buildDeckSections(
      [
        card("hook", {}, 0),
        card("reflection", {}, 5),
        card("text", { presentation: "startCarousel", title: "เริ่ม" }, 6),
        card("text", { title: "ทางนี้คืออะไร" }, 7),
        card("text", { presentation: "explore" }, 8),
        card("jobs", {}, 9),
      ],
      []
    );
    expect(kinds(sections)).toEqual(["hook", "midShare", "outro"]);
  });

  it("keeps the skills text card, after the skills rail", () => {
    const skills = card("text", { presentation: "skills" }, 1);
    expect(isSkillsCard(skills)).toBe(true);
    expect(isExcludedFromDeck(skills)).toBe(false);
    expect(kinds(buildDeckSections([skills], [{}], { fromPlan: true }))).toEqual(["skills", "text"]);
  });

  it("orders cards inside a group by kind, then by position", () => {
    const sections = buildDeckSections(
      [card("risks", {}, 1), card("realPeople", {}, 2), card("dayInLife", {}, 30), card("dayInLife", {}, 3)],
      [],
      { fromPlan: true }
    );
    expect(sections.map((s) => (s.type === "card" ? s.card.id : s.type))).toEqual([
      "dayInLife-3",
      "dayInLife-30",
      "realPeople-2",
      "risks-1",
    ]);
  });

  it("lets an unknown kind follow the card before it", () => {
    const sections = buildDeckSections(
      [card("hook", {}, 0), card("aiImpact", {}, 1), card("mystery", {}, 2), card("salaryProgression", {}, 3)],
      [],
      { fromPlan: true }
    );
    expect(kinds(sections)).toEqual(["hook", "salaryProgression", "aiImpact", "mystery"]);
  });
});

describe("midShare", () => {
  it("follows the salary cards", () => {
    const sections = buildDeckSections(
      [card("sources", {}, 0), card("aiImpact", {}, 1), card("salaryProgression", {}, 2), card("hook", {}, 3)],
      []
    );
    expect(kinds(sections)).toEqual(["hook", "salaryProgression", "midShare", "aiImpact", "outro", "sources"]);
  });
});

describe("fromPlan", () => {
  it("removes the outro, the CTA card and midShare", () => {
    const sections = buildDeckSections(
      [card("hook", {}, 0), card("salaryProgression", {}, 1), card("cta", {}, 2), card("sources", {}, 3)],
      [],
      { fromPlan: true }
    );
    expect(kinds(sections)).toEqual(["hook", "salaryProgression", "sources"]);
    expect(outroCtaCard([card("cta", {}, 2)], { fromPlan: true })).toBeNull();
  });
});

describe("outroCtaCard", () => {
  it("picks the CTA card with the lowest position", () => {
    expect(outroCtaCard([card("cta", {}, 9), card("hook", {}, 0), card("cta", {}, 4)])?.id).toBe("cta-4");
    expect(outroCtaCard([card("hook", {}, 0)])).toBeNull();
  });
});

it("emits nothing for an empty deck", () => {
  expect(buildDeckSections([], [])).toEqual([]);
});
