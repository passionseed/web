/**
 * Game-story contract for code guides: each guide is a RUN through levels
 * (one level per page), told by a host NPC in dialogue boxes, with XP, badges
 * and a shareable profile card at the end. Pure: no React, no DOM, no storage.
 *
 * Used by the shell (levels, XP bar, badge toast, level map), the engines
 * (game results) and the profile card. Persisted state is GuideState
 * (guide-types.ts), called GuideProgress here; lib/radar-guide/guide-state.ts
 * stores it. Keep exported names stable: several units import them.
 */
import type {
  FitOutcome,
  GameResult,
  GradeKey,
  GuideBlock,
  GuideIndexEntry,
  GuideIndexPage,
  GuideState,
  Json,
} from "./guide-types";

// ---------------------------------------------------------------- host
export type HostMood = "idle" | "talk" | "wow" | "serious" | "wink";

export interface GuideHost {
  /** Display name in the dialogue box name tag. */
  nameTh: string;
  nameEn: string;
  /** Small line under the name on the level intro. */
  roleTh: string;
  /**
   * Pixel sprite sheet per mood (public paths, crisp with image-rendering:
   * pixelated). A generic pixel character, never a likeness of a real person.
   * A missing mood falls back to `idle`; a missing file falls back to the CSS
   * sprite in the shell.
   */
  sprites: Readonly<Partial<Record<HostMood, string>>> & { idle: string };
  /** Native sprite size in px, drawn at an integer scale. */
  spriteSize: { w: number; h: number };
}

/**
 * The founder, on camera in the cutscenes and as a pixel NPC everywhere else.
 * TODO(founder): replace the placeholder display name. This is the only place
 * it is set.
 */
export const GUIDE_HOST: GuideHost = {
  nameTh: "พี่โฮสต์",
  nameEn: "Host",
  roleTh: "ไกด์ประจำรัน",
  sprites: {
    idle: "/radar/guides/host/host-idle.webp",
    talk: "/radar/guides/host/host-talk.webp",
  },
  spriteSize: { w: 48, h: 64 },
};

/** Default scene art for a level. Override per page with GuideIndexPage.scene. */
export function levelSceneSrc(slug: string, pageKey: string): string {
  return `/radar/guides/${slug}/${pageKey}.webp`;
}

/** A dialogue box holds about two lines at 360px. guide-lint warns above this. */
export const DIALOGUE_BOX_MAX_CHARS = 72;

/**
 * Splits text into dialogue boxes of at most `max` characters, breaking only at
 * spaces (Thai copy puts spaces between phrases). A single phrase longer than
 * `max` keeps its own box rather than being cut mid-word.
 */
export function splitDialogue(text: string, max = DIALOGUE_BOX_MAX_CHARS): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const boxes: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && next.length > max) {
      boxes.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) boxes.push(current);
  return boxes;
}

// ---------------------------------------------------------------- XP
/**
 * Ids of the trackable games on a level, in page order: game blocks and
 * bespoke blocks with a `track`, including those inside beats. `phase: 2`
 * blocks are left out so the XP maximum stays reachable while they are hidden.
 * Drives GuideIndexPage.games.
 */
export function trackableGames(blocks: readonly GuideBlock[]): string[] {
  const ids: string[] = [];
  for (const block of blocks) {
    if (block.kind === "game" && block.phase !== 2) ids.push(block.id);
    else if (block.kind === "bespoke" && block.track && block.phase !== 2) ids.push(block.id);
    else if (block.kind === "beat") ids.push(...trackableGames(block.blocks));
  }
  return ids;
}

/**
 * XP rules. XP is DERIVED from progress (never accumulated), so replaying a
 * level or a game never farms XP and the bar is the same on every render.
 * - each level cleared: `levelClear`
 * - each trackable game finished by playing: `gamePlayed`
 * - each game finished with "ข้ามเกม ดูเฉลย": `gameSkipped` (still finishes the level)
 * Game XP per level is capped at that level's `games` count.
 */
export const XP_RULES = {
  levelClear: 100,
  gamePlayed: 50,
  gameSkipped: 10,
} as const;

export interface XpSummary {
  xp: number;
  max: number;
  /** 0..1, clamped. */
  ratio: number;
}

function gamesOnPage(state: GuideState, pageKey: string): GameResult[] {
  const prefix = `${pageKey}:`;
  return Object.entries(state.games)
    .filter(([key, result]) => key.startsWith(prefix) && result.done)
    .map(([, result]) => result);
}

