/**
 * The order of a Career Radar DB deck (`/radar/<slug>` for careers without a
 * code guide, and `?view=deck` / `?from=plan` for those with one).
 *
 * Pure: no React, no Supabase. The deck is one scroll with no chapters, no
 * numbering and no hash navigation. Cards are grouped by kind into a fixed
 * story order so `realPeople` always sits before the CTA, the mid-deck share
 * card follows the salary cards, and sources come last. Code guides
 * (lib/radar-guides) do not use this file.
 */
import type { Database } from "@/lib/supabase/database.types";

export type DeckCardRow = Database["public"]["Tables"]["radar_cards"]["Row"];

/** The card fields the ordering reads. */
export type DeckCardInput = Pick<DeckCardRow, "id" | "kind" | "position" | "content_th" | "content_en">;

export type DeckSection<C extends DeckCardInput = DeckCardRow> =
  | { type: "card"; index: number; card: C }
  /** The RadarSkillExperience rail (start options). Not a card. */
  | { type: "skills"; index: number }
  | { type: "midShare"; index: number }
  | { type: "outro"; index: number };

export type DeckSectionType = DeckSection["type"];

/** `interactive_tap` targets the deck fires (they match GUIDE_EVENT_TARGET_PATTERN). */
export type DeckInteractTarget =
  | "salary:level"
  | "salary:currency"
  | "fantasy:flip"
  | "ai:detail"
  | "skill:open"
  | "skills:expand"
  | "sources:open";

export interface BuildDeckSectionsOptions {
  /** Arrived from the My Path wizard: no outro, no CTA card, no mid-deck share card. */
  fromPlan?: boolean;
}

// ---------------------------------------------------------------------------
// Groups (internal ordering only, never shown to students)
// ---------------------------------------------------------------------------

type DeckGroup =
  | "hook"
  | "reality"
  | "money"
  | "ai"
  | "day"
  | "study"
  | "start"
  | "outro"
  | "sources";

/** Story order of the groups and the card kinds inside each, in display order. */
const GROUP_KINDS: ReadonlyArray<readonly [DeckGroup, readonly string[]]> = [
  ["hook", ["hook"]],
  ["reality", ["fantasyReality"]],
  ["money", ["salaryProgression", "careerSurvival", "marketThailand"]],
  ["ai", ["aiImpact"]],
  ["day", ["dayInLife", "realPeople", "risks"]],
  ["study", ["entryRoutes"]],
  // The skills rail comes first; then the skills `text` card behind "ดูทักษะทั้งหมด".
  ["start", ["text"]],
];

/** Body groups in deck order. `outro` (the CTA card) and `sources` are placed separately. */
const BODY_GROUPS: readonly DeckGroup[] = GROUP_KINDS.map(([group]) => group);

const KIND_TO_GROUP: ReadonlyMap<string, DeckGroup> = new Map<string, DeckGroup>([
  ...GROUP_KINDS.filter(([group]) => group !== "start").flatMap(([group, kinds]) =>
    kinds.map((kind) => [kind, group] as [string, DeckGroup])
  ),
  ["cta", "outro"],
  ["sources", "sources"],
]);

/** Kinds that never render in the deck. */
export const DECK_EXCLUDED_KINDS: ReadonlySet<string> = new Set([
  "reflection",
  "jobs",
  "growthCompare",
  "list",
]);

type CardLike = Pick<DeckCardInput, "kind" | "content_th" | "content_en">;

function cardContent(card: CardLike): Record<string, unknown> {
  const pick = (value: unknown) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  return pick(card.content_th) ?? pick(card.content_en) ?? {};
}

function presentationOf(card: CardLike): string {
  const value = cardContent(card).presentation;
  return typeof value === "string" ? value.toLowerCase() : "";
}

/** The skills `text` card (presentation "skills"). It sits behind an expander. */
export function isSkillsCard(card: CardLike): boolean {
  return card.kind === "text" && presentationOf(card).includes("skill");
}

/**
 * True when the deck drops the card by kind or rule (not by `is_hidden`).
 * Every `text` card except the skills card is dropped: startCarousel cards
 * duplicate the skill rail (commit c8533443), and explore cards, including
 * "ทางนี้คืออะไร", are not part of the deck story.
 */
