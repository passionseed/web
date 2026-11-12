import type pg from "pg";

/**
 * The bot's only door into the database: public.shift_quest_* functions,
 * called as the least-privilege shift_quest_bot login. Every rule that
 * matters (who may do what, versions, idempotency, balances) is enforced by
 * those functions, so this layer stays thin.
 */

/** A rule the database (or the bot, before calling it) refused, raised as 'sq:<code>'. */
export class QuestError extends Error {
  constructor(
    public readonly code: string,
    public readonly detail?: string,
    /** The shift_quest_* function that refused, for the error log line. */
    public readonly fn?: string
  ) {
    super(`sq:${code}`);
  }
}

/** Any other database failure: the function name and SQLSTATE only, never the message. */
export class QuestDbError extends Error {
  constructor(
    public readonly fn: string,
    public readonly sqlstate: string
  ) {
    super(`${fn} failed`);
    this.name = "QuestDbError";
  }
}

export interface QuestApi {
  call<T = unknown>(fn: string, ...args: unknown[]): Promise<T>;
  rows<T = Record<string, unknown>>(fn: string, ...args: unknown[]): Promise<T[]>;
}

const FUNCTION_NAME = /^shift_quest_[a-z][a-z_]*$/;

function assertCallable(fn: string): void {
  // Internal helpers (shift_quest__*) are not granted anyway; refuse early.
  if (!FUNCTION_NAME.test(fn) || fn.startsWith("shift_quest__")) {
    throw new Error(`Not a callable quest function: ${fn}`);
  }
}

function placeholders(args: unknown[]): string {
  return args.map((_, i) => `$${i + 1}`).join(", ");
}

/** Lock waits that lost a race or ran out of time: safe to try again. */
const RETRYABLE_SQLSTATES = new Set(["40P01", "40001", "55P03", "57014"]);

/**
 * Turns a database error into a QuestError when it is one of ours. Anything
 * else is logged by function name and SQLSTATE only: messages and details can
 * contain student text, which never goes to logs.
 */
export function toQuestError(error: unknown, fn: string): Error {
  const err = error as { message?: string; detail?: string; code?: string };
  const match = /^sq:([a-z_]+)/.exec(err?.message ?? "");
  if (match) return new QuestError(match[1], err.detail, fn);
  if (err?.code && RETRYABLE_SQLSTATES.has(err.code)) {
    console.error(`[shift-quests] ${fn} busy (SQLSTATE ${err.code})`);
    return new QuestError("busy", undefined, fn);
  }
  console.error(`[shift-quests] ${fn} failed (SQLSTATE ${err?.code ?? "unknown"})`);
  return new QuestDbError(fn, err?.code ?? "unknown");
}

export function createQuestApi(pool: pg.Pool): QuestApi {
  async function query(fn: string, sql: string, args: unknown[]): Promise<pg.QueryResult> {
    try {
      return await pool.query(sql, args);
    } catch (error) {
      throw toQuestError(error, fn);
    }
  }

  return {
    async call<T>(fn: string, ...args: unknown[]): Promise<T> {
      assertCallable(fn);
      const { rows } = await query(fn, `select public.${fn}(${placeholders(args)}) as r`, args);
      return rows[0]?.r as T;
    },
    async rows<T>(fn: string, ...args: unknown[]): Promise<T[]> {
      assertCallable(fn);
      const { rows } = await query(fn, `select * from public.${fn}(${placeholders(args)})`, args);
      return rows as T[];
    },
  };
}

// ---------------------------------------------------------------------------
// Shapes returned by the functions the handlers read most
// ---------------------------------------------------------------------------

export interface Session {
  member_id: string | null;
  onboarded: boolean;
  roles: string[];
  current_project_id: string | null;
  unread: number;
  prefs: { reminders_opt_in: boolean; reminder_days: number[]; reminder_hour: number | null; notify_dm: boolean } | null;
  settings: {
    student_role_ids: string[];
    awards: boolean;
    redemption: boolean;
    sharing: boolean;
    reminders: boolean;
    reward_terms: string | null;
    redemption_terms: string | null;
    /** /admin feature squads (20261111090800_shift_quests_seasons). Absent or false: squads are not open. */
    squads?: boolean;
  };
}

export interface RuleSummary {
  key: string;
  version: number;
  amount: number;
  cap: number | null;
  team_allocation: string | null;
  eligibility: string;
  review_process: string;
  reversal_policy: string;
}

export interface Template {
  id: string;
  slug: string;
  title: string;
  purpose: string;
  routes: string;
  examples: string;
  evidence_criteria: string;
  reflection_prompt: string;
  support_options: string;
  repeatable: boolean;
  /** The island milestone (1 to 7) the template stands for, or null. */
  milestone?: number | null;
  reward: RuleSummary | null;
  taken: boolean;
}

export interface Quest {
  id: string;
  title: string;
  state: string;
  version: number;
  goal: string;
  why: string | null;
  next_step: string;
  criteria: string;
  review_date: string | null;
  overdue: boolean;
  proposed: boolean;
  reward_agreed: boolean;
  reward: RuleSummary | null;
  award_status: string | null;
  award_note: string | null;
  project_id: string | null;
  reflection_prompt: string | null;
  latest_submission: { id: string; revision: number; status: string; created_at: string } | null;
  latest_review: { outcome: string; feedback: string | null; created_at: string } | null;
}
