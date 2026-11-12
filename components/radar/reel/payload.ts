/**
 * Builds what the motion reel shows, `window.__RADAR_REEL__`, from a career's
 * code guide (lib/radar-guides/<slug>) and, as a fallback, a radar dump. Pure
 * and client-safe (type imports only from the guide): `radar:reel` calls it in
 * Node and the tests call it on fixtures.
 *
 * With a guide, every number on screen comes from guide copy whose number
 * tokens all appear in a cited fact (values or claimEn). Simulated and pending
 * facts never reach a reel. Without a guide, card numbers stand in, and each
 * use is listed in `notes` so the CLI warns that they are not fact-checked.
 * The AI score is always labelled "ทีมเราประเมิน": our estimate, not a source.
 */
import type { CareerGuide, CopyText, Fact, FactId, GuideBlock, GuidePage } from "../../../lib/radar-guide/guide-types";
import { RADAR_LINK_ALIASES } from "../../../lib/radar-guide/short-links";
import { containsNumber, sanitizeDashes } from "../../../lib/radar-guide/thai-copy";
import type { RadarCardRow } from "../../../lib/radar-guide/types";

export const RADAR_REEL_SERIES_TAG = "CAREER RADAR";
export const RADAR_REEL_KEYWORD = "RADAR";
export const ESTIMATE_LABEL_TH = "ทีมเราประเมิน";

export type RadarReelPlatform = "ig" | "tt";
/** career: the 30-second career reel; page: one guide level; compare: two careers. */
export type RadarReelMode = "career" | "page" | "compare";

/** A line of copy and the number in it to light up (null when it has none). */
export interface ReelLine {
  text: string;
  highlight: string | null;
}

export interface CompareSide {
  nameTh: string;
  money: ReelLine | null;
  aiScore: number | null;
  firstStep: string | null;
}

export interface RadarReelPayload {
  version: 1;
  slug: string;
  platform: RadarReelPlatform;
  mode: RadarReelMode;
  /** Guide page key in page mode, else null. */
  page: string | null;
  nameTh: string;
  nameEn: string;
  seriesTag: string;
  hook: { line: string; stat: ReelLine | null };
  reality: { fantasy: string; reality: string } | null;
  money: { title: string; rows: ReelLine[] } | null;
  ai: { score: number | null; label: string; points: string[] } | null;
  day: { title: string; items: string[] } | null;
  study: { title: string; items: string[] } | null;
  start: { title: string; makes: string | null; free: boolean; minutes: number | null } | null;
  end: { kind: "comment_radar" | "tiktok_alias"; keyword: string; headline: string; sub: string; sendToFriend: string | null };
  compare: { left: CompareSide; right: CompareSide } | null;
  /** Short source labels shown small on screen, for example "JobsDB · ISC2". */
  sources: string[];
  /** For the CLI only (never rendered): where card data stood in for guide data. */
  notes: string[];
}

/** The parts of a dump the reel reads. */
export interface ReelDumpLike {
  slug: string;
  name_th: string;
  name_en: string;
  radar_cards: Pick<RadarCardRow, "kind" | "position" | "is_hidden" | "content_th">[];
  radar_skills?: Array<{
    is_primary: boolean;
    sort_order: number | null;
    start_options: Array<{ title_th: string; summary_th: string | null; sort_order: number | null; metadata: Record<string, unknown> }>;
  }>;
}

const LIMITS = { line: 64, item: 44, rows: 3, items: 4, points: 2 } as const;

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter("th", { granularity: "word" }) : null;

/** Shortens Thai text at a word boundary (never mid-word) and adds an ellipsis. */
export function clipText(text: string, max: number): string {
  const clean = sanitizeDashes(text.replace(/\s+/g, " ").trim());
  if (Array.from(clean).length <= max) return clean;
  const parts = segmenter ? Array.from(segmenter.segment(clean), (s) => s.segment) : clean.split(/(\s+)/);
  let out = "";
  for (const part of parts) {
    if (Array.from(out + part).length > max - 1) break;
    out += part;
  }
  return `${(out || Array.from(clean).slice(0, max - 1).join("")).trimEnd()}…`;
}

const NUMBER_TOKEN = /[+]?[฿$]?\d[\d,.]*(?:\s?(?:%|k\+?|K\+?|\+))?/;

