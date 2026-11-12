/**
 * Fact and copy checks for code guides (docs/features/radar-guides-in-code.md
 * section 1.3). Pure apart from hashing: used by Jest (guides.test.ts) and by
 * `pnpm radar:check`. Never imported by client code.
 *
 * Every check returns issues instead of throwing, so one run lists them all.
 */
import { createHash } from "node:crypto";
import { findDashes, containsNumber } from "./thai-copy";
import {
  GUIDE_EVENT_TARGET_PATTERN,
  RADAR_GUIDE_POSTER_URL_PATTERN,
  RADAR_GUIDE_VIDEO_URL_PATTERN,
  RADAR_SLUG_PATTERN,
} from "./types";
import { parseVtt } from "./vtt";
import {
  GUIDE_PAGE_KEY_PATTERN,
  RESERVED_GUIDE_SLUGS,
  RESERVED_PAGE_KEYS,
  type BannedClaim,
  type CareerGuide,
  type ClipManifest,
  type CopyText,
  type Fact,
  type FactId,
  type GuideBlock,
  type GuidePage,
  type GameTrack,
} from "./guide-types";
import { DIALOGUE_BOX_MAX_CHARS, trackableGames, type GuideStoryMeta } from "./story";

export type LintLevel = "error" | "warn";
export interface LintIssue {
  level: LintLevel;
  /** null for guide-wide issues (meta, facts, story). */
  pageKey: string | null;
  /** Where in the guide, e.g. "blocks[2].text.th" or "facts[f.mythos52]". */
  path: string;
  message: string;
}

export interface ClipCheckInput {
  manifest: ClipManifest;
  /** Reads lib/radar-guides/<slug>/<captionsFile>; null when missing. */
  readVtt(captionsFile: string): string | null;
}

export interface GuideLintOptions {
  /** Facts from lib/radar-guides/_shared, merged with the guide's own. */
  sharedFacts?: readonly Fact[];
  /** Global Must-not-say list (lib/radar-guides/banned.ts). */
  globalBanned?: readonly BannedClaim[];
  /** Run date. Default: now. */
  now?: Date;
  /** `radar:check --max-age N`: pages older than N days are errors. */
  maxAgeDays?: number;
  clips?: ClipCheckInput;
  /** `radar:check` only: a required clip missing on a live guide is an error. */
  requireClips?: boolean;
}

export const STALE_WARN_DAYS = 45;
export const STALE_ERROR_DAYS = 120;
export const VTT_MAX_BYTES = 20 * 1024;

/** sha256(scriptLinesTh.join("\n")).slice(0, 12): recorded in clips.json by radar:clip. */
export function clipScriptHash(lines: readonly string[]): string {
  return createHash("sha256").update(lines.join("\n")).digest("hex").slice(0, 12);
}

// ---------------------------------------------------------------- numbers
const THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙";
const NUMBER_TOKEN = /[0-9๐-๙]+(?:[.,][0-9๐-๙]+)*/g;
/** Never need a fact: grade labels, round names, template placeholders. */
const EXEMPT_PATTERNS = [/ม\.\s?[0-9๐-๙]/g, /TCAS\s?[67][0-9]/gi, /รอบ(?:ที่)?\s?[0-9๐-๙]/g, /\{[^}]*\}/g];

function toArabic(text: string): string {
  return text.replace(/[๐-๙]/g, (d) => String(THAI_DIGITS.indexOf(d)));
}

function stripExempt(text: string): string {
  let out = text;
  for (const pattern of EXEMPT_PATTERNS) out = out.replace(pattern, " ");
  return out;
}

/** Number tokens, comma-normalised, Thai digits converted: "35,500" -> "35500". */
export function numberTokens(text: string): string[] {
  const tokens = toArabic(stripExempt(text)).match(NUMBER_TOKEN) ?? [];
  return tokens.map((t) => t.replace(/,/g, "")).filter((t) => t.length > 0);
}

function backedTokens(facts: readonly Fact[]): Set<string> {
  const set = new Set<string>();
  for (const fact of facts) {
    for (const t of numberTokens(fact.claimEn)) set.add(t);
    for (const v of fact.values ?? []) for (const t of numberTokens(v)) set.add(t);
  }
  return set;
}

function isBacked(token: string, backed: Set<string>): boolean {
  if (backed.has(token)) return true;
  // A Buddhist-era year (2569) is backed by its Gregorian year (2026) in the claim.
  const n = Number(token);
  if (/^\d{4}$/.test(token) && n >= 2400 && n <= 2700) return backed.has(String(n - 543));
  return false;
}