export function isExcludedFromDeck(card: CardLike): boolean {
  if (DECK_EXCLUDED_KINDS.has(card.kind)) return true;
  if (card.kind === "text") return !isSkillsCard(card);
  return false;
}

/**
 * The group a card belongs to, or null when the deck drops it. A card of an
 * unknown kind joins the group of the nearest preceding card by DB position
 * (`hook` when it is first). It never joins `outro` or `sources`, so after
 * those it joins `start`.
 */
function groupForCard(card: CardLike, prev: DeckGroup | null): DeckGroup | null {
  if (isExcludedFromDeck(card)) return null;
  if (card.kind === "text") return "start"; // only the skills card survives the exclusion
  const known = KIND_TO_GROUP.get(card.kind);
  if (known) return known;
  if (!prev) return "hook";
  if (prev === "outro" || prev === "sources") return "start";
  return prev;
}

function rankInGroup(card: CardLike, group: DeckGroup): number {
  const kinds = GROUP_KINDS.find(([key]) => key === group)?.[1];
  if (!kinds) return 0;
  const rank = kinds.indexOf(card.kind);
  return rank === -1 ? kinds.length : rank;
}

/**
 * Builds the deck: the body groups in story order, with `skills` opening the
 * start group, `midShare` right after the money group, then `outro`, then the
 * sources card.
 *
 * `skills` is the field's skill rail; only its length matters here. The CTA
 * card is never a section: GuideOutro carries its intent action and resource
 * links (read it with `outroCtaCard`).
 */
export function buildDeckSections<C extends DeckCardInput>(
  cards: readonly C[],
  skills: readonly unknown[],
  { fromPlan = false }: BuildDeckSectionsOptions = {}
): DeckSection<C>[] {
  const ordered = cards
    .map((card, i) => ({ card, i }))
    .sort((a, b) => (a.card.position ?? 0) - (b.card.position ?? 0) || a.i - b.i);

  const byGroup = new Map<DeckGroup, Array<{ card: C; i: number }>>();
  let prev: DeckGroup | null = null;
  for (const entry of ordered) {
    const group = groupForCard(entry.card, prev);
    if (!group) continue;
    prev = group;
    // The plan decision bar replaces the CTA in the wizard flow.
    if (fromPlan && group === "outro") continue;
    const list = byGroup.get(group) ?? [];
    list.push(entry);
    byGroup.set(group, list);
  }

  const sortedCards = (group: DeckGroup): C[] =>
    (byGroup.get(group) ?? [])
      .slice()
      .sort(
        (a, b) =>
          rankInGroup(a.card, group) - rankInGroup(b.card, group) ||
          (a.card.position ?? 0) - (b.card.position ?? 0) ||
          a.i - b.i
      )
      .map(({ card }) => card);

  type Draft =
    | { type: "card"; card: C }
    | { type: "skills" }
    | { type: "midShare" }
    | { type: "outro" };
  const drafts: Draft[] = [];

  for (const group of BODY_GROUPS) {
    if (group === "start" && skills.length > 0) drafts.push({ type: "skills" });
    for (const card of sortedCards(group)) drafts.push({ type: "card", card });
    if (group === "money" && !fromPlan && drafts.length > 0) drafts.push({ type: "midShare" });
  }

  if (!fromPlan && drafts.length > 0) drafts.push({ type: "outro" });
  for (const card of sortedCards("sources")) drafts.push({ type: "card", card });

  return drafts.map((draft, index) => ({ ...draft, index }));
}

/**
 * The CTA card whose intent action and resource links GuideOutro shows, or
 * null (also null with `fromPlan`, where the plan decision bar replaces it).
 */
export function outroCtaCard<C extends DeckCardInput>(
  cards: readonly C[],
  { fromPlan = false }: BuildDeckSectionsOptions = {}
): C | null {
  if (fromPlan) return null;
  const ctas = cards.filter((card) => card.kind === "cta");
  if (ctas.length === 0) return null;
  return ctas.reduce((best, card) => ((card.position ?? 0) < (best.position ?? 0) ? card : best));
}
