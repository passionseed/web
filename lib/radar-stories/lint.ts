/**
 * Story lint: the house rules for story reel scripts (docs/radar-guide/README.md,
 * "Story reels"). Pure; run by Jest over every registered script and by
 * `pnpm radar:story` before filming. Errors block filming; warnings are for a
 * person to look at.
 */
import { GLOBAL_BANNED } from "../radar-guides/banned";

import { parseScene, storySceneSrc } from "./scenes";
import { charCount, readMs, storySeconds, STORY_TIMING } from "./timing";
import { STORY_MOODS, STORY_SERIES, STORY_WHO, type StoryScript } from "./types";

export const STORY_LIMITS = {
  hookChars: 28,
  lineChars: 60,
  beats: [6, 10] as const,
  /** End card CTA: anything longer stops reading as one line at that size. */
  endCardChars: 40,
  /** An explicit `ms` must be within this range. */
  beatMs: [800, 8000] as const,
} as const;

export type StoryRule =
  | "id"
  | "duplicate-id"
  | "series"
  | "slug"
  | "title"
  | "hook-length"
  | "hook-variants"
  | "beats-count"
  | "line-length"
  | "who"
  | "mood"
  | "scene"
  | "scene-art"
  | "ms"
  | "dash"
  | "nong"
  | "digits-need-facts"
  | "fact-ref"
  | "fact-numbers"
  | "host-name"
  | "banned"
  | "follow-ask"
  | "weekly-day"
  | "promise"
  | "price"
  | "end-card"
  | "send-to-friend"
  | "caption-ig"
  | "caption-tt"
  | "length";

export interface StoryProblem {
  level: "error" | "warning";
  rule: StoryRule;
  /** The script, e.g. "lost-01-dinner". */
  id: string;
  /** Field, e.g. "beats[3].lineTh". */
  path: string;
  message: string;
}

export interface StoryLintOptions {
  /** True when a public path (e.g. /radar/stories/classroom.webp) exists. Omit to skip the art check. */
  sceneExists?: (publicPath: string) => boolean;
}

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DASH = /[‒–—―]/;
const NONG = /น้อง\s*ๆ/;
const DIGIT = /[0-9๐-๙]/;
const HOST_NAME = /P\s*['’]?\s*Seed|พี่\s*ซีด|พี่\s*seed/i;
const FOLLOW = /กด\s*(?:ฟอล|ติดตาม)|ฟอล(?:โล่?ว์|โลว์)|follow\s*(?:us|me|เรา)|ติดตามเรา/i;
const WEEKLY = /ทุก\s*(?:วัน|คืน)\s*(?:จันทร์|อังคาร|พุธ|พฤหัส(?:บดี)?|ศุกร์|เสาร์|อาทิตย์)|ตอนใหม่ทุก|every\s+(?:mon|tues|wednes|thurs|fri|satur|sun)day/i;
const PROMISE = /ติด\s*(?:ชัวร์|แน่\s*ๆ)|รับประกัน|เงินง่าย|รวย\s*(?:เร็ว|ง่าย)|easy\s*money/i;
const HOPELESS = /หมดหวัง|ไม่มีหวัง|สายไปแล้ว|ไม่ทันแล้ว/;
const PRICE = /฿|ราคา|ค่าเรียน|ค่าคอร์ส|ค่าสมัคร|ส่วนลด|โปรโมชั่น/;
/** House rules the lint checks by name above; the rest of the global list applies as "banned". */
const BANNED = GLOBAL_BANNED.filter((b) => !b.pattern.test("—") && !b.pattern.test("น้องๆ"));

const THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙";
const toArabic = (s: string) => s.replace(/[๐-๙]/g, (d) => String(THAI_DIGITS.indexOf(d)));

/** Numbers as written ("7,585", "70", "2.2"), commas dropped for comparison. */
export function numbersIn(text: string): string[] {
  return (toArabic(text).match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, "").replace(/\.$/, ""));
}

type Field = { path: string; text: string; visible: boolean; line: boolean };

/** Every string in the script that a person reads, with its path. */
function fields(s: StoryScript): Field[] {
  const out: Field[] = [
    { path: "titleTh", text: s.titleTh ?? "", visible: false, line: false },
    { path: "hookTh", text: s.hookTh ?? "", visible: true, line: true },
    ...(s.hookVariantsTh ?? []).map((t, i) => ({ path: `hookVariantsTh[${i}]`, text: t ?? "", visible: true, line: true })),
    ...(s.beats ?? []).map((b, i) => ({ path: `beats[${i}].lineTh`, text: b?.lineTh ?? "", visible: true, line: true })),
    { path: "endCardTh", text: s.endCardTh ?? "", visible: true, line: false },
    { path: "sendToFriendTh", text: s.sendToFriendTh ?? "", visible: true, line: false },
    { path: "captionIgTh", text: s.captionIgTh ?? "", visible: true, line: false },
    { path: "captionTtTh", text: s.captionTtTh ?? "", visible: true, line: false },
  ];
  (s.factRefs ?? []).forEach((f, i) => {
    out.push({ path: `factRefs[${i}].claim`, text: f?.claim ?? "", visible: false, line: false });
    out.push({ path: `factRefs[${i}].source`, text: f?.source ?? "", visible: false, line: false });
  });
  return out;
}