/** True when the text spells a number in words (สามหมื่น) after digits are removed. */
function spellsNumber(text: string): boolean {
  const noDigits = stripExempt(text).replace(/[0-9๐-๙%]/g, " ");
  return containsNumber(noDigits);
}

// ---------------------------------------------------------------- text collection
type Scope = "copy" | "clip" | "reel";
interface TextRef {
  pageKey: string | null;
  path: string;
  text: string;
  scope: Scope;
  /** Facts the digits may come from; null skips the digit check (simulated or no digits allowed). */
  backing: readonly FactId[] | null;
  /** True for text that may carry no digits at all (story meta). */
  noDigits?: boolean;
  spelled: "warn" | "error" | "skip";
}

/** Display-string keys in engine data that do not end in "Th". */
const DISPLAY_KEYS = new Set(["lines", "favourites", "output", "options"]);
const FACT_REF_KEYS = new Set(["factId", "factIds", "answerFactId", "simulatedFactId"]);

function isDisplayKey(key: string): boolean {
  return key === "th" || key.endsWith("Th") || DISPLAY_KEYS.has(key);
}

/**
 * Walks a JSON-ish value and reports display strings with their key path.
 * Arrays inherit their key. A record reached directly under a display key
 * (nearMissTh, gradeBannersTh, RecapCard lines) is keyed by data, so its
 * entries inherit the display key too; objects inside arrays use their own keys
 * (FindLine `lines[].code` is code, not copy).
 */
function deepDisplayStrings(
  value: unknown,
  path: string,
  key: string,
  out: { path: string; text: string }[],
  viaArray = false
): void {
  if (typeof value === "string") {
    if (isDisplayKey(key)) out.push({ path, text: value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => deepDisplayStrings(v, `${path}[${i}]`, key, out, true));
    return;
  }
  if (value && typeof value === "object" && !(value instanceof RegExp)) {
    const record = !viaArray && key !== "th" && isDisplayKey(key);
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      deepDisplayStrings(v, `${path}.${k}`, record ? key : k, out);
    }
  }
}

/** Every fact id referenced anywhere inside a value (factId, factIds, answerFactId, simulatedFactId). */
function deepFactRefs(value: unknown, path: string, out: { path: string; id: string }[]): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => deepFactRefs(v, `${path}[${i}]`, out));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (FACT_REF_KEYS.has(k)) {
      if (typeof v === "string") out.push({ path: `${path}.${k}`, id: v });
      else if (Array.isArray(v)) v.forEach((id, i) => typeof id === "string" && out.push({ path: `${path}.${k}[${i}]`, id }));
    } else {
      deepFactRefs(v, `${path}.${k}`, out);
    }
  }
}

/** CopyText objects inside engine data (LadderRebuild captions, terminal poll). */
function deepCopyTexts(value: unknown, path: string, out: { path: string; copy: CopyText }[]): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => deepCopyTexts(v, `${path}[${i}]`, out));
    return;
  }
  if (!value || typeof value !== "object") return;
  const obj = value as Record<string, unknown>;
  if (typeof obj.th === "string") {
    out.push({ path, copy: obj as unknown as CopyText });
    return;
  }
  for (const [k, v] of Object.entries(obj)) deepCopyTexts(v, `${path}.${k}`, out);
}

function blockIsSimulated(block: GuideBlock): boolean {
  if (block.kind === "bespoke" || block.kind === "item") return Boolean(block.simulated);
  if (block.kind !== "game") return false;
  const data = block.game.data as unknown as Record<string, unknown>;
  return typeof data.simulatedFactId === "string" || Boolean(data.simulated);
}

interface Collected {
  texts: TextRef[];
  factRefs: { pageKey: string; path: string; id: string; copyLevel: boolean }[];
  blockIds: { path: string; id: string }[];
  clipBlocks: string[];
  safetyBlocks: number;
  tracks: { path: string; track: GameTrack }[];
  games: { path: string; answers: readonly string[] }[];
  simulated: { path: string; ids: string[] }[];
  deadlines: { path: string; at: unknown }[];
  dialogues: { path: string; lines: number }[];
}

function collectDeadlines(value: unknown, path: string, out: Collected["deadlines"]): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => collectDeadlines(v, `${path}[${i}]`, out));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (k === "deadline" && v && typeof v === "object") out.push({ path: `${path}.deadline`, at: (v as { at?: unknown }).at });
    else collectDeadlines(v, `${path}.${k}`, out);
  }
}

function copyBacking(copy: CopyText, page: GuidePage): readonly FactId[] {
  return copy.factIds && copy.factIds.length ? copy.factIds : page.factIds;
}

