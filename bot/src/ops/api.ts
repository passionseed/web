import type pg from "pg";

import type { SeedOperation } from "./parse";
import type { OpDetail, OpSummary } from "./model";

/**
 * The ops board's only door into the database: public.hackathon_ops_*
 * functions, called as the least-privilege hackathon_ops_bot login
 * (migration 20261120100000). It can read no table.
 */

/** A rule the database refused, raised as 'ops:<code>'. */
export class OpsError extends Error {
  constructor(public readonly code: string) {
    super(`ops:${code}`);
    this.name = "OpsError";
  }
}

/** Any other database failure: the function name and SQLSTATE only, never the message. */
export class OpsDbError extends Error {
  constructor(
    public readonly fn: string,
    public readonly sqlstate: string
  ) {
    super(`${fn} failed (SQLSTATE ${sqlstate})`);
    this.name = "OpsDbError";
  }
}

export function toOpsError(error: unknown, fn: string): Error {
  const err = error as { message?: string; code?: string };
  const match = /^ops:([a-z_]+)/.exec(err?.message ?? "");
  if (match) return new OpsError(match[1]);
  console.error(`[hackathon-ops] ${fn} failed (SQLSTATE ${err?.code ?? "unknown"})`);
  return new OpsDbError(fn, err?.code ?? "unknown");
}

export interface SeedResult {
  inserted: number;
  updated: number;
  steps: number;
  not_in_source: number;
}

export interface StepResult extends OpSummary {
  position: number;
  text: string;
  done: boolean;
  changed: boolean;
}

export interface OpsApi {
  board(): Promise<OpSummary[]>;
  show(slug: string): Promise<OpDetail>;
  claim(slug: string, owner: string): Promise<OpSummary & { previous_owner: string | null }>;
  setStep(slug: string, position: number, done: boolean, by: string): Promise<StepResult>;
  setStatus(slug: string, status: string): Promise<OpSummary>;
  seed(ops: SeedOperation[], keepLive: boolean): Promise<SeedResult>;
  claimMorning(day: string): Promise<boolean>;
  releaseMorning(day: string): Promise<void>;
}

/** Something with pg.Pool's query, so tests can pass a fake. */
export type Queryable = Pick<pg.Pool, "query">;

export function createOpsApi(pool: Queryable, board: string): OpsApi {
  async function call<T>(fn: string, ...args: unknown[]): Promise<T> {
    const params = [board, ...args];
    const placeholders = params.map((_, k) => `$${k + 1}`).join(", ");
    try {
      const result = await pool.query(`SELECT public.${fn}(${placeholders}) AS value`, params);
      return result.rows[0]?.value as T;
    } catch (error) {
      throw toOpsError(error, fn);
    }
  }

  return {
    board: () => call<OpSummary[]>("hackathon_ops_board"),
    show: (slug) => call<OpDetail>("hackathon_ops_show", slug),
    claim: (slug, owner) => call("hackathon_ops_claim", slug, owner),
    setStep: (slug, position, done, by) => call<StepResult>("hackathon_ops_step_set", slug, position, done, by),
    setStatus: (slug, status) => call<OpSummary>("hackathon_ops_status_set", slug, status),
    seed: (ops, keepLive) => call<SeedResult>("hackathon_ops_seed", JSON.stringify(ops), keepLive),
    claimMorning: (day) => call<boolean>("hackathon_ops_morning_claim", day),
    releaseMorning: async (day) => {
      await call<void>("hackathon_ops_morning_release", day);
    },
  };
}