export function levelXp(state: GuideState, page: Pick<GuideIndexPage, "key" | "games">): number {
  const cleared = (state.cleared ?? []).includes(page.key) ? XP_RULES.levelClear : 0;
  const cap = page.games ?? 0;
  const done = gamesOnPage(state, page.key);
  const played = done.filter((r) => !r.skipped).length;
  const skipped = done.length - played;
  const playedCounted = Math.min(played, cap);
  const skippedCounted = Math.min(skipped, cap - playedCounted);
  return cleared + playedCounted * XP_RULES.gamePlayed + skippedCounted * XP_RULES.gameSkipped;
}

export function maxXp(pages: readonly Pick<GuideIndexPage, "games">[]): number {
  return pages.reduce((sum, p) => sum + XP_RULES.levelClear + (p.games ?? 0) * XP_RULES.gamePlayed, 0);
}

export function xpSummary(
  state: GuideState,
  pages: readonly Pick<GuideIndexPage, "key" | "games">[]
): XpSummary {
  const xp = pages.reduce((sum, p) => sum + levelXp(state, p), 0);
  const max = maxXp(pages);
  return { xp, max, ratio: max > 0 ? Math.min(1, xp / max) : 0 };
}

// ---------------------------------------------------------------- badges and traits
/** Pixel glyph ids. The shell draws each one; content only names them. */
export type BadgeIcon =
  | "bug"
  | "key"
  | "shield"
  | "radar"
  | "chat"
  | "ladder"
  | "coin"
  | "compass"
  | "map"
  | "terminal"
  | "flag"
  | "star"
  | "heart"
  | "eye";

/**
 * When a badge is earned. `game` takes "<pageKey>:<blockId>" or
 * "<pageKey>:*" (any trackable game on the level).
 */
export type BadgeTrigger =
  | { on: "clear"; pageKey: string }
  | { on: "game"; game: string; perfect?: boolean; allowSkip?: boolean }
  | { on: "choice"; key: string; value?: string }
  | { on: "allCleared" }
  | { on: "xp"; atLeast: number };

export interface BadgeDef {
  id: string; // unique within the guide, [a-z0-9_-]
  nameTh: string; // short, no digits
  descTh: string; // one line shown in the toast
  icon: BadgeIcon;
  trigger: BadgeTrigger;
}

/** Matches a profile trait. A trait applies when any of its rules matches. */
export type TraitRule =
  | { choice: string; value?: string }
  | { fit: FitOutcome }
  | { favourite: string }
  | { perfect: string } // "<pageKey>:<blockId>" or "<pageKey>:*"
  | { cleared: string }
  | { grade: GradeKey }
  | { always: true };

export interface TraitDef {
  id: string;
  labelTh: string; // shown on the profile card, short
  icon: BadgeIcon;
  when: readonly TraitRule[];
}

/** Per-guide story data, carried on GuideIndexEntry.story (light, client-safe). */
export interface GuideStoryMeta {
  /** Profile card title, e.g. "โปรไฟล์สายไซเบอร์ของฉัน". */
  profileTitleTh: string;
  badges: readonly BadgeDef[];
  /** Ordered by priority; the first 3 that match make the card. End with `always` fillers. */
  traits: readonly TraitDef[];
}

function gameMatches(key: string, pattern: string): boolean {
  if (pattern.endsWith(":*")) return key.startsWith(pattern.slice(0, -1));
  return key === pattern;
}

function isPerfect(result: GameResult): boolean {
  return (
    result.done &&
    !result.skipped &&
    typeof result.score === "number" &&
    typeof result.total === "number" &&
    result.total > 0 &&
    result.score >= result.total
  );
}

function anyGame(state: GuideState, pattern: string, test: (r: GameResult) => boolean): boolean {
  return Object.entries(state.games).some(([key, r]) => gameMatches(key, pattern) && test(r));
}

export function badgeEarned(
  def: BadgeDef,
  state: GuideState,
  pages: readonly Pick<GuideIndexPage, "key" | "games">[]
): boolean {
  const t = def.trigger;
  switch (t.on) {
    case "clear":
      return (state.cleared ?? []).includes(t.pageKey);
    case "game":
      return anyGame(state, t.game, (r) => {
        if (!r.done) return false;
        if (r.skipped && !t.allowSkip) return false;
        return t.perfect ? isPerfect(r) : true;
      });
    case "choice": {
      const v = state.choices[t.key];
      return v !== undefined && (t.value === undefined || v === t.value);
    }
    case "allCleared":
      return pages.length > 0 && pages.every((p) => (state.cleared ?? []).includes(p.key));
    case "xp":
      return xpSummary(state, pages).xp >= t.atLeast;
  }
}