function collectBlocks(page: GuidePage, blocks: readonly GuideBlock[], base: string, c: Collected): void {
  const pageKey = page.key;
  const addCopy = (copy: CopyText, path: string, simulated = false) => {
    c.texts.push({
      pageKey,
      path: `${path}.th`,
      text: copy.th,
      scope: "copy",
      backing: simulated ? null : copyBacking(copy, page),
      spelled: "warn",
    });
    (copy.factIds ?? []).forEach((id, i) =>
      c.factRefs.push({ pageKey, path: `${path}.factIds[${i}]`, id, copyLevel: true })
    );
  };
  const addString = (text: string, path: string, backing: readonly FactId[] | null) =>
    c.texts.push({ pageKey, path, text, scope: "copy", backing, spelled: "warn" });

  blocks.forEach((block, i) => {
    const path = `${base}[${i}]`;
    c.blockIds.push({ path, id: block.id });
    switch (block.kind) {
      case "copy":
        addCopy(block.text, `${path}.text`);
        if (block.titleTh) addString(block.titleTh, `${path}.titleTh`, copyBacking(block.text, page));
        break;
      case "game":
      case "bespoke": {
        const simulated = blockIsSimulated(block);
        const payload = block.kind === "game" ? block.game.data : (block.props ?? {});
        const refs: { path: string; id: string }[] = [];
        deepFactRefs(payload, `${path}.data`, refs);
        if (block.kind === "bespoke") (block.factIds ?? []).forEach((id, j) => refs.push({ path: `${path}.factIds[${j}]`, id }));
        refs.forEach((r) => c.factRefs.push({ pageKey, ...r, copyLevel: true }));
        const backing = simulated ? null : [...page.factIds, ...(refs.map((r) => r.id) as FactId[])];
        const strings: { path: string; text: string }[] = [];
        deepDisplayStrings(payload, `${path}.data`, "", strings);
        const answers = block.kind === "game" ? block.answersTh : block.fallbackTh;
        answers.forEach((text, j) =>
          strings.push({ path: `${path}.${block.kind === "game" ? "answersTh" : "fallbackTh"}[${j}]`, text })
        );
        for (const s of strings) addString(s.text, s.path, backing);
        // CopyText inside engine data cites its own facts: record them as copy-level refs.
        const copies: { path: string; copy: CopyText }[] = [];
        deepCopyTexts(payload, `${path}.data`, copies);
        for (const { path: cp, copy } of copies) {
          (copy.factIds ?? []).forEach((id, j) =>
            c.factRefs.push({ pageKey, path: `${cp}.factIds[${j}]`, id, copyLevel: true })
          );
        }
        if (simulated) c.simulated.push({ path, ids: refs.map((r) => r.id) });
        if (block.kind === "game") {
          c.tracks.push({ path: `${path}.track`, track: block.track });
          c.games.push({ path: `${path}.answersTh`, answers: block.answersTh });
        } else if (block.track) {
          c.tracks.push({ path: `${path}.track`, track: block.track });
        }
        collectDeadlines(payload, `${path}.data`, c.deadlines);
        break;
      }
      case "beat":
        addString(block.unlockLabelTh, `${path}.unlockLabelTh`, page.factIds);
        collectBlocks(page, block.blocks, `${path}.blocks`, c);
        break;
      case "clip":
        c.clipBlocks.push(path);
        break;
      case "safety":
        c.safetyBlocks += 1;
        addString(block.lineTh, `${path}.lineTh`, page.factIds);
        break;
      case "link":
        addString(block.labelTh, `${path}.labelTh`, page.factIds);
        break;
      case "dialogue":
        c.dialogues.push({ path, lines: block.lines.length });
        block.lines.forEach((line, j) => addCopy(line.text, `${path}.lines[${j}].text`));
        break;
      case "item": {
        const simulated = Boolean(block.simulated);
        addCopy(block.text, `${path}.text`, simulated);
        const backing = simulated ? null : copyBacking(block.text, page);
        if (block.titleTh) addString(block.titleTh, `${path}.titleTh`, backing);
        if (block.metaTh) addString(block.metaTh, `${path}.metaTh`, backing);
        if (simulated) c.simulated.push({ path, ids: [...(block.text.factIds ?? [])] });
        break;
      }
      case "shareCard":
      case "outro":
        break;
    }
  });
}