/** "เฉลี่ย ฿35,500/เดือน · JobsDB" → highlight "฿35,500". */
export function toReelLine(text: string, max: number = LIMITS.line): ReelLine {
  const clipped = clipText(text, max);
  const match = clipped.match(NUMBER_TOKEN);
  return { text: clipped, highlight: match ? match[0].trim() : null };
}

function stripGloss(text: string): string {
  return text.replace(/\s*\([^)]*\)/g, "").trim();
}

function contentOf(card: Pick<RadarCardRow, "content_th">): Record<string, unknown> {
  const value = card.content_th;
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function findCard(dump: ReelDumpLike | null, kind: string): Record<string, unknown> | null {
  if (!dump) return null;
  const card = dump.radar_cards
    .filter((c) => !c.is_hidden && c.kind === kind)
    .sort((a, b) => a.position - b.position)[0];
  return card ? contentOf(card) : null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

// ---------------------------------------------------------------------------
// Fact-backed guide lines
// ---------------------------------------------------------------------------

const THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙";
const DIGIT_RUN = /[0-9๐-๙]+(?:[.,][0-9๐-๙]+)*/g;
/** Same exemptions as guide-lint: grade labels, round names, placeholders. */
const EXEMPT = [/ม\.\s?[0-9๐-๙]/g, /TCAS\s?[67][0-9]/gi, /รอบ(?:ที่)?\s?[0-9๐-๙]/g, /\{[^}]*\}/g];

/** Number tokens, Thai digits converted and commas dropped: "35,500" -> "35500". */
export function reelNumberTokens(text: string): string[] {
  let out = text;
  for (const pattern of EXEMPT) out = out.replace(pattern, " ");
  out = out.replace(/[๐-๙]/g, (d) => String(THAI_DIGITS.indexOf(d)));
  return (out.match(DIGIT_RUN) ?? []).map((t) => t.replace(/,/g, ""));
}

function backed(token: string, facts: readonly Fact[]): boolean {
  const pool = new Set(facts.flatMap((f) => [...reelNumberTokens(f.claimEn), ...(f.values ?? []).flatMap(reelNumberTokens)]));
  if (pool.has(token)) return true;
  const n = Number(token);
  return /^\d{4}$/.test(token) && n >= 2400 && n <= 2700 && pool.has(String(n - 543));
}

export interface GuideLine {
  text: string;
  numeric: boolean;
  facts: Fact[];
}

/** Every piece of copy a page shows (copy, items, dialogue), depth first through beats. */
function pageTexts(blocks: readonly GuideBlock[]): { text: CopyText; simulated: boolean }[] {
  const out: { text: CopyText; simulated: boolean }[] = [];
  for (const block of blocks) {
    if (block.kind === "copy") out.push({ text: block.text, simulated: false });
    else if (block.kind === "item") out.push({ text: block.text, simulated: Boolean(block.simulated) });
    else if (block.kind === "dialogue") block.lines.forEach((l) => out.push({ text: l.text, simulated: false }));
    else if (block.kind === "beat") out.push(...pageTexts(block.blocks));
  }
  return out;
}

/**
 * A guide line the reel may print: no numbers, or every number backed by a
 * confirmed or vendor fact it cites (the page's facts when it cites none).
 * Simulated text and pending or simulated facts are never used. Returns null
 * for anything else.
 */
export function factBackedLine(text: CopyText, page: Pick<GuidePage, "factIds">, facts: readonly Fact[], simulated = false): GuideLine | null {
  if (simulated || text.badge === "simulated" || text.badge === "pending") return null;
  const unusable = (f: Fact) => f.badge === "simulated" || f.badge === "pending" || f.id.startsWith("sim.");
  const own = facts.filter((f) => (text.factIds ?? []).includes(f.id));
  if (own.some(unusable)) return null;
  const tokens = reelNumberTokens(text.th);
  if (!tokens.length) {
    // Spelled-out numbers cannot be checked against a fact here: leave them out.
    if (containsNumber(text.th)) return null;
    return { text: text.th, numeric: false, facts: own };
  }
  const ids: readonly FactId[] = text.factIds?.length ? text.factIds : page.factIds;
  const cited = facts.filter((f) => ids.includes(f.id) && !unusable(f));
  if (!tokens.every((t) => backed(t, cited))) return null;
  return { text: text.th, numeric: true, facts: cited };
}

function guideLines(page: GuidePage, facts: readonly Fact[]): GuideLine[] {
  return pageTexts(page.blocks)
    .map(({ text, simulated }) => factBackedLine(text, page, facts, simulated))
    .filter((l): l is GuideLine => l !== null);
}

function sortedPages(guide: CareerGuide): GuidePage[] {
  return [...guide.pages].sort((a, b) => a.order - b.order);
}

function firstStepLink(guide: CareerGuide): string | null {
  const find = (blocks: readonly GuideBlock[]): string | null => {
    for (const b of blocks) {
      if (b.kind === "link" && b.cta === "first-step") return b.labelTh;
      if (b.kind === "beat") {
        const inner = find(b.blocks);
        if (inner) return inner;
      }
    }
    return null;
  };
  for (const page of sortedPages(guide).reverse()) {
    const hit = find(page.blocks);
    if (hit) return hit;
  }
  return null;
}

function sourceLabels(facts: readonly Fact[]): string[] {
  const out: string[] = [];
  for (const fact of facts) {
    const outlet = fact.sources[0]?.outlet?.trim();
    if (outlet && !out.includes(outlet)) out.push(outlet);
  }
  return out.slice(0, 4);
}

// ---------------------------------------------------------------------------
// Card fallbacks (no guide)
// ---------------------------------------------------------------------------

export function tiktokAlias(slug: string, guide?: Pick<CareerGuide, "meta"> | null): string {
  if (guide?.meta.alias) return guide.meta.alias;
  return Object.entries(RADAR_LINK_ALIASES).find(([, s]) => s === slug)?.[0] ?? slug;
}

function cardHook(dump: ReelDumpLike | null, nameTh: string, notes: string[]) {
  const card = findCard(dump, "hook");
  const stat = [str(card?.stat), str(card?.statLabel)].filter(Boolean).join(" ");
  if (stat) notes.push("hook stat comes from the hook card, not a fact-checked guide line");
  return {
    line: clipText(str(card?.eyebrow) || `${nameTh} ใน 30 วินาที`, LIMITS.line),
    stat: stat ? toReelLine(stat) : null,
  };
}

function cardReality(dump: ReelDumpLike | null) {
  const card = findCard(dump, "fantasyReality");
  if (!card || !str(card.fantasy) || !str(card.reality)) return null;
  return { fantasy: clipText(str(card.fantasy), LIMITS.line), reality: clipText(str(card.reality), LIMITS.line) };
}

function cardMoney(dump: ReelDumpLike | null, notes: string[]) {
  const card = findCard(dump, "salaryProgression");
  const levels = Array.isArray(card?.levels) ? (card!.levels as Record<string, unknown>[]) : [];
  const rows = levels
    .filter((l) => str(l.salary))
    .slice(0, LIMITS.rows)
    .map((l) => toReelLine(`${stripGloss(str(l.level))}: ${str(l.salary)}`));
  if (!rows.length) return null;
  notes.push("salary rows come from the salaryProgression card, not fact-checked guide copy; check them before posting");
  return { title: clipText(str(card?.title) || "เงินเดือน", LIMITS.line), rows };
}

function aiScoreOf(dump: ReelDumpLike | null): number | null {
  const score = findCard(dump, "aiImpact")?.ai_risk_score;
  return typeof score === "number" && score >= 0 && score <= 10 ? score : null;
}

function cardAi(dump: ReelDumpLike | null) {
  const card = findCard(dump, "aiImpact");
  const score = aiScoreOf(dump);
  const points = [...(Array.isArray(card?.automated) ? card!.automated : [])]
    .map((s) => clipText(`AI ทำแทน: ${stripGloss(str(s))}`, LIMITS.line))
    .slice(0, LIMITS.points);
  if (score === null && points.length === 0) return null;
  return { score, label: ESTIMATE_LABEL_TH, points };
}

function list(items: string[], title: string) {
  const out = items.filter(Boolean).slice(0, LIMITS.items).map((l) => clipText(l, LIMITS.item));
  return out.length ? { title, items: out } : null;
}

function cardDay(dump: ReelDumpLike | null) {
  const card = findCard(dump, "dayInLife");
  const steps = Array.isArray(card?.steps) ? (card!.steps as Record<string, unknown>[]) : [];
  return list(steps.map((s) => stripGloss(str(s.label))), "ทั้งวันทำอะไร");
}

function cardStart(dump: ReelDumpLike | null, notes: string[]) {
  const option = (dump?.radar_skills ?? [])
    .slice()
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .flatMap((s) => s.start_options.slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)))[0];
  if (!option) return null;
  notes.push("first step comes from the start options, not the guide");
  const cost = option.metadata.cost;
  return {
    title: clipText(option.title_th, LIMITS.line),
    makes: option.summary_th ? clipText(option.summary_th, LIMITS.line) : null,
    free: typeof cost === "string" && /ฟรี|free/i.test(cost),
    minutes: null,
  };
}