function traitMatches(rule: TraitRule, state: GuideState): boolean {
  if ("always" in rule) return true;
  if ("fit" in rule) return typeof state.fit === "string" && state.fit.includes(rule.fit);
  if ("favourite" in rule) return state.favourite === rule.favourite;
  if ("perfect" in rule) return anyGame(state, rule.perfect, isPerfect);
  if ("cleared" in rule) return (state.cleared ?? []).includes(rule.cleared);
  if ("grade" in rule) return state.grade === rule.grade;
  const v = state.choices[rule.choice];
  return v !== undefined && (rule.value === undefined || v === rule.value);
}

/** The first `n` traits (in priority order) whose rules match. Never repeats a trait. */
export function profileTraits(state: GuideState, traits: readonly TraitDef[], n = 3): TraitDef[] {
  return traits.filter((t) => t.when.some((rule) => traitMatches(rule, state))).slice(0, n);
}

// ---------------------------------------------------------------- level map
export type LevelStatus = "cleared" | "current" | "ahead";

export interface LevelNode {
  key: string;
  order: number;
  titleTh: string;
  navLabelTh: string;
  minutes: number;
  status: LevelStatus;
  /** Always true: nothing is truly locked, students can jump anywhere. */
  open: true;
  hasCutscene: boolean;
  games: number;
}

/**
 * The level map. `currentKey` is the page on screen; without it, the current
 * level is the first one not cleared (or the last level when all are cleared).
 * "ahead" levels look locked but stay tappable.
 */
export function levelMap(
  state: GuideState,
  pages: readonly GuideIndexPage[],
  currentKey?: string
): LevelNode[] {
  const cleared = new Set(state.cleared ?? []);
  const sorted = [...pages].sort((a, b) => a.order - b.order);
  const current =
    currentKey && sorted.some((p) => p.key === currentKey)
      ? currentKey
      : (sorted.find((p) => !cleared.has(p.key)) ?? sorted[sorted.length - 1])?.key;
  return sorted.map((p) => ({
    key: p.key,
    order: p.order,
    titleTh: p.titleTh,
    navLabelTh: p.navLabelTh,
    minutes: p.minutes,
    status: p.key === current ? "current" : cleared.has(p.key) ? "cleared" : "ahead",
    open: true,
    hasCutscene: Boolean(p.cutscene),
    games: p.games ?? 0,
  }));
}

export function nextLevelKey(pages: readonly GuideIndexPage[], key: string): string | null {
  const sorted = [...pages].sort((a, b) => a.order - b.order);
  const i = sorted.findIndex((p) => p.key === key);
  return i >= 0 && i < sorted.length - 1 ? sorted[i + 1].key : null;
}

export function prevLevelKey(pages: readonly GuideIndexPage[], key: string): string | null {
  const sorted = [...pages].sort((a, b) => a.order - b.order);
  const i = sorted.findIndex((p) => p.key === key);
  return i > 0 ? sorted[i - 1].key : null;
}

/** Minutes left in the run from `key` on (inclusive), for "เหลือราว N นาที". */
export function minutesLeft(pages: readonly GuideIndexPage[], key: string): number {
  const page = pages.find((p) => p.key === key);
  if (!page) return pages.reduce((s, p) => s + p.minutes, 0);
  return pages.filter((p) => p.order >= page.order).reduce((s, p) => s + p.minutes, 0);
}

// ---------------------------------------------------------------- progress (persisted state)
/** The persisted per-viewer progress. Same object as GuideState. */
export type GuideProgress = GuideState;

export function emptyProgress(): GuideProgress {
  return { v: 1, visited: [], games: {}, choices: {} };
}

const GRADES: readonly GradeKey[] = ["m4", "m5", "m6"];
const FIT_VALUES = /^(?:A|B|C|AB|AC|BC|BA|CA|CB)$/;

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : undefined;
}

function finite(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function cleanGame(value: unknown): GameResult | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;
  if (typeof r.done !== "boolean") return null;
  const out: GameResult = { done: r.done };
  if (r.skipped === true) out.skipped = true;
  for (const k of ["score", "total", "attempts", "ms"] as const) {
    const n = finite(r[k]);
    if (n !== undefined) out[k] = n;
  }
  return out;
}

/**
 * Validates anything read from storage. A non-object, a wrong version or
 * corrupt JSON gives empty progress; unknown or malformed fields are dropped.
 */