function collectPage(page: GuidePage): Collected {
  const c: Collected = {
    texts: [],
    factRefs: [],
    blockIds: [],
    clipBlocks: [],
    safetyBlocks: 0,
    tracks: [],
    games: [],
    simulated: [],
    deadlines: [],
    dialogues: [],
  };
  const pageKey = page.key;
  const add = (text: string, path: string, scope: Scope, backing: readonly FactId[] | null, spelled: TextRef["spelled"] = "warn") =>
    c.texts.push({ pageKey, path, text, scope, backing, spelled });

  add(page.titleTh, "titleTh", "copy", page.factIds);
  add(page.questionTh, "questionTh", "copy", page.factIds);
  add(page.navLabelTh, "navLabelTh", "copy", page.factIds);
  add(page.og.headlineTh, "og.headlineTh", "copy", page.factIds);
  if (page.og.stat) {
    add(page.og.stat.th, "og.stat.th", "copy", copyBacking(page.og.stat, page));
    (page.og.stat.factIds ?? []).forEach((id, i) =>
      c.factRefs.push({ pageKey, path: `og.stat.factIds[${i}]`, id, copyLevel: true })
    );
  }
  page.factIds.forEach((id, i) => c.factRefs.push({ pageKey, path: `factIds[${i}]`, id, copyLevel: false }));

  if (page.clip) {
    const clipFacts = [...page.clip.factIds, ...page.factIds];
    add(page.clip.hookTh, "clip.hookTh", "clip", clipFacts);
    page.clip.scriptLinesTh.forEach((line, i) => add(line, `clip.scriptLinesTh[${i}]`, "clip", clipFacts, "error"));
    page.clip.factIds.forEach((id, i) => c.factRefs.push({ pageKey, path: `clip.factIds[${i}]`, id, copyLevel: true }));
  }
  if (page.reel) {
    const r = page.reel;
    add(r.hook.th, "reel.hook.th", "reel", copyBacking(r.hook, page));
    (r.hook.factIds ?? []).forEach((id, i) => c.factRefs.push({ pageKey, path: `reel.hook.factIds[${i}]`, id, copyLevel: true }));
    r.variantsTh.forEach((v, i) => add(v, `reel.variantsTh[${i}]`, "reel", copyBacking(r.hook, page)));
    add(r.sendToFriendTh, "reel.sendToFriendTh", "reel", page.factIds);
  }
  collectBlocks(page, page.blocks, "blocks", c);
  return c;
}

function storyTexts(story: GuideStoryMeta): TextRef[] {
  const out: TextRef[] = [];
  const add = (text: string, path: string) =>
    out.push({ pageKey: null, path, text, scope: "copy", backing: null, noDigits: true, spelled: "skip" });
  add(story.profileTitleTh, "story.profileTitleTh");
  story.badges.forEach((b, i) => {
    add(b.nameTh, `story.badges[${i}].nameTh`);
    add(b.descTh, `story.badges[${i}].descTh`);
  });
  story.traits.forEach((t, i) => add(t.labelTh, `story.traits[${i}].labelTh`));
  return out;
}

// ---------------------------------------------------------------- checks
const NONG_NONG = /น้อง\s*ๆ/;

function checkTone(ref: TextRef, issues: LintIssue[]): void {
  for (const hit of findDashes(ref.text)) {
    issues.push({
      level: "error",
      pageKey: ref.pageKey,
      path: ref.path,
      message: `dash "${hit.char}" in copy near "${hit.context}": use a comma, a colon, or rewrite`,
    });
  }
  if (NONG_NONG.test(ref.text)) {
    issues.push({ level: "error", pageKey: ref.pageKey, path: ref.path, message: 'house rule: never write "น้องๆ"' });
  }
}

function patternMatches(pattern: RegExp, text: string): boolean {
  const flags = pattern.flags.replace(/[gy]/g, "");
  return new RegExp(pattern.source, flags).test(text);
}

function checkBanned(ref: TextRef, banned: readonly BannedClaim[], issues: LintIssue[]): void {
  for (const claim of banned) {
    const scope = claim.scope ?? "all";
    if (scope !== "all" && scope !== ref.scope) continue;
    if (patternMatches(claim.pattern, ref.text)) {
      issues.push({
        level: "error",
        pageKey: ref.pageKey,
        path: ref.path,
        message: `must-not-say ${claim.pattern}: ${claim.reason}`,
      });
    }
  }
}

function checkNumbers(ref: TextRef, facts: Map<string, Fact>, issues: LintIssue[]): void {
  const tokens = numberTokens(ref.text);
  if (ref.noDigits && tokens.length) {
    issues.push({
      level: "error",
      pageKey: ref.pageKey,
      path: ref.path,
      message: `numbers are not allowed here (${tokens.join(", ")}): this text cites no facts`,
    });
  }
  if (ref.backing && tokens.length) {
    const backed = backedTokens(ref.backing.map((id) => facts.get(id)).filter((f): f is Fact => Boolean(f)));
    for (const token of tokens) {
      if (!isBacked(token, backed)) {
        issues.push({
          level: "error",
          pageKey: ref.pageKey,
          path: ref.path,
          message: `number "${token}" is not in the claimEn or values of any cited fact (${ref.backing.join(", ") || "none"})`,
        });
      }
    }
  }
  if (ref.spelled !== "skip" && spellsNumber(ref.text)) {
    issues.push({
      level: ref.spelled,
      pageKey: ref.pageKey,
      path: ref.path,
      message:
        ref.spelled === "error"
          ? "spelled-out number in a clip script: captions must show digits a fact backs"
          : "spelled-out number: write digits a fact backs, or confirm it is not a quantity",
    });
  }
}