// ---------------------------------------------------------------------------
// Guide scenes
// ---------------------------------------------------------------------------

function guideHook(page: GuidePage, facts: readonly Fact[], used: Fact[]) {
  const reelHook = page.reel ? factBackedLine(page.reel.hook, page, facts) : null;
  const stat = page.og.stat ? factBackedLine(page.og.stat, page, facts) : null;
  if (reelHook) used.push(...reelHook.facts);
  if (stat) used.push(...stat.facts);
  return {
    line: clipText(reelHook?.text ?? page.og.headlineTh, LIMITS.line),
    stat: stat ? toReelLine(stat.text) : null,
  };
}

function guideRows(page: GuidePage, facts: readonly Fact[], used: Fact[]) {
  const rows = guideLines(page, facts).filter((l) => l.numeric).slice(0, LIMITS.rows);
  rows.forEach((r) => used.push(...r.facts));
  return rows.length ? { title: clipText(page.titleTh, LIMITS.line), rows: rows.map((r) => toReelLine(r.text)) } : null;
}

function guideItems(page: GuidePage, facts: readonly Fact[], used: Fact[]) {
  const lines = guideLines(page, facts).filter((l) => !l.numeric).slice(0, LIMITS.items);
  lines.forEach((l) => used.push(...l.facts));
  return list(lines.map((l) => l.text), clipText(page.questionTh, LIMITS.line));
}

