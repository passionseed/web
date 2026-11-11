import type { QuestApi } from "@/bot/src/quests/api";

import { buildFacts, hasFacts, normalizeInputs, retryNote, type DigestAnswer, type DigestFacts, type DigestInputs, type DigestKind, type DigestProject } from "./prompt";
import { checkSummary } from "./scrub";

/**
 * The AI island news job (ข่าวเกาะ), run by the cron route once a day: read
 * the eligible teams (shift_quest_digest_inputs), ask the model for each
 * team with something to tell, check every answer, and store the results
 * (shift_quest_digest_save, which checks eligibility again). The model call
 * is injected, so tests never touch the network.
 */

/** One team's answer: a summary, "no update" (null), or a thrown error (nothing stored for the team). */
export type DescribeTeam = (facts: DigestFacts, note: string | null) => Promise<DigestAnswer | null>;

/** One row for shift_quest_digest_save. */
export interface DigestEntry {
  project_id: string;
  summary: string | null;
  no_update: boolean;
  model: string | null;
}

export interface DigestStats {
  kind: DigestKind;
  teams: number;
  /** Teams with a summary stored. */
  summaries: number;
  /** Teams stored as "no update" (nothing new, a refusal, or no usable answer after one retry). */
  noUpdate: number;
  /** Model calls made, retries included. */
  calls: number;
  /** Teams left out because the model call failed (stored nothing; the last summary stays). */
  failed: number;
  /** Rows the database stored (it skips teams that stopped being eligible). */
  saved: number;
}

export type DigestRun =
  | { status: "disabled"; day: string }
  | { status: "no_key"; day: string }
  | { status: "done"; day: string; runs: DigestStats[]; errors: string[] };

const BANGKOK_MS = 7 * 60 * 60 * 1000;
const PARALLEL = 4;

/** The day in Asia/Bangkok (UTC+7 all year) as YYYY-MM-DD. */
export function bangkokDay(at: Date = new Date()): string {
  return new Date(at.getTime() + BANGKOK_MS).toISOString().slice(0, 10);
}

/** True when the Bangkok date YYYY-MM-DD is a Sunday: the weekly recap runs too. */
export function isSunday(day: string): boolean {
  return new Date(`${day}T00:00:00Z`).getUTCDay() === 0;
}

/** An error's code for logs: never its message, which could echo student text. */
function codeOf(error: unknown): string {
  const code = (error as { code?: unknown })?.code;
  if (typeof code === "string" && /^[a-z0-9_]{1,40}$/i.test(code)) return code;
  return error instanceof Error ? error.name : "unknown";
}

function noUpdate(project: DigestProject, model: string | null): DigestEntry {
  return { project_id: project.projectId, summary: null, no_update: true, model };
}

/**
 * One team: "no update" without asking when the window is empty; otherwise
 * one model call, a check of the answer, and at most one retry with a
 * stricter note. A refusal, an unusable answer or a second failed check is
 * stored as "no update". A thrown model error propagates (nothing stored).
 */
export async function summarizeProject(
  project: DigestProject,
  inputs: Pick<DigestInputs, "kind" | "from" | "to">,
  describe: DescribeTeam,
  model: string | null,
  counter: { calls: number } = { calls: 0 }
): Promise<DigestEntry> {
  if (!hasFacts(project)) return noUpdate(project, null);
  const facts = buildFacts(project, inputs);
  let note: string | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    counter.calls++;
    const answer = await describe(facts, note);
    if (!answer || answer.no_update) return noUpdate(project, model);
    const checked = checkSummary(answer.summary, project.redact, project.redactTeams);
    if (checked.ok) return { project_id: project.projectId, summary: checked.summary, no_update: false, model };
    note = retryNote(checked.problem);
  }
  return noUpdate(project, model);
}

/**
 * Every team of one kind, a few at a time. A failed model call leaves that
 * team out (counted, logged by code) and the others carry on.
 */
export async function generateDigest(
  inputs: DigestInputs,
  describe: DescribeTeam,
  options: { model?: string | null; parallel?: number } = {}
): Promise<{ entries: DigestEntry[]; stats: Omit<DigestStats, "saved">; errors: string[] }> {
  const model = options.model ?? null;
  const counter = { calls: 0 };
  const entries: DigestEntry[] = [];
  const errors: string[] = [];
  let failed = 0;
  let next = 0;
  const work = async () => {
    while (next < inputs.projects.length) {
      const project = inputs.projects[next++];
      try {
        entries.push(await summarizeProject(project, inputs, describe, model, counter));
      } catch (error) {
        failed++;
        errors.push(codeOf(error));
      }
    }
  };
  const parallel = Math.max(1, Math.min(options.parallel ?? PARALLEL, inputs.projects.length));
  await Promise.all(Array.from({ length: parallel }, work));
  const summaries = entries.filter((e) => !e.no_update).length;
  return {
    entries,
    stats: { kind: inputs.kind, teams: inputs.projects.length, summaries, noUpdate: entries.length - summaries, calls: counter.calls, failed },
    errors,
  };
}

/**
 * The daily job: kind "day" for `day`, plus "week" when `day` is a Bangkok
 * Sunday. The week goes first on Sundays: the bot's post prefers the week
 * recap when it exists, so it must be stored before the day's summaries make
 * a post possible. "disabled" when digest_enabled is off; "no_key" when there
 * is no model to ask (describe is null) and nothing was stored.
 */
export async function runIslandDigest(options: {
  api: QuestApi;
  day: string;
  describe: DescribeTeam | null;
  model?: string | null;
  parallel?: number;
}): Promise<DigestRun> {
  const { api, day } = options;
  const kinds: DigestKind[] = isSunday(day) ? ["week", "day"] : ["day"];
  const runs: DigestStats[] = [];
  const errors: string[] = [];
  for (const kind of kinds) {
    const inputs = normalizeInputs(await api.call<unknown>("shift_quest_digest_inputs", day, kind), kind);
    if (!inputs || !inputs.enabled) return { status: "disabled", day };
    if (!options.describe) return { status: "no_key", day };
    const { entries, stats, errors: failures } = await generateDigest(inputs, options.describe, {
      model: options.model,
      parallel: options.parallel,
    });
    errors.push(...failures);
    let saved = 0;
    if (entries.length > 0) {
      saved = Number(await api.call<number>("shift_quest_digest_save", day, kind, JSON.stringify(entries))) || 0;
    }
    runs.push({ ...stats, saved });
  }
  return { status: "done", day, runs, errors };
}