const blank = (s: unknown) => typeof s !== "string" || !s.trim();

export function lintStory(s: StoryScript, opts: StoryLintOptions = {}): StoryProblem[] {
  const id = typeof s.id === "string" && s.id ? s.id : "(no id)";
  const problems: StoryProblem[] = [];
  const add = (level: StoryProblem["level"], rule: StoryRule, path: string, message: string) => problems.push({ level, rule, id, path, message });
  const error = (rule: StoryRule, path: string, message: string) => add("error", rule, path, message);
  const warn = (rule: StoryRule, path: string, message: string) => add("warning", rule, path, message);

  // ---- identity
  if (blank(s.id) || !ID.test(s.id)) error("id", "id", `"${s.id}" must be kebab-case (lowercase letters, digits, hyphens)`);
  if (!STORY_SERIES.includes(s.series)) error("series", "series", `series must be one of ${STORY_SERIES.join(", ")}`);
  if (s.series === "career" && (blank(s.slug) || !ID.test(s.slug!))) error("slug", "slug", "a career story needs the career's slug");
  if (s.series !== "career" && s.slug !== undefined) warn("slug", "slug", "slug is only read when series is career");
  if (blank(s.titleTh)) error("title", "titleTh", "titleTh is empty");

  // ---- hook
  const hook = s.hookTh ?? "";
  if (blank(hook)) error("hook-length", "hookTh", "the hook is empty");
  else if (charCount(hook) > STORY_LIMITS.hookChars) error("hook-length", "hookTh", `the hook is ${charCount(hook)} characters; at most ${STORY_LIMITS.hookChars}`);
  if (!Array.isArray(s.hookVariantsTh) || s.hookVariantsTh.length !== 2) {
    error("hook-variants", "hookVariantsTh", "give exactly two hook variants for Trial Reels");
  } else {
    s.hookVariantsTh.forEach((v, i) => {
      const path = `hookVariantsTh[${i}]`;
      if (blank(v)) error("hook-variants", path, "the variant is empty");
      else if (charCount(v) > STORY_LIMITS.hookChars) error("hook-length", path, `the variant is ${charCount(v)} characters; at most ${STORY_LIMITS.hookChars}`);
      else if (v.trim() === hook.trim()) warn("hook-variants", path, "the variant is the same as the hook");
    });
  }

  // ---- beats
  const beats = Array.isArray(s.beats) ? s.beats : [];
  const [minBeats, maxBeats] = STORY_LIMITS.beats;
  if (beats.length < minBeats || beats.length > maxBeats) error("beats-count", "beats", `${beats.length} beats; a story has ${minBeats} to ${maxBeats}`);
  beats.forEach((b, i) => {
    const at = `beats[${i}]`;
    if (!b || typeof b !== "object") {
      error("who", at, "the beat is not an object");
      return;
    }
    if (!STORY_WHO.includes(b.who)) error("who", `${at}.who`, `who must be one of ${STORY_WHO.join(", ")}`);
    if (blank(b.lineTh)) error("line-length", `${at}.lineTh`, "the line is empty");
    else if (charCount(b.lineTh) > STORY_LIMITS.lineChars) {
      error("line-length", `${at}.lineTh`, `${charCount(b.lineTh)} characters; at most ${STORY_LIMITS.lineChars}`);
    }
    if (b.mood !== undefined) {
      if (!STORY_MOODS.includes(b.mood)) error("mood", `${at}.mood`, `mood must be one of ${STORY_MOODS.join(", ")}`);
      else if (b.who !== "host") warn("mood", `${at}.mood`, "mood only changes P'Seed's face; it is ignored for other speakers");
    }
    if (typeof b.scene !== "string" || !parseScene(b.scene)) {
      error("scene", `${at}.scene`, `unknown scene "${b.scene}"; use a generic scene or career:<slug>/<page>`);
    } else if (opts.sceneExists) {
      const src = storySceneSrc(b.scene)!;
      if (!opts.sceneExists(src)) error("scene-art", `${at}.scene`, `no art at public${src}`);
    }
    if (b.ms !== undefined) {
      const [lo, hi] = STORY_LIMITS.beatMs;
      if (typeof b.ms !== "number" || !Number.isFinite(b.ms) || b.ms < lo || b.ms > hi) {
        error("ms", `${at}.ms`, `ms must be a number from ${lo} to ${hi}`);
      } else if (!b.big && b.ms + 300 < readMs(b.lineTh)) {
        warn("ms", `${at}.ms`, `${b.ms} ms is shorter than the line's reading time (about ${Math.round(readMs(b.lineTh))} ms)`);
      }
    }
    if (b.big !== undefined && typeof b.big !== "boolean") error("line-length", `${at}.big`, "big must be true or false");
  });

  // ---- text rules over every field
  const all = fields(s);
  for (const f of all) {
    if (DASH.test(f.text)) error("dash", f.path, "no em or en dash; use a comma, a colon or rewrite the sentence");
    if (NONG.test(f.text)) error("nong", f.path, 'never "น้องๆ"');
    if (!f.visible) continue;
    if (f.line && HOST_NAME.test(f.text)) error("host-name", f.path, "P'Seed's name is never said in the lines; the name tag shows it");
    for (const b of BANNED) if (b.pattern.test(f.text)) error("banned", f.path, b.reason);
    if (FOLLOW.test(f.text)) error("follow-ask", f.path, 'no "follow us" ask');
    if (WEEKLY.test(f.text)) error("weekly-day", f.path, "no weekly release day");
    if (PROMISE.test(f.text)) error("promise", f.path, "never promise admission or imply a career is easy money");
    if (HOPELESS.test(f.text)) warn("promise", f.path, "check the line never says a round (or the student) is hopeless");
    if (PRICE.test(f.text)) warn("price", f.path, "mentions a price or fee: story reels never show a price");
  }

  // ---- facts
  const refs = Array.isArray(s.factRefs) ? s.factRefs : [];
  refs.forEach((f, i) => {
    if (blank(f?.claim) || blank(f?.source)) error("fact-ref", `factRefs[${i}]`, "a fact ref needs claim and source");
    if (blank(f?.url) || !/^https?:\/\/\S+$/.test(f.url)) error("fact-ref", `factRefs[${i}].url`, "a fact ref needs a real http(s) source URL");
  });
  const visible = all.filter((f) => f.visible);
  const withDigits = visible.filter((f) => DIGIT.test(f.text));
  if (withDigits.length && !refs.length) {
    error("digits-need-facts", withDigits[0].path, `a number appears (${withDigits.map((f) => f.path).join(", ")}) but factRefs is empty`);
  } else if (withDigits.length) {
    const backed = new Set(refs.flatMap((f) => numbersIn(`${f?.claim ?? ""} ${f?.source ?? ""}`)));
    for (const f of withDigits) {
      const missing = numbersIn(f.text).filter((n) => !backed.has(n));
      if (missing.length) warn("fact-numbers", f.path, `${missing.join(", ")} is not in any factRefs claim`);
    }
  }

  // ---- end card and captions
  if (blank(s.endCardTh)) error("end-card", "endCardTh", "the end card is empty");
  else if (charCount(s.endCardTh) > STORY_LIMITS.endCardChars) warn("end-card", "endCardTh", `${charCount(s.endCardTh)} characters; keep the CTA under ${STORY_LIMITS.endCardChars}`);
  if (blank(s.sendToFriendTh)) error("send-to-friend", "sendToFriendTh", "the share line is empty");
  else if (!s.sendToFriendTh.trim().startsWith("ส่งให้เพื่อน")) warn("send-to-friend", "sendToFriendTh", 'the share line usually starts "ส่งให้เพื่อนที่ ..."');
  if (blank(s.captionIgTh)) error("caption-ig", "captionIgTh", "the Instagram caption is empty");
  else if (!s.captionIgTh.includes("RADAR")) warn("caption-ig", "captionIgTh", "the Instagram template asks for the RADAR comment keyword");
  if (blank(s.captionTtTh)) error("caption-tt", "captionTtTh", "the TikTok caption is empty");
  else if (!/passionseed\.org\//.test(s.captionTtTh)) warn("caption-tt", "captionTtTh", "the TikTok template gives the typeable passionseed.org link");

  // ---- length
  if (beats.length && beats.every((b) => b && typeof b.lineTh === "string")) {
    const seconds = storySeconds({ hookTh: hook, beats });
    const [lo, hi] = STORY_TIMING.targetSeconds;
    if (seconds < lo || seconds > hi) warn("length", "beats", `the reel is ${seconds.toFixed(1)} s; story reels are ${lo} to ${hi} s`);
  }

  return problems;
}

/** Lints every script and checks ids are unique. */
export function lintStories(scripts: readonly StoryScript[], opts: StoryLintOptions = {}): StoryProblem[] {
  const problems = scripts.flatMap((s) => lintStory(s, opts));
  const seen = new Set<string>();
  for (const s of scripts) {
    if (seen.has(s.id)) problems.push({ level: "error", rule: "duplicate-id", id: s.id, path: "id", message: `"${s.id}" is used by more than one script` });
    seen.add(s.id);
  }
  return problems;
}

export function formatProblem(p: StoryProblem): string {
  return `${p.level === "error" ? "error" : "warning"} ${p.id} ${p.path} [${p.rule}]: ${p.message}`;
}