// ---------------------------------------------------------------------------
// Payload
// ---------------------------------------------------------------------------

export interface BuildPayloadInput {
  /** Card data. Optional when a guide is given. */
  dump?: ReelDumpLike | null;
  /** The career's code guide. */
  guide?: CareerGuide | null;
  /** Shared + career facts (registry guideFacts). Defaults to guide.facts. */
  facts?: readonly Fact[];
  platform: RadarReelPlatform;
  /** A one-level reel: hook, that page's lines, end card. Needs a guide. */
  page?: string | null;
  /** A "เทียบ 2 อาชีพ" reel against this career. */
  compareWith?: { dump?: ReelDumpLike | null; guide?: CareerGuide | null; facts?: readonly Fact[] } | null;
}

/** The end card: the comment keyword on IG, the typeable /r alias on TikTok (page reels add the page key). */
export function reelEndCard(input: {
  slug: string;
  alias?: string | null;
  platform: RadarReelPlatform;
  pageKey?: string | null;
  sendToFriendTh?: string | null;
}): RadarReelPayload["end"] {
  const sendToFriend = input.sendToFriendTh?.trim() ? clipText(input.sendToFriendTh, LIMITS.line) : null;
  if (input.platform === "tt") {
    const alias = input.alias || tiktokAlias(input.slug);
    const url = `passionseed.org/r/${input.pageKey ? `${alias}-${input.pageKey}` : alias}`;
    return { kind: "tiktok_alias", keyword: url, headline: "ข้อมูลเต็ม พิมพ์", sub: url, sendToFriend };
  }
  return {
    kind: "comment_radar",
    keyword: RADAR_REEL_KEYWORD,
    headline: `คอมเมนต์ ${RADAR_REEL_KEYWORD}`,
    sub: "รับลิงก์ทาง DM",
    sendToFriend,
  };
}

function buildEnd(slug: string, guide: CareerGuide | null, platform: RadarReelPlatform, page: GuidePage | null) {
  const plan = page?.reel ?? (guide ? sortedPages(guide)[0]?.reel : undefined);
  return reelEndCard({ slug, alias: tiktokAlias(slug, guide), platform, pageKey: page?.key ?? null, sendToFriendTh: plan?.sendToFriendTh });
}

