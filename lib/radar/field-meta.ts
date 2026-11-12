/**
 * Link-preview copy for a Career Radar field page (spec 2.9): the title,
 * description and OG image text. Pure, so the page and its OG image agree.
 *
 * Everything goes through `sanitizeDashes`, so previews never show an em dash
 * even before the content sweep removes them from the data.
 */
import { sanitizeDashes } from "@/lib/radar-guide/thai-copy";

type CardLike = { kind: string; position?: number | null; content_th?: unknown; content_en?: unknown };

export interface RadarFieldMetaInput {
  name_th: string | null;
  name_en?: string | null;
  tagline_th: string | null;
  cards?: readonly CardLike[] | null;
}

export interface RadarHookStat {
  stat: string;
  label: string | null;
}

const DESCRIPTION_MAX = 200;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/**
 * `sanitizeDashes` keeps a hyphen only between two digits, so "25k–70k+"
 * would read "25k, 70k+". A dash between a number-like token ("25k", "1.5M")
 * and a digit is a range: make it a hyphen first.
 */
function dashFree(value: string): string {
  return sanitizeDashes(value.replace(/(\d[\d.,]*[a-zA-Z%+]*)\s*[\u2012-\u2015]\s*(?=\d)/g, "$1-"));
}

function clip(value: string, max: number): string {
  const chars = Array.from(value);
  return chars.length > max ? `${chars.slice(0, max - 1).join("").trimEnd()}…` : value;
}

/** The hook card's headline number and its label, dash-free. Null without a stat. */
export function radarHookStat(cards: readonly CardLike[] | null | undefined): RadarHookStat | null {
  const hook = (cards ?? [])
    .filter((card) => card.kind === "hook")
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0];
  if (!hook) return null;
  const content = asRecord(hook.content_th) ?? asRecord(hook.content_en);
  const stat = dashFree(text(content?.stat));
  if (!stat) return null;
  const label = dashFree(text(content?.statLabel));
  return { stat, label: label || null };
}

/** The career's display name: Thai first. */
export function radarFieldName(field: Pick<RadarFieldMetaInput, "name_th" | "name_en">): string {
  return dashFree(text(field.name_th) || text(field.name_en) || "อาชีพนี้");
}

/** "<name> ทำงานอะไร เงินเดือนเท่าไร | Career Radar" (used as an absolute title). */
export function radarFieldTitle(field: Pick<RadarFieldMetaInput, "name_th" | "name_en">): string {
  return `${radarFieldName(field)} ทำงานอะไร เงินเดือนเท่าไร | Career Radar`;
}

/** The tagline plus the hook stat, dash-free and at most 200 characters. */
export function radarFieldDescription(field: RadarFieldMetaInput): string {
  const tagline = dashFree(text(field.tagline_th));
  const hook = radarHookStat(field.cards);
  const stat = hook ? [hook.stat, hook.label].filter(Boolean).join(" ") : "";
  const parts = [tagline, stat].filter(Boolean);
  const joined = parts.length > 0 ? parts.join(" · ") : `${radarFieldName(field)} ทำงานอะไร เงินเดือนเท่าไร AI จะมาแทนไหม`;
  return clip(joined, DESCRIPTION_MAX);
}
