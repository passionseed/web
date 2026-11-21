import type { QuestApi } from "./api";

/**
 * The come-back DM (code name away; design in docs/designs/shift-island-away.md).
 *
 * A student chooses, on the island or in /settings, whether the bot may send
 * them one short DM after a stretch away. The DM is a pointer, never a
 * question: a title, one line and one link button to the island (copy in
 * AWAY_DM, ./copy). The question about why lives on the island, in the
 * student's own space. Who gets a DM, when and how often is decided by the
 * database (shift_quest_enqueue_away and shift_quest_outbox_claim); the bot
 * only calls the enqueue once a minute and sends what the claim hands it.
 */

/**
 * 20261121090000_shift_quest_away adds it. Optional: below 23 the delivery
 * loop only reads the version again each minute and starts queueing by itself
 * once the migration is applied, and /settings shows no come-back line.
 */
export const AWAY_SCHEMA = 23;

/** Apis whose database has been seen at AWAY_SCHEMA or later: a schema never goes back. */
const ready = new WeakSet<QuestApi>();

/**
 * Whether the database has the come-back DM (schema 23). Read again on every
 * call until it does, then remembered for this api, so a migration applied
 * while the bot runs is picked up without a restart. An older database or a
 * failed read is "not yet", never an error.
 */
export async function awayReady(api: QuestApi): Promise<boolean> {
  if (ready.has(api)) return true;
  try {
    const version = Number(await api.call<number>("shift_quest_schema_version"));
    if (!(version >= AWAY_SCHEMA)) return false;
  } catch {
    return false;
  }
  ready.add(api);
  return true;
}

/**
 * The delivery loop's minute step (outbox.ts): queues the come-back DMs that
 * are due. Returns how many were queued, or null below schema 23 (nothing
 * called but the version). The database checks the switch, the hour and the
 * season before anything else, so most minutes queue nothing. A failed call
 * throws; the loop catches it so the deliveries still go.
 */
export async function enqueueAway(api: QuestApi): Promise<number | null> {
  if (!(await awayReady(api))) return null;
  return Number(await api.call<number>("shift_quest_enqueue_away")) || 0;
}

/** What /settings needs from shift_quest_away_state: the switch, the stretch length and the student's choice. */
export interface AwaySetting {
  /** settings.away_enabled: off hides the whole feature. */
  enabled: boolean;
  /** settings.away_after_days (3 to 21), or null when the database says something else. */
  days: number | null;
  /** The student's choice: true yes, false no, null never asked (no DM either way). */
  dm: boolean | null;
}

/** shift_quest_away_state's answer (or shift_quest_away_set's, the same shape) as an AwaySetting; null when it is not one. */
export function awaySettingFrom(raw: unknown): AwaySetting | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const days = Number(r.days);
  return {
    enabled: r.enabled === true,
    days: Number.isInteger(days) && days >= 3 && days <= 21 ? days : null,
    dm: typeof r.dm === "boolean" ? r.dm : null,
  };
}

/**
 * Whether /settings shows the come-back line for this state: while the
 * switch is on, and while it is off for a student who said yes, so a yes can
 * always be taken back (the island notice promises it can, any time). The
 * line then offers only "off".
 */
export function awayLineShown(setting: AwaySetting | null): setting is AwaySetting {
  return setting != null && (setting.enabled || setting.dm === true);
}

/**
 * The /settings line's facts for one person, or null when there is no line:
 * staff (any role; the database sends staff nothing), a database below
 * schema 23, the feature switched off (unless they said yes: see
 * awayLineShown), or a read that failed. A failed read never fails /settings.
 */
export async function readAwaySetting(api: QuestApi, userId: string, roles: readonly string[]): Promise<AwaySetting | null> {
  if (roles.length) return null;
  if (!(await awayReady(api))) return null;
  let setting: AwaySetting | null;
  try {
    setting = awaySettingFrom(await api.call<unknown>("shift_quest_away_state", userId));
  } catch {
    return null;
  }
  return awayLineShown(setting) ? setting : null;
}