function names(dump: ReelDumpLike | null, guide: CareerGuide | null): { slug: string; nameTh: string; nameEn: string } {
  if (guide) return { slug: guide.meta.slug, nameTh: guide.meta.nameTh, nameEn: guide.meta.nameEn };
  if (dump) return { slug: dump.slug, nameTh: dump.name_th, nameEn: dump.name_en };
  throw new Error("buildRadarReelPayload needs a dump or a guide.");
}

function compareSide(dump: ReelDumpLike | null, guide: CareerGuide | null, facts: readonly Fact[], used: Fact[], notes: string[]): CompareSide {
  const moneyPage = guide?.pages.find((p) => p.key === "money") ?? null;
  const money = (moneyPage && guideRows(moneyPage, facts, used)) || cardMoney(dump, notes);
  const step = guide ? firstStepLink(guide) : null;
  const start = step ? { title: step } : cardStart(dump, notes);
  return {
    nameTh: clipText(names(dump, guide).nameTh, 28),
    money: money?.rows[0] ?? null,
    aiScore: aiScoreOf(dump),
    firstStep: start ? clipText(start.title, LIMITS.item) : null,
  };
}

export function buildRadarReelPayload(input: BuildPayloadInput): RadarReelPayload {
  const { platform } = input;
  const dump = input.dump ?? null;
  const guide = input.guide ?? null;
  const facts = input.facts ?? guide?.facts ?? [];
  const { slug, nameTh, nameEn } = names(dump, guide);
  const notes: string[] = [];
  const used: Fact[] = [];

  let page: GuidePage | null = null;
  if (input.page) {
    if (!guide) throw new Error(`A page reel needs the career's code guide (page "${input.page}").`);
    page = guide.pages.find((p) => p.key === input.page) ?? null;
    if (!page) throw new Error(`The ${slug} guide has no page "${input.page}".`);
  }
  const mode: RadarReelMode = input.compareWith ? "compare" : page ? "page" : "career";
  if (!guide) notes.push("no code guide: every scene uses card data");

  const base: RadarReelPayload = {
    version: 1,
    slug,
    platform,
    mode,
    page: page?.key ?? null,
    nameTh,
    nameEn,
    seriesTag: RADAR_REEL_SERIES_TAG,
    hook: { line: "", stat: null },
    reality: null,
    money: null,
    ai: null,
    day: null,
    study: null,
    start: null,
    end: buildEnd(slug, guide, platform, page),
    compare: null,
    sources: [],
    notes,
  };

  if (mode === "compare" && input.compareWith) {
    const other = input.compareWith;
    const otherGuide = other.guide ?? null;
    const otherNames = names(other.dump ?? null, otherGuide);
    base.compare = {
      left: compareSide(dump, guide, facts, used, notes),
      right: compareSide(other.dump ?? null, otherGuide, other.facts ?? otherGuide?.facts ?? [], used, notes),
    };
    base.hook = { line: clipText(`${nameTh} กับ ${otherNames.nameTh}`, LIMITS.line), stat: null };
  } else if (mode === "page" && page) {
    base.hook = guideHook(page, facts, used);
    base.money = guideRows(page, facts, used);
    base.day = guideItems(page, facts, used);
    if (!base.money && !base.day) notes.push(`page "${page.key}" has no fact-backed lines to show; the reel is hook and end card only`);
  } else if (guide) {
    const pages = sortedPages(guide);
    base.hook = guideHook(pages[0], facts, used);
    const moneyPage = guide.pages.find((p) => p.key === "money");
    base.money = (moneyPage && guideRows(moneyPage, facts, used)) || cardMoney(dump, notes);
    base.reality = cardReality(dump);
    base.ai = cardAi(dump);
    base.day = cardDay(dump);
    const step = firstStepLink(guide);
    base.start = step ? { title: clipText(step, LIMITS.line), makes: null, free: false, minutes: null } : cardStart(dump, notes);
  } else {
    base.hook = cardHook(dump, nameTh, notes);
    base.reality = cardReality(dump);
    base.money = cardMoney(dump, notes);
    base.ai = cardAi(dump);
    base.day = cardDay(dump);
    base.start = cardStart(dump, notes);
  }

  base.sources = sourceLabels(used);
  return base;
}

/** Light check of an injected payload in the browser. */
export function isRadarReelPayload(value: unknown): value is RadarReelPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<RadarReelPayload>;
  return v.version === 1 && typeof v.slug === "string" && typeof v.nameTh === "string" && !!v.hook && !!v.end;
}