export function normalizeProgress(raw: unknown): GuideProgress {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return emptyProgress();
  const r = raw as Record<string, unknown>;
  if (r.v !== 1) return emptyProgress();
  const out = emptyProgress();
  out.visited = stringArray(r.visited) ?? [];
  if (r.games && typeof r.games === "object") {
    for (const [k, v] of Object.entries(r.games as Record<string, unknown>)) {
      const g = cleanGame(v);
      if (g) out.games[k] = g;
    }
  }
  if (r.choices && typeof r.choices === "object") {
    for (const [k, v] of Object.entries(r.choices as Record<string, unknown>)) {
      if (typeof v === "string") out.choices[k] = v;
    }
  }
  if (typeof r.grade === "string" && (GRADES as readonly string[]).includes(r.grade)) {
    out.grade = r.grade as GradeKey;
  }
  if (typeof r.fit === "string" && FIT_VALUES.test(r.fit)) out.fit = r.fit as GuideProgress["fit"];
  const proof = stringArray(r.proof);
  if (proof) out.proof = proof;
  const shortlist = stringArray(r.shortlist);
  if (shortlist) out.shortlist = shortlist;
  if (typeof r.favourite === "string") out.favourite = r.favourite;
  if (r.checklist && typeof r.checklist === "object") {
    const checklist: Record<string, boolean[]> = {};
    for (const [k, v] of Object.entries(r.checklist as Record<string, unknown>)) {
      if (Array.isArray(v)) checklist[k] = v.map((b) => b === true);
    }
    out.checklist = checklist;
  }
  if (r.local && typeof r.local === "object" && !Array.isArray(r.local)) {
    out.local = r.local as GuideProgress["local"];
  }
  const cleared = stringArray(r.cleared);
  if (cleared) out.cleared = cleared;
  const badges = stringArray(r.badges);
  if (badges) out.badges = badges;
  if (r.cutscenes && typeof r.cutscenes === "object") {
    const cutscenes: Record<string, "watched" | "skipped"> = {};
    for (const [k, v] of Object.entries(r.cutscenes as Record<string, unknown>)) {
      if (v === "watched" || v === "skipped") cutscenes[k] = v;
    }
    out.cutscenes = cutscenes;
  }
  if (typeof r.last === "string") out.last = r.last;
  return out;
}

export type ProgressAction =
  | { type: "visit"; pageKey: string }
  /** The viewer reached the end of a level (pressed "ต่อ" past its last beat). */
  | { type: "clear"; pageKey: string }
  | { type: "game"; pageKey: string; blockId: string; result: GameResult }
  | { type: "choice"; key: string; value: string }
  | { type: "grade"; grade: GradeKey }
  | { type: "fit"; fit: NonNullable<GuideState["fit"]> }
  | { type: "proof"; ids: readonly string[] }
  | { type: "shortlist"; ids: readonly string[] }
  | { type: "favourite"; pageKey: string }
  | { type: "checklist"; key: string; values: readonly boolean[] }
  | { type: "cutscene"; pageKey: string; status: "watched" | "skipped" }
  /** Device-only values (birth year, GPAX, drafts). `undefined` removes a key. */
  | { type: "local"; patch: Readonly<Record<string, Json | undefined>> }
  | { type: "reset" };

function addUnique(list: readonly string[] | undefined, value: string): string[] {
  const base = list ?? [];
  return base.includes(value) ? [...base] : [...base, value];
}

function ratio(r: GameResult): number {
  return typeof r.score === "number" && typeof r.total === "number" && r.total > 0 ? r.score / r.total : 0;
}

/**
 * Keeps the better result for a game: done beats not done, played beats
 * skipped, then the higher score ratio; a tie keeps the earlier result.
 */
export function mergeGameResult(prev: GameResult | undefined, next: GameResult): GameResult {
  if (!prev) return next;
  if (prev.done !== next.done) return prev.done ? prev : next;
  const prevPlayed = !prev.skipped;
  const nextPlayed = !next.skipped;
  if (prevPlayed !== nextPlayed) return prevPlayed ? prev : next;
  return ratio(next) > ratio(prev) ? next : prev;
}

