import "server-only";

import { QuestDbError, QuestError, type QuestApi } from "@/bot/src/quests/api";

import type { CharacterStats } from "./playerTypes";

/**
 * The viewer's character sheet: tree stage as the level, quests the team and
 * the viewer did, community value, check-in days and the coin summary, read
 * through shift_quest_character (migration 20261111095000_shift_quest_player.sql,
 * web only, the same gate as shift_quest_island). Counts only: no ids, no
 * names, nothing about anyone else, no ranking. Callers enforce eligibility
 * first (a ready viewer), as for every other island read.
 */

/** shift_quest_character's JSON, snake_case. */
interface CharacterRow {
  stage?: unknown;
  main?: { team?: unknown; mine?: unknown } | null;
  side?: { team?: unknown; mine?: unknown } | null;
  community?: { milestones?: unknown; mine?: unknown; thanks?: unknown } | null;
  checkins?: { days_active?: unknown; this_week?: unknown; run?: unknown } | null;
  coins?: { live?: unknown; shop_live?: unknown; balance?: unknown; reserved?: unknown } | null;
}

/** Logged once per process: the function missing before the migration (42883) or not granted (42501). */
const ONCE = new Set(["SQLSTATE 42883", "SQLSTATE 42501"]);
const logged = new Set<string>();

function logFailure(code: string): void {
  if (ONCE.has(code)) {
    if (logged.has(code)) return;
    logged.add(code);
  }
  console.error(`[shift-island] character read failed: ${code}`);
}

function failureCode(error: unknown): string {
  if (error instanceof QuestError) return `sq:${error.code}`;
  if (error instanceof QuestDbError) return `SQLSTATE ${error.sqlstate}`;
  return error instanceof Error ? error.name : "unknown";
}

/** A whole count, clamped to [0, max]; anything that is not a finite number is 0. */
function count(value: unknown, max = Number.MAX_SAFE_INTEGER): number {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(Math.trunc(n), 0), max);
}

/**
 * A signed whole coin amount. The balance is the ledger sum and can go below
 * 0 when an admin reverses coins already spent: shown as it is, so the pill,
 * the wallet and the ledger always agree.
 */
function signedCoins(value: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

/** The row as CharacterStats, or null when it is not the shape the database returns. */
export function toCharacter(raw: unknown): CharacterStats | null {
  if (!isObject(raw)) return null;
  const row = raw as CharacterRow;
  const stage = count(row.stage, 7);
  const main = isObject(row.main) ? row.main : {};
  const side = isObject(row.side) ? row.side : {};
  const community = isObject(row.community) ? row.community : {};
  const checkins = isObject(row.checkins) ? row.checkins : {};
  const wallet = isObject(row.coins) ? row.coins : {};
  return {
    stage,
    main: { team: count(main.team, 7), mine: count(main.mine, 7) },
    side: { team: count(side.team), mine: count(side.mine) },
    community: {
      milestones: count(community.milestones, 2),
      mine: count(community.mine),
      thanks: count(community.thanks),
    },
    checkins: {
      daysActive: count(checkins.days_active),
      thisWeek: count(checkins.this_week, 7),
      run: count(checkins.run),
    },
    coins: {
      live: wallet.live === true,
      shopLive: wallet.shop_live === true,
      balance: signedCoins(wallet.balance),
      reserved: count(wallet.reserved),
    },
  };
}

/**
 * The character stats for one ready viewer, or null. Fails soft: a refusal,
 * a database error (the function missing before the migration, 42883, or not
 * granted, 42501, each logged once per process) or malformed data give null
 * and log only a code. Never throws.
 */
export async function characterOf(api: QuestApi, actor: string): Promise<CharacterStats | null> {
  try {
    const stats = toCharacter(await api.call<unknown>("shift_quest_character", actor));
    if (!stats) logFailure("malformed");
    return stats;
  } catch (error) {
    logFailure(failureCode(error));
    return null;
  }
}
