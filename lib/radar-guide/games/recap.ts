/**
 * RecapCard: lines for the levels the viewer actually played, and the
 * "เกมไหนสนุกสุด" pick. Pure; reads local progress only, no personal data.
 *
 * Template variables for a line keyed by page `P`:
 * - `{score}` `{total}` `{attempts}` from the best finished, played game on P
 * - `{<name>}` for every choice `P:<name>` (engines write `P:x`, `P:y`,
 *   `P:title`, `P:poll`, `P:scopeTries`, `P:copied`...)
 * - `{c:<key>}` any choice by full key
 * - `{fit}`, `{shortlist}` (count), `{proof}` (labels, comma separated)
 * A line may hold alternatives joined by " || ": the first one whose
 * placeholders are all set (and not "0") is used.
 *
 * Shared choice keys written by the engines are listed in
 * components/radar/guide/games/index.ts.
 */
import type { GameResult, GuideState, RecapCardData } from "../guide-types";
import { fillTemplate, templateNames, type TemplateVars } from "./text";

function pageGames(state: GuideState, pageKey: string): GameResult[] {
  const prefix = `${pageKey}:`;
  return Object.entries(state.games)
    .filter(([k, r]) => k.startsWith(prefix) && r.done && !r.skipped)
    .map(([, r]) => r);
}

/** A level counts as played with a finished, not skipped game or any choice on it. */
export function wasPlayed(state: GuideState, pageKey: string): boolean {
  if (pageGames(state, pageKey).length) return true;
  const prefix = `${pageKey}:`;
  return Object.keys(state.choices).some((k) => k.startsWith(prefix));
}

function bestGame(games: GameResult[]): GameResult | undefined {
  const ratio = (r: GameResult) => (r.total ? (r.score ?? 0) / r.total : 0);
  return games.reduce<GameResult | undefined>((best, r) => (!best || ratio(r) > ratio(best) ? r : best), undefined);
}

export function proofLabels(state: GuideState): string[] {
  const labels = state.local?.proofLabels;
  const map = labels && typeof labels === "object" && !Array.isArray(labels) ? (labels as Record<string, unknown>) : {};
  return (state.proof ?? []).map((id) => (typeof map[id] === "string" ? (map[id] as string) : id));
}

export function recapVars(state: GuideState, pageKey: string): TemplateVars {
  const vars: Record<string, string | number | undefined> = {};
  const best = bestGame(pageGames(state, pageKey));
  if (best) {
    vars.score = best.score;
    vars.total = best.total;
    vars.attempts = best.attempts;
  }
  const prefix = `${pageKey}:`;
  for (const [k, v] of Object.entries(state.choices)) {
    vars[`c:${k}`] = v;
    if (k.startsWith(prefix)) vars[k.slice(prefix.length)] = v;
  }
  vars.fit = state.fit;
  vars.shortlist = state.shortlist ? state.shortlist.length : undefined;
  const proof = proofLabels(state);
  vars.proof = proof.length ? proof.join(", ") : undefined;
  return vars;
}

function filled(template: string, vars: TemplateVars): string | null {
  const alternatives = template.split("||").map((t) => t.trim());
  for (const alt of alternatives) {
    const ok = templateNames(alt).every((n) => {
      const v = vars[n];
      return v !== undefined && v !== null && v !== "" && String(v) !== "0";
    });
    if (ok) return fillTemplate(alt, vars);
  }
  return null;
}

export interface RecapLine {
  pageKey: string;
  text: string;
}

/** Lines for played levels only, in the authored order of `data.lines`. */
export function recapLines(data: RecapCardData, state: GuideState): RecapLine[] {
  const out: RecapLine[] = [];
  for (const [pageKey, template] of Object.entries(data.lines)) {
    if (!wasPlayed(state, pageKey)) continue;
    const text = filled(template, recapVars(state, pageKey));
    if (text) out.push({ pageKey, text });
  }
  return out;
}

/** "เกมไหนสนุกสุด" options: only levels the viewer played. */
export function favouriteOptions(data: RecapCardData, state: GuideState): string[] {
  return Object.keys(data.favourites).filter((k) => wasPlayed(state, k));
}

/** The line comes from the pick, never from the scores. */
export function favouriteLine(data: RecapCardData, pick: string | undefined): string | null {
  return pick ? (data.favourites[pick] ?? null) : null;
}