function daysBetween(from: string, to: Date): number {
  const start = Date.UTC(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1, Number(from.slice(8, 10)));
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((end - start) / 86_400_000);
}

function checkAsOf(
  asOf: string,
  pageKey: string | null,
  path: string,
  now: Date,
  maxAgeDays: number | undefined,
  issues: LintIssue[]
): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    issues.push({ level: "error", pageKey, path, message: `asOf "${asOf}" is not YYYY-MM-DD` });
    return;
  }
  const age = daysBetween(asOf, now);
  if (age < 0) {
    issues.push({ level: "error", pageKey, path, message: `asOf ${asOf} is after the run date` });
  } else if (maxAgeDays !== undefined && age > maxAgeDays) {
    issues.push({ level: "error", pageKey, path, message: `asOf ${asOf} is ${age} days old (max ${maxAgeDays}): refresh the facts` });
  } else if (age > STALE_ERROR_DAYS) {
    issues.push({ level: "error", pageKey, path, message: `asOf ${asOf} is ${age} days old (over ${STALE_ERROR_DAYS})` });
  } else if (age > STALE_WARN_DAYS) {
    issues.push({ level: "warn", pageKey, path, message: `asOf ${asOf} is ${age} days old (over ${STALE_WARN_DAYS})` });
  }
}

/** Registry checks for a list of facts: sources, badges, ids, dates. */
export function lintFacts(facts: readonly Fact[], now: Date = new Date()): LintIssue[] {
  const issues: LintIssue[] = [];
  const seen = new Set<string>();
  for (const fact of facts) {
    const path = `facts[${fact.id}]`;
    if (seen.has(fact.id)) issues.push({ level: "error", pageKey: null, path, message: `duplicate fact id ${fact.id}` });
    seen.add(fact.id);
    if (!/^(f|sim)\.[a-z0-9][a-z0-9.-]*$/.test(fact.id)) {
      issues.push({ level: "error", pageKey: null, path, message: `fact id ${fact.id} must be f.<kebab> or sim.<kebab>` });
    }
    const simulated = fact.id.startsWith("sim.");
    if (simulated !== (fact.badge === "simulated")) {
      issues.push({ level: "error", pageKey: null, path, message: "sim.* facts and only they carry the simulated badge" });
    }
    if (!fact.claimEn.trim()) issues.push({ level: "error", pageKey: null, path, message: "claimEn is empty" });
    if (!simulated) {
      const good = fact.sources.filter(
        (s) => /^https:\/\/\S+$/.test(s.url) && s.outlet.trim() && /^\d{4}-\d{2}(?:-\d{2})?$/.test(s.publishedAt)
      );
      if (good.length === 0) {
        issues.push({ level: "error", pageKey: null, path, message: "needs at least one https source with outlet and publishedAt" });
      }
      fact.sources.forEach((s, i) => {
        if (!/^https:\/\//.test(s.url)) {
          issues.push({ level: "error", pageKey: null, path: `${path}.sources[${i}]`, message: "source url must be https" });
        }
      });
    }
    // Pages drive staleness; a fact's asOf only has to be a real date, not in the future.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fact.asOf)) {
      issues.push({ level: "error", pageKey: null, path: `${path}.asOf`, message: `asOf "${fact.asOf}" is not YYYY-MM-DD` });
    } else if (daysBetween(fact.asOf, now) < 0) {
      issues.push({ level: "error", pageKey: null, path: `${path}.asOf`, message: `asOf ${fact.asOf} is after the run date` });
    }
  }
  return issues;
}

/** Fact ids must be unique across _shared and every career. */
export function lintFactIdsUnique(lists: Readonly<Record<string, readonly Fact[]>>): LintIssue[] {
  const owner = new Map<string, string>();
  const issues: LintIssue[] = [];
  for (const [name, facts] of Object.entries(lists)) {
    for (const fact of facts) {
      const prev = owner.get(fact.id);
      if (prev && prev !== name) {
        issues.push({ level: "error", pageKey: null, path: `facts[${fact.id}]`, message: `fact id ${fact.id} is in both ${prev} and ${name}` });
      }
      owner.set(fact.id, name);
    }
  }
  return issues;
}

