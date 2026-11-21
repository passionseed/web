/**
 * The operations board's pure parts: Bangkok dates, overdue and due-soon
 * rules, matching what someone typed to an operation or a step, and the
 * embeds. No Discord client and no database here, so all of it is tested
 * directly (bot/src/ops/__tests__).
 *
 * Copy rules: English for staff, no em dashes, no pings (every send passes
 * allowedMentions with nothing to parse).
 */
import type { APIEmbed } from "discord.js";

/** One operation as hackathon_ops_board() returns it. */
export interface OpSummary {
  slug: string;
  title: string;
  owner: string | null;
  deadline_text: string | null;
  /** YYYY-MM-DD, the first date in the deadline text, or null. */
  deadline_on: string | null;
  status: string | null;
  steps_done: number;
  steps_total: number;
}

export interface OpStep {
  position: number;
  text: string;
  done: boolean;
}

/** One operation as hackathon_ops_show() returns it. */
export interface OpDetail extends OpSummary {
  goal: string | null;
  done_when: string | null;
  steps: OpStep[];
}

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The Bangkok calendar date (YYYY-MM-DD) at a moment. Bangkok has no daylight saving. */
export function bangkokDate(nowMs: number): string {
  return new Date(nowMs + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
}

/** Minutes since Bangkok midnight. */
export function bangkokMinutes(nowMs: number): number {
  const minutes = Math.floor((nowMs + BANGKOK_OFFSET_MS) / 60_000);
  return ((minutes % 1440) + 1440) % 1440;
}

/** Every step ticked (and there is at least one). */
export function isComplete(op: OpSummary): boolean {
  return op.steps_total > 0 && op.steps_done >= op.steps_total;
}

/** The deadline day is before today in Bangkok, and the operation is not complete. */
export function isOverdue(op: OpSummary, nowMs: number): boolean {
  return !!op.deadline_on && !isComplete(op) && op.deadline_on < bangkokDate(nowMs);
}

/**
 * Due from today up to the Bangkok date 48 hours from now (at the 08:30 post:
 * today, tomorrow and the day after), and not complete.
 */
export function isDueSoon(op: OpSummary, nowMs: number): boolean {
  if (!op.deadline_on || isComplete(op)) return false;
  return op.deadline_on >= bangkokDate(nowMs) && op.deadline_on <= bangkokDate(nowMs + 2 * DAY_MS);
}

function norm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * What someone typed or picked for `operation`: the slug autocomplete sends,
 * else an exact title, else the one operation whose title starts with it.
 */
export function resolveOperation<T extends Pick<OpSummary, "slug" | "title">>(ops: T[], input: string): T | null {
  const wanted = norm(input);
  if (!wanted) return null;
  const bySlug = ops.find((op) => op.slug === wanted);
  if (bySlug) return bySlug;
  const byTitle = ops.find((op) => norm(op.title) === wanted);
  if (byTitle) return byTitle;
  const prefixed = ops.filter((op) => norm(op.title).startsWith(wanted));
  return prefixed.length === 1 ? prefixed[0] : null;
}

/**
 * What someone typed or picked for `step`: the position autocomplete sends,
 * else the one step whose text starts with it.
 */
export function resolveStep(steps: OpStep[], input: string): OpStep | null {
  const wanted = norm(input);
  if (/^\d{1,3}$/.test(wanted)) return steps.find((s) => s.position === Number(wanted)) ?? null;
  if (!wanted) return null;
  const exact = steps.filter((s) => norm(s.text) === wanted);
  if (exact.length === 1) return exact[0];
  const prefixed = steps.filter((s) => norm(s.text).startsWith(wanted));
  return prefixed.length === 1 ? prefixed[0] : null;
}

/** Cuts text to a Discord limit, ending with an ellipsis when cut. */
export function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** Autocomplete choices: at most 25, names at most 100 characters. */
export interface Choice {
  name: string;
  value: string;
}

function matches(query: string, ...texts: string[]): boolean {
  const q = norm(query);
  return !q || texts.some((t) => norm(t).includes(q));
}

export function operationChoices(ops: OpSummary[], query: string): Choice[] {
  return ops
    .filter((op) => matches(query, op.title, op.slug))
    .slice(0, 25)
    .map((op) => ({ name: clip(`${op.title} (${op.steps_done}/${op.steps_total})`, 100), value: op.slug }));
}

/** Open steps first, so the one to tick is near the top. */
export function stepChoices(steps: OpStep[], query: string): Choice[] {
  return [...steps]
    .sort((a, b) => Number(a.done) - Number(b.done) || a.position - b.position)
    .filter((s) => matches(query, s.text, String(s.position)))
    .slice(0, 25)
    .map((s) => ({ name: clip(`${s.done ? "✓ " : ""}${s.position}. ${s.text}`, 100), value: String(s.position) }));
}

const COLOR_OK = 0x2e7d32;
const COLOR_LATE = 0xc62828;
const COLOR_INFO = 0x455a64;

function unixDay(day: string): number {
  // Midnight Bangkok of that day, for Discord's <t:...:R> relative time.
  return Math.floor((Date.parse(`${day}T00:00:00Z`) - BANGKOK_OFFSET_MS) / 1000);
}

function deadlineLine(op: OpSummary, nowMs: number): string {
  const text = op.deadline_text?.trim() || (op.deadline_on ?? "none");
  if (isOverdue(op, nowMs)) return `${text} · **overdue**`;
  return text;
}

function marker(op: OpSummary, nowMs: number): string {
  if (isComplete(op)) return "✅ ";
  if (isOverdue(op, nowMs)) return "🔴 ";
  if (isDueSoon(op, nowMs)) return "🟡 ";
  return "";
}

interface FieldLimits {
  name: number;
  text: number;
}

function opField(op: OpSummary, nowMs: number, max: FieldLimits): { name: string; value: string } {
  return {
    name: clip(`${marker(op, nowMs)}${op.title}`, max.name),
    value: [
      `Owner: ${clip(op.owner ?? "nobody yet", max.text)}`,
      `Deadline: ${clip(deadlineLine(op, nowMs), max.text + 20)}`,
      `Steps: ${op.steps_done}/${op.steps_total}`,
      `Status: ${clip(op.status?.trim() || "not set", max.text)}`,
    ].join("\n"),
  };
}

/** Discord's limit for all the text in one message's embeds, with room for the due card. */
const BOARD_BUDGET = 5000;

export function embedSize(embed: APIEmbed): number {
  return (
    (embed.title?.length ?? 0) +
    (embed.description?.length ?? 0) +
    (embed.fields ?? []).reduce((sum, f) => sum + f.name.length + f.value.length, 0)
  );
}

/** The board: one field per operation (Discord allows 25), overdue ones marked 🔴. */
export function boardEmbed(ops: OpSummary[], nowMs: number): APIEmbed {
  const overdue = ops.filter((op) => isOverdue(op, nowMs)).length;
  const shown = ops.length > 25 ? ops.slice(0, 24) : ops;
  const build = (max: FieldLimits): APIEmbed => {
    const fields = shown.map((op) => opField(op, nowMs, max));
    if (ops.length > shown.length) {
      fields.push({ name: "More", value: `${ops.length - shown.length} more operation(s). Use /ops show to see one.` });
    }
    return {
      title: "Operations board",
      color: overdue > 0 ? COLOR_LATE : COLOR_OK,
      description:
        ops.length === 0
          ? "No operations yet. Run the seed script to load them."
          : `${ops.length} operation(s), ${overdue} overdue. 🔴 overdue · 🟡 due within 48 hours · ✅ every step done`,
      fields,
    };
  };
  // Long statuses on a long board: shorten every line until the message fits.
  let max: FieldLimits = { name: 120, text: 150 };
  let embed = build(max);
  while (embedSize(embed) > BOARD_BUDGET && max.text > 10) {
    max = { name: Math.max(30, max.name - 15), text: Math.max(10, max.text - 20) };
    embed = build(max);
  }
  return embed;
}

/** One operation and its steps, done ones ticked. */
export function showEmbed(op: OpDetail, nowMs: number): APIEmbed {
  const head = [
    op.goal ? `**Goal:** ${op.goal}` : null,
    op.done_when ? `**Done when:** ${op.done_when}` : null,
    `**Owner:** ${op.owner ?? "nobody yet"}`,
    `**Deadline:** ${deadlineLine(op, nowMs)}`,
    `**Status:** ${op.status?.trim() || "not set"}`,
    "",
    `**Steps (${op.steps_done}/${op.steps_total})**`,
  ].filter((line): line is string => line !== null);
  const steps = op.steps.length
    ? op.steps.map((s) => `${s.done ? "✅" : "⬜"} ${s.position}. ${s.text}`)
    : ["No steps."];
  const lines = [...head];
  // The description holds 4096 characters; leave room for the "more" line.
  for (let k = 0; k < steps.length; k++) {
    const rest = steps.length - k;
    if ([...lines, steps[k]].join("\n").length > 3900) {
      lines.push(`…and ${rest} more step(s).`);
      break;
    }
    lines.push(steps[k]);
  }
  let color = COLOR_INFO;
  if (isOverdue(op, nowMs)) color = COLOR_LATE;
  else if (isComplete(op)) color = COLOR_OK;
  return {
    title: clip(`${marker(op, nowMs)}${op.title}`, 256),
    color,
    description: lines.join("\n"),
  };
}

function listLine(op: OpSummary): string {
  const when = op.deadline_on ? `<t:${unixDay(op.deadline_on)}:R>` : "";
  return clip(`**${op.title}**: ${op.deadline_text ?? op.deadline_on ?? ""} ${when} · ${op.owner ?? "nobody yet"} · ${op.steps_done}/${op.steps_total}`, 300);
}

/** The morning post's second card: what is due in the next 48 hours, and what is already late. */
export function dueEmbed(ops: OpSummary[], nowMs: number): APIEmbed {
  const due = ops.filter((op) => isDueSoon(op, nowMs));
  const late = ops.filter((op) => isOverdue(op, nowMs));
  const parts = [
    "**Due in the next 48 hours**",
    ...(due.length ? due.map(listLine) : ["Nothing due in the next 48 hours."]),
  ];
  if (late.length) parts.push("", "**Overdue**", ...late.map(listLine));
  return {
    title: `Good morning. Today is ${bangkokDate(nowMs)}`,
    color: late.length ? COLOR_LATE : COLOR_INFO,
    description: clip(parts.join("\n"), 4000),
  };
}

/** There is something to talk about: at least one operation, not all of them complete. */
export function worthPosting(ops: OpSummary[]): boolean {
  return ops.some((op) => !isComplete(op));
}