/** Pure reducer. Returns the same object when nothing changes. */
export function reduceProgress(state: GuideProgress, action: ProgressAction): GuideProgress {
  switch (action.type) {
    case "visit": {
      if (state.visited.includes(action.pageKey) && state.last === action.pageKey) return state;
      return { ...state, visited: addUnique(state.visited, action.pageKey), last: action.pageKey };
    }
    case "clear": {
      if ((state.cleared ?? []).includes(action.pageKey)) return state;
      return {
        ...state,
        cleared: addUnique(state.cleared, action.pageKey),
        visited: addUnique(state.visited, action.pageKey),
      };
    }
    case "game": {
      const key = `${action.pageKey}:${action.blockId}`;
      const prev = state.games[key];
      const merged = mergeGameResult(prev, action.result);
      if (merged === prev) return state;
      return { ...state, games: { ...state.games, [key]: merged } };
    }
    case "choice":
      if (state.choices[action.key] === action.value) return state;
      return { ...state, choices: { ...state.choices, [action.key]: action.value } };
    case "grade":
      return state.grade === action.grade ? state : { ...state, grade: action.grade };
    case "fit":
      return state.fit === action.fit ? state : { ...state, fit: action.fit };
    case "proof":
      return { ...state, proof: [...action.ids] };
    case "shortlist":
      return { ...state, shortlist: [...action.ids] };
    case "favourite":
      return state.favourite === action.pageKey ? state : { ...state, favourite: action.pageKey };
    case "checklist":
      return { ...state, checklist: { ...(state.checklist ?? {}), [action.key]: [...action.values] } };
    case "cutscene": {
      const prev = state.cutscenes?.[action.pageKey];
      // "watched" sticks: skipping a replay never downgrades it.
      if (prev === action.status || prev === "watched") return state;
      return { ...state, cutscenes: { ...(state.cutscenes ?? {}), [action.pageKey]: action.status } };
    }
    case "local": {
      const local: NonNullable<GuideState["local"]> = { ...(state.local ?? {}) };
      for (const [k, v] of Object.entries(action.patch)) {
        if (v === undefined) delete local[k];
        else local[k] = v;
      }
      return { ...state, local };
    }
    case "reset":
      return emptyProgress();
  }
}

export interface StoryContext {
  pages: readonly Pick<GuideIndexPage, "key" | "games">[];
  badges: readonly BadgeDef[];
}

export interface StepResult {
  state: GuideProgress;
  /** Badges earned by this action, in definition order: one toast each. */
  earned: BadgeDef[];
  /** XP gained by this action (0 when nothing new). */
  xpGained: number;
}

/** Badges whose trigger is met but are not in `state.badges` yet. */
export function newlyEarnedBadges(
  state: GuideProgress,
  ctx: StoryContext
): BadgeDef[] {
  const have = new Set(state.badges ?? []);
  return ctx.badges.filter((b) => !have.has(b.id) && badgeEarned(b, state, ctx.pages));
}

/**
 * Applies an action, then awards any badge it unlocked. The shell shows a
 * toast per `earned` badge and animates the XP bar by `xpGained`.
 */
export function stepProgress(state: GuideProgress, action: ProgressAction, ctx: StoryContext): StepResult {
  const before = xpSummary(state, ctx.pages).xp;
  let next = reduceProgress(state, action);
  const earned = action.type === "reset" ? [] : newlyEarnedBadges(next, ctx);
  if (earned.length) {
    next = { ...next, badges: [...(next.badges ?? []), ...earned.map((b) => b.id)] };
  }
  const after = xpSummary(next, ctx.pages).xp;
  return { state: next, earned, xpGained: Math.max(0, after - before) };
}

/** Builds the StoryContext from an index entry (the shell passes the derived index). */
export function storyContext(entry: Pick<GuideIndexEntry, "pages" | "story">): StoryContext {
  return { pages: entry.pages, badges: entry.story?.badges ?? [] };
}

// ---------------------------------------------------------------- profile card
export interface ProfileCard {
  slug: string;
  careerTh: string;
  titleTh: string;
  traits: TraitDef[];
  xp: number;
  maxXp: number;
  levelsCleared: number;
  levelsTotal: number;
  badges: BadgeDef[];
}

/**
 * The end-of-run card ("โปรไฟล์สายไซเบอร์ของฉัน"): pixel avatar + 3 traits + XP.
 * Built on the device from local progress only; carries no name or free text.
 */
export function buildProfileCard(
  state: GuideProgress,
  entry: Pick<GuideIndexEntry, "slug" | "nameTh" | "pages" | "story">
): ProfileCard {
  const { xp, max } = xpSummary(state, entry.pages);
  const pageKeys = new Set(entry.pages.map((p) => p.key));
  const badgeDefs = entry.story?.badges ?? [];
  const earned = new Set(state.badges ?? []);
  return {
    slug: entry.slug,
    careerTh: entry.nameTh,
    titleTh: entry.story?.profileTitleTh ?? entry.nameTh,
    traits: profileTraits(state, entry.story?.traits ?? []),
    xp,
    maxXp: max,
    levelsCleared: (state.cleared ?? []).filter((k) => pageKeys.has(k)).length,
    levelsTotal: entry.pages.length,
    badges: badgeDefs.filter((b) => earned.has(b.id)),
  };
}