function checkTrack(pageKey: string, path: string, track: GameTrack, issues: LintIssue[]): void {
  const targets = [["done", track.done] as const, ...Object.entries(track.milestones ?? {})];
  for (const [name, target] of targets) {
    if (!GUIDE_EVENT_TARGET_PATTERN.test(target) || !target.startsWith(`${pageKey}:`)) {
      issues.push({
        level: "error",
        pageKey,
        path: `${path}.${name === "done" ? "done" : `milestones.${name}`}`,
        message: `event target "${target}" must match ${GUIDE_EVENT_TARGET_PATTERN} and start with "${pageKey}:"`,
      });
    }
  }
}

function checkClips(guide: CareerGuide, opts: GuideLintOptions, issues: LintIssue[]): void {
  const pages = new Map(guide.pages.map((p) => [p.key, p]));
  const manifest = opts.clips?.manifest ?? {};
  for (const [key, media] of Object.entries(manifest)) {
    const path = `clips.json[${key}]`;
    const page = pages.get(key);
    if (!page || !page.clip) {
      issues.push({ level: "error", pageKey: key, path, message: "clips.json entry has no page with a clip slot" });
      continue;
    }
    if (!RADAR_GUIDE_VIDEO_URL_PATTERN.test(media.videoUrl)) {
      issues.push({ level: "error", pageKey: key, path: `${path}.videoUrl`, message: "videoUrl does not match the CDN pattern" });
    }
    if (!RADAR_GUIDE_POSTER_URL_PATTERN.test(media.posterUrl)) {
      issues.push({ level: "error", pageKey: key, path: `${path}.posterUrl`, message: "posterUrl does not match the CDN pattern" });
    }
    const vtt = opts.clips?.readVtt(media.captionsFile) ?? null;
    if (vtt === null) {
      issues.push({ level: "error", pageKey: key, path: `${path}.captionsFile`, message: `${media.captionsFile} is missing` });
    } else {
      if (!vtt.replace(/^﻿/, "").startsWith("WEBVTT")) {
        issues.push({ level: "error", pageKey: key, path: `${path}.captionsFile`, message: "captions must start with WEBVTT" });
      } else if (parseVtt(vtt).length === 0) {
        issues.push({ level: "error", pageKey: key, path: `${path}.captionsFile`, message: "captions have no cues" });
      }
      if (new TextEncoder().encode(vtt).length > VTT_MAX_BYTES) {
        issues.push({ level: "error", pageKey: key, path: `${path}.captionsFile`, message: "captions are over 20KB" });
      }
    }
    if (media.scriptHash !== clipScriptHash(page.clip.scriptLinesTh)) {
      issues.push({ level: "error", pageKey: key, path: `${path}.scriptHash`, message: "script changed after recording: re-record or revert" });
    }
  }
  if (opts.requireClips && guide.meta.status === "live") {
    for (const page of guide.pages) {
      if (page.clip?.required && !manifest[page.key]) {
        issues.push({ level: "error", pageKey: page.key, path: "clip", message: "required clip is not recorded yet" });
      }
    }
  }
}

function checkStory(guide: CareerGuide, issues: LintIssue[]): TextRef[] {
  const story = guide.meta.story;
  if (!story) return [];
  const keys = new Set(guide.pages.map((p) => p.key));
  const pageOf = (pattern: string) => pattern.split(":")[0];
  const seenBadges = new Set<string>();
  story.badges.forEach((b, i) => {
    const path = `story.badges[${i}]`;
    if (seenBadges.has(b.id)) issues.push({ level: "error", pageKey: null, path, message: `duplicate badge id ${b.id}` });
    seenBadges.add(b.id);
    if (!/^[a-z0-9][a-z0-9_-]{0,39}$/.test(b.id)) issues.push({ level: "error", pageKey: null, path, message: `badge id ${b.id} must be [a-z0-9_-]` });
    const t = b.trigger;
    const ref = t.on === "clear" ? t.pageKey : t.on === "game" ? pageOf(t.game) : t.on === "choice" ? pageOf(t.key) : null;
    if (ref !== null && !keys.has(ref)) {
      issues.push({ level: "error", pageKey: null, path: `${path}.trigger`, message: `badge trigger names unknown page "${ref}"` });
    }
  });
  const seenTraits = new Set<string>();
  story.traits.forEach((t, i) => {
    const path = `story.traits[${i}]`;
    if (seenTraits.has(t.id)) issues.push({ level: "error", pageKey: null, path, message: `duplicate trait id ${t.id}` });
    seenTraits.add(t.id);
    if (t.when.length === 0) issues.push({ level: "error", pageKey: null, path, message: "trait has no rules" });
    for (const rule of t.when) {
      const ref =
        "favourite" in rule ? rule.favourite : "cleared" in rule ? rule.cleared : "perfect" in rule ? pageOf(rule.perfect) : "choice" in rule ? pageOf(rule.choice) : null;
      if (ref !== null && !keys.has(ref)) {
        issues.push({ level: "error", pageKey: null, path: `${path}.when`, message: `trait rule names unknown page "${ref}"` });
      }
    }
  });
  const fillers = story.traits.filter((t) => t.when.some((r) => "always" in r)).length;
  if (fillers < 3) {
    issues.push({ level: "warn", pageKey: null, path: "story.traits", message: "fewer than 3 `always` traits: a short run may show fewer than 3 traits" });
  }
  return storyTexts(story);
}

/** Runs every rule in section 1.3 (plus the story rules) over one guide. */
export function lintGuide(guide: CareerGuide, opts: GuideLintOptions = {}): LintIssue[] {
  const issues: LintIssue[] = [];
  const now = opts.now ?? new Date();
  const meta = guide.meta;
  const allFacts = [...(opts.sharedFacts ?? []), ...guide.facts];
  const facts = new Map<string, Fact>(allFacts.map((f) => [f.id, f]));
  const banned = [...(opts.globalBanned ?? []), ...guide.banned];

  // Guide-wide structure.
  if (!RADAR_SLUG_PATTERN.test(meta.slug)) issues.push({ level: "error", pageKey: null, path: "meta.slug", message: `slug "${meta.slug}" is not kebab-case` });
  if ((RESERVED_GUIDE_SLUGS as readonly string[]).includes(meta.slug)) {
    issues.push({ level: "error", pageKey: null, path: "meta.slug", message: `slug "${meta.slug}" collides with a static /radar route` });
  }
  if (!RADAR_SLUG_PATTERN.test(meta.alias)) issues.push({ level: "error", pageKey: null, path: "meta.alias", message: `alias "${meta.alias}" is not kebab-case` });
  checkAsOf(meta.asOf, null, "meta.asOf", now, opts.maxAgeDays, issues);
  const newest = guide.pages.reduce((m, p) => (p.asOf > m ? p.asOf : m), "");
  if (newest && meta.asOf < newest) {
    issues.push({ level: "error", pageKey: null, path: "meta.asOf", message: `meta.asOf ${meta.asOf} is older than the newest page (${newest})` });
  }

  issues.push(...lintFacts(allFacts, now));

  // Pages, order and meta mirror.
  const sorted = [...guide.pages].sort((a, b) => a.order - b.order);
  sorted.forEach((p, i) => {
    if (p.order !== i + 1) issues.push({ level: "error", pageKey: p.key, path: "order", message: `order ${p.order} breaks the 1..n sequence (expected ${i + 1})` });
  });
  const seenKeys = new Set<string>();
  for (const page of guide.pages) {
    if (!GUIDE_PAGE_KEY_PATTERN.test(page.key)) issues.push({ level: "error", pageKey: page.key, path: "key", message: `page key "${page.key}" must match ${GUIDE_PAGE_KEY_PATTERN}` });
    if ((RESERVED_PAGE_KEYS as readonly string[]).includes(page.key)) issues.push({ level: "error", pageKey: page.key, path: "key", message: `page key "${page.key}" is reserved` });
    if (seenKeys.has(page.key)) issues.push({ level: "error", pageKey: page.key, path: "key", message: "duplicate page key" });
    seenKeys.add(page.key);
  }
  const metaByKey = new Map(meta.pages.map((p) => [p.key, p]));
  if (meta.pages.length !== guide.pages.length) {
    issues.push({ level: "error", pageKey: null, path: "meta.pages", message: `meta lists ${meta.pages.length} pages, the guide has ${guide.pages.length}` });
  }
  for (const page of guide.pages) {
    const m = metaByKey.get(page.key);
    if (!m) {
      issues.push({ level: "error", pageKey: page.key, path: "meta.pages", message: "page is missing from meta.pages" });
      continue;
    }
    const pairs: [string, unknown, unknown][] = [
      ["order", m.order, page.order],
      ["titleTh", m.titleTh, page.titleTh],
      ["navLabelTh", m.navLabelTh, page.navLabelTh],
      ["minutes", m.minutes, page.minutes],
      ["legacyHashes", JSON.stringify(m.legacyHashes ?? []), JSON.stringify(page.legacyHashes ?? [])],
    ];
    if (m.games !== undefined) pairs.push(["games", m.games, trackableGames(page.blocks).length]);
    if (m.cutscene !== undefined) pairs.push(["cutscene", m.cutscene, Boolean(page.clip)]);
    for (const [field, a, b] of pairs) {
      if (a !== b) issues.push({ level: "error", pageKey: page.key, path: `meta.pages.${field}`, message: `meta ${field} ${String(a)} differs from the page (${String(b)})` });
    }
    if (m.scene !== undefined && !m.scene.startsWith(`/radar/guides/${meta.slug}/`)) {
      issues.push({ level: "error", pageKey: page.key, path: "meta.pages.scene", message: `scene must live under /radar/guides/${meta.slug}/` });
    }
  }
  for (const key of metaByKey.keys()) {
    if (!seenKeys.has(key)) issues.push({ level: "error", pageKey: key, path: "meta.pages", message: "meta lists a page the guide does not have" });
  }

  // Per page.
  const texts: TextRef[] = [];
  for (const page of guide.pages) {
    checkAsOf(page.asOf, page.key, "asOf", now, opts.maxAgeDays, issues);
    const c = collectPage(page);
    texts.push(...c.texts);

    const pageFacts = new Set<string>(page.factIds);
    for (const ref of c.factRefs) {
      const fact = facts.get(ref.id);
      if (!fact) {
        issues.push({ level: "error", pageKey: page.key, path: ref.path, message: `unknown fact id ${ref.id}` });
        continue;
      }
      if (ref.copyLevel && fact.drawerOnly) {
        issues.push({ level: "error", pageKey: page.key, path: ref.path, message: `${ref.id} is drawer-only: copy may not cite it` });
      }
      if (ref.copyLevel && !pageFacts.has(ref.id)) {
        issues.push({ level: "error", pageKey: page.key, path: ref.path, message: `${ref.id} is cited by copy but missing from page.factIds` });
      }
    }
    for (const sim of c.simulated) {
      if (!sim.ids.some((id) => id.startsWith("sim."))) {
        issues.push({ level: "error", pageKey: page.key, path: sim.path, message: "simulated content must cite a sim.* fact" });
      }
    }

    const seenIds = new Set<string>();
    for (const { path, id } of c.blockIds) {
      if (seenIds.has(id)) issues.push({ level: "error", pageKey: page.key, path, message: `duplicate block id "${id}"` });
      seenIds.add(id);
    }
    if (c.clipBlocks.length > 1) issues.push({ level: "error", pageKey: page.key, path: c.clipBlocks[1], message: "at most one clip block per page" });
    if (c.clipBlocks.length && !page.clip) issues.push({ level: "error", pageKey: page.key, path: c.clipBlocks[0], message: "clip block on a page without a clip slot" });
    if (page.showsHacking && c.safetyBlocks === 0) {
      issues.push({ level: "error", pageKey: page.key, path: "blocks", message: "a page that shows hacking needs a safety block" });
    }
    for (const g of c.games) {
      if (g.answers.length === 0 || g.answers.every((a) => !a.trim())) {
        issues.push({ level: "error", pageKey: page.key, path: g.path, message: "games are skippable: answersTh must not be empty" });
      }
    }
    for (const t of c.tracks) checkTrack(page.key, t.path, t.track, issues);
    for (const d of c.deadlines) {
      if (typeof d.at !== "string" || !/T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/.test(d.at)) {
        issues.push({ level: "error", pageKey: page.key, path: d.path, message: "deadline.at needs a time and an explicit offset (+07:00)" });
      }
    }
    for (const d of c.dialogues) {
      if (d.lines === 0) issues.push({ level: "error", pageKey: page.key, path: d.path, message: "dialogue block has no lines" });
    }
  }
  texts.push(...checkStory(guide, issues));

  for (const ref of texts) {
    checkTone(ref, issues);
    checkBanned(ref, banned, issues);
    checkNumbers(ref, facts, issues);
    if (/\.lines\[\d+\]\.text\.th$/.test(ref.path) && ref.text.length > DIALOGUE_BOX_MAX_CHARS) {
      issues.push({
        level: "warn",
        pageKey: ref.pageKey,
        path: ref.path,
        message: `dialogue box is ${ref.text.length} chars (max about ${DIALOGUE_BOX_MAX_CHARS}): split it into two boxes`,
      });
    }
  }

  checkClips(guide, opts, issues);
  return issues;
}

export function lintErrors(issues: readonly LintIssue[]): LintIssue[] {
  return issues.filter((i) => i.level === "error");
}

/** One line per issue, for test failures and the radar:check report. */
export function formatIssues(issues: readonly LintIssue[]): string {
  return issues.map((i) => `${i.level.toUpperCase()} ${i.pageKey ?? "-"} ${i.path}: ${i.message}`).join("\n");
}
