/**
 * Seeds the Elemental hackathon's per-guild settings: the two editions, each
 * guild's settings row (edition, Discord role, channel and category ids, the
 * posting schedule, the /team create window) and the element boards. Run by
 * Big or staff with an admin URL; safe to run again (same input, same state).
 *
 *   read -rs ELEMENTAL_ADMIN_DATABASE_URL && export ELEMENTAL_ADMIN_DATABASE_URL
 *   pnpm exec tsx scripts/elemental/seed.ts --dry-run    # shows the plan, changes nothing
 *   pnpm exec tsx scripts/elemental/seed.ts
 *
 * Input: scripts/elemental/local/seed.json (git-ignored; --config to use
 * another file). Example in USAGE below. The event guild's schedule comes from
 * the flags, whose defaults equal the programme in
 * components/hackathon/poster/elemental/facts.ts (scripts/elemental/__tests__
 * holds them equal); a rehearsal guild gives its own schedule in the JSON.
 *
 * Refuses, before changing anything:
 * - the real guild (real_guild_id) mapped to a rehearsal edition, or a guild
 *   already bound to the event edition remapped to a rehearsal one;
 * - any other guild mapped to the event edition;
 * - an element with no board, a board id that is not a whiteboard, or a board
 *   that already belongs to the other edition;
 * - an edition that is already bound to another guild.
 * Everything runs in one transaction: any refusal leaves the database as it was.
 * The admin URL is never printed.
 */
import fs from "node:fs";
import path from "node:path";

import { ELEMENT_KEYS, isBangkokDay, isBangkokTime, addBangkokDays, type ElementKey } from "../../lib/elemental/core";

import {
  ADMIN_URL_ENV,
  LOCAL_DIR,
  StopError,
  UsageError,
  describeError,
  readAdmin,
  runMain,
  usageFailure,
  type DbClient,
  type Deps,
} from "./admin-db";

// ---------------------------------------------------------------------------
// Editions and the event's dates
// ---------------------------------------------------------------------------

/** The editions this script may create; elemental_editions holds the same two. */
export const EDITIONS = {
  "elemental-2026": { kind: "event", eventSlug: "elemental-2026" },
  "elemental-dryrun": { kind: "rehearsal", eventSlug: null },
} as const;
export type EditionKey = keyof typeof EDITIONS;

/**
 * The event guild's posting schedule (Bangkok wall clock). Dates and the
 * opening time follow ELEMENTAL.schedule in facts.ts (the 'open' entry and the
 * first to the last programme day); call_at is the campfire call 5 minutes
 * before 20:00, card_at the nightly card (E19). Parity-tested.
 */
export const EVENT_DEFAULTS = {
  openingDay: "2026-12-04",
  openingAt: "19:00",
  firstDay: "2026-12-04",
  lastDay: "2026-12-07",
  callAt: "19:55",
  cardAt: "20:30",
} as const;

export const ROLE_KEYS = ["host", "helper", "mentor", "judge", "safety", "paid", ...ELEMENT_KEYS] as const;
/** bot/src/elemental/context.ts CHANNEL_KEYS. */
export const CHANNEL_KEYS = ["start_here", "news", "mirror", "reports", "campfire"] as const;

const SNOWFLAKE = /^[0-9]{17,20}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** An instant with an explicit offset, so a window is never read in the wrong zone. */
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

export const DEFAULT_CONFIG = path.join(LOCAL_DIR, "seed.json");

export const USAGE = `usage: pnpm exec tsx scripts/elemental/seed.ts [--config FILE] [--dry-run]
         [--opening YYYY-MM-DDTHH:MM] [--days FIRST..LAST | --days D1,D2,...]
         [--call-at HH:MM] [--card-at HH:MM] [--allow-date-change]

  --config FILE        the guild list (default scripts/elemental/local/seed.json, git-ignored)
  --dry-run            run everything in a transaction, print the result, roll it back
  --opening            event opening post, Bangkok time       (default ${EVENT_DEFAULTS.openingDay}T${EVENT_DEFAULTS.openingAt})
  --days               event days with a campfire call and card (default ${EVENT_DEFAULTS.firstDay}..${EVENT_DEFAULTS.lastDay})
  --call-at            campfire call time each event day        (default ${EVENT_DEFAULTS.callAt})
  --card-at            nightly card time each event day          (default ${EVENT_DEFAULTS.cardAt})
  --allow-date-change  accept event dates that differ from facts.ts (then update facts.ts too)

environment (never printed):
  ${ADMIN_URL_ENV}  admin Postgres URL (the postgres user)

config (JSON):
  {
    "real_guild_id": "<the hackathon guild id>",
    "guilds": [
      {
        "guild_id": "<snowflake>",
        "edition": "elemental-2026" | "elemental-dryrun",
        "role_ids": { "host": "<id>", "helper": "...", "mentor": "...", "judge": "...", "safety": "...",
                      "paid": "...", "water": "...", "earth": "...", "air": "...", "fire": "...", "aether": "..." },
        "channel_ids": { "start_here": "<id>", "news": "...", "mirror": "...", "reports": "...", "campfire": "..." },
        "element_category_ids": { "water": ["<category id>", ...], ... },
        "boards": { "water": ["<whiteboard uuid>", ...], "earth": [...], "air": [...], "fire": [...], "aether": [...] },
        "schedule": { "YYYY-MM-DD": { "opening_at"?: "HH:MM", "call_at": "HH:MM", "card_at": "HH:MM" } },
        "team_create_opens_at": "2026-12-04T20:00:00+07:00" | null,
        "team_create_closes_at": null,
        "retention_until": "2027-03-31T00:00:00+07:00",
        "tester_cap": 10, "team_cap": 175
      }
    ]
  }
  "schedule" is for a rehearsal guild only (the event guild's comes from the flags).
  Optional keys left out are left as they are in the database; null clears them.`;

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

export interface ScheduleDay {
  opening_at?: string;
  call_at: string;
  card_at: string;
}
export type Schedule = Record<string, ScheduleDay>;

export interface EventDates {
  openingDay: string;
  openingAt: string;
  days: string[];
  callAt: string;
  cardAt: string;
}

export interface Options {
  configPath: string;
  dryRun: boolean;
  help: boolean;
  allowDateChange: boolean;
  dates: EventDates;
}

/** Every Bangkok day from first to last, inclusive. */
export function dayRange(first: string, last: string): string[] {
  if (!isBangkokDay(first) || !isBangkokDay(last)) throw new UsageError("--days takes YYYY-MM-DD..YYYY-MM-DD");
  if (last < first) throw new UsageError("--days: the last day is before the first");
  const days: string[] = [];
  for (let day = first; day <= last; day = addBangkokDays(day, 1)) {
    days.push(day);
    if (days.length > 31) throw new UsageError("--days: more than 31 days");
  }
  return days;
}

function parseDays(value: string): string[] {
  const range = /^(.+)\.\.(.+)$/.exec(value);
  if (range) return dayRange(range[1], range[2]);
  const days = [...new Set(value.split(",").map((d) => d.trim()).filter(Boolean))].sort();
  if (!days.length || !days.every(isBangkokDay)) throw new UsageError("--days takes YYYY-MM-DD..YYYY-MM-DD or a comma list of days");
  return days;
}

function time(flag: string, value: string): string {
  if (!isBangkokTime(value)) throw new UsageError(`${flag} takes HH:MM (24-hour, Bangkok time)`);
  return value;
}

export function parseArgs(argv: string[]): Options {
  const dates: EventDates = {
    openingDay: EVENT_DEFAULTS.openingDay,
    openingAt: EVENT_DEFAULTS.openingAt,
    days: dayRange(EVENT_DEFAULTS.firstDay, EVENT_DEFAULTS.lastDay),
    callAt: EVENT_DEFAULTS.callAt,
    cardAt: EVENT_DEFAULTS.cardAt,
  };
  const options: Options = { configPath: DEFAULT_CONFIG, dryRun: false, help: false, allowDateChange: false, dates };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const eq = arg.indexOf("=");
    const flag = arg.startsWith("--") && eq > 0 ? arg.slice(0, eq) : arg;
    const value = () => {
      const v = eq > 0 && arg.startsWith("--") ? arg.slice(eq + 1) : argv[++i];
      if (v === undefined || v === "") throw new UsageError(`${flag} needs a value`);
      return v;
    };
    if (flag === "--dry-run") options.dryRun = true;
    else if (flag === "--help" || flag === "-h") options.help = true;
    else if (flag === "--allow-date-change") options.allowDateChange = true;
    else if (flag === "--config") options.configPath = path.resolve(value());
    else if (flag === "--opening") {
      const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(value());
      if (!m || !isBangkokDay(m[1]) || !isBangkokTime(m[2])) throw new UsageError("--opening takes YYYY-MM-DDTHH:MM (Bangkok time)");
      dates.openingDay = m[1];
      dates.openingAt = m[2];
    } else if (flag === "--days") dates.days = parseDays(value());
    else if (flag === "--call-at") dates.callAt = time(flag, value());
    else if (flag === "--card-at") dates.cardAt = time(flag, value());
    else throw new UsageError(`unknown argument: ${arg}`);
  }
  if (!dates.days.includes(dates.openingDay)) throw new UsageError("--opening must fall on one of --days");
  return options;
}

/** True when the dates are the facts.ts defaults. */
export function datesAreDefault(dates: EventDates): boolean {
  const d = EVENT_DEFAULTS;
  const days = dayRange(d.firstDay, d.lastDay);
  return (
    dates.openingDay === d.openingDay &&
    dates.openingAt === d.openingAt &&
    dates.callAt === d.callAt &&
    dates.cardAt === d.cardAt &&
    dates.days.length === days.length &&
    dates.days.every((day, i) => day === days[i])
  );
}

/** The event guild's elemental_settings.schedule. */
export function eventSchedule(dates: EventDates): Schedule {
  const schedule: Schedule = {};
  for (const day of dates.days) {
    schedule[day] = {
      ...(day === dates.openingDay ? { opening_at: dates.openingAt } : {}),
      call_at: dates.callAt,
      card_at: dates.cardAt,
    };
  }
  return schedule;
}

// ---------------------------------------------------------------------------
// The config file
// ---------------------------------------------------------------------------

export interface GuildSeed {
  guildId: string;
  edition: EditionKey;
  /** null when the key is absent from the JSON: the database value is kept. */
  roleIds: Record<string, string> | null;
  channelIds: Record<string, string> | null;
  elementCategoryIds: Record<string, string[]> | null;
  boards: Record<ElementKey, string[]>;
  /** Rehearsal guilds only; the event guild's comes from the flags. */
  schedule: Schedule | null;
  /** Optional columns: a key that is absent is not written. */
  optional: Partial<Record<OptionalColumn, string | number | null>>;
}

export interface SeedConfig {
  realGuildId: string | null;
  guilds: GuildSeed[];
}

const OPTIONAL_COLUMNS = ["team_create_opens_at", "team_create_closes_at", "retention_until", "tester_cap", "team_cap"] as const;
type OptionalColumn = (typeof OPTIONAL_COLUMNS)[number];
const TIMESTAMP_COLUMNS: readonly OptionalColumn[] = ["team_create_opens_at", "team_create_closes_at", "retention_until"];
const INT_RANGE: Partial<Record<OptionalColumn, [number, number]>> = { tester_cap: [1, 100], team_cap: [1, 200] };

const GUILD_KEYS = new Set([
  "guild_id",
  "edition",
  "role_ids",
  "channel_ids",
  "element_category_ids",
  "boards",
  "schedule",
  ...OPTIONAL_COLUMNS,
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Mirrors public.elemental__valid_schedule; returns the problems found. */
export function scheduleProblems(schedule: unknown): string[] {
  if (!isObject(schedule)) return ["must be an object of days"];
  const problems: string[] = [];
  for (const [day, value] of Object.entries(schedule)) {
    if (!isBangkokDay(day)) problems.push(`${day}: not a YYYY-MM-DD day`);
    if (!isObject(value)) {
      problems.push(`${day}: must be an object`);
      continue;
    }
    for (const key of ["call_at", "card_at"]) {
      if (!(key in value)) problems.push(`${day}: ${key} is required`);
    }
    for (const [key, at] of Object.entries(value)) {
      if (!["opening_at", "call_at", "card_at"].includes(key)) problems.push(`${day}: unknown key ${key}`);
      else if (!isBangkokTime(at)) problems.push(`${day}.${key}: must be "HH:MM"`);
    }
  }
  return problems;
}

/**
 * Checks the config file's content. Throws one UsageError listing every
 * problem; returns warnings (missing role or channel ids) for the operator.
 */
export function parseConfig(input: unknown): { config: SeedConfig; warnings: string[] } {
  const problems: string[] = [];
  const warnings: string[] = [];
  if (!isObject(input)) throw new UsageError("config: must be a JSON object with a guilds list");

  for (const key of Object.keys(input)) {
    if (key !== "real_guild_id" && key !== "guilds") problems.push(`config: unknown key ${key}`);
  }
  let realGuildId: string | null = null;
  if (input.real_guild_id !== undefined && input.real_guild_id !== null) {
    if (typeof input.real_guild_id !== "string" || !SNOWFLAKE.test(input.real_guild_id)) {
      problems.push("real_guild_id: must be a Discord id (17 to 20 digits, as a string)");
    } else realGuildId = input.real_guild_id;
  }
  if (!Array.isArray(input.guilds) || input.guilds.length === 0) {
    throw new UsageError([...problems, "guilds: must be a non-empty list"].join("\n"));
  }

  const guilds: GuildSeed[] = [];
  const seenGuilds = new Set<string>();
  const seenEditions = new Set<string>();
  const seenBoards = new Map<string, string>();

  input.guilds.forEach((raw: unknown, index: number) => {
    const where = `guilds[${index}]`;
    if (!isObject(raw)) {
      problems.push(`${where}: must be an object`);
      return;
    }
    for (const key of Object.keys(raw)) {
      if (!GUILD_KEYS.has(key)) problems.push(`${where}: unknown key ${key}`);
    }
    const guildId = typeof raw.guild_id === "string" && SNOWFLAKE.test(raw.guild_id) ? raw.guild_id : null;
    if (!guildId) problems.push(`${where}.guild_id: must be a Discord id (17 to 20 digits, as a string)`);
    const label = guildId ? `guild ${guildId}` : where;
    if (guildId && seenGuilds.has(guildId)) problems.push(`${label}: listed twice`);
    if (guildId) seenGuilds.add(guildId);

    const edition = typeof raw.edition === "string" && raw.edition in EDITIONS ? (raw.edition as EditionKey) : null;
    if (!edition) problems.push(`${label}.edition: must be one of ${Object.keys(EDITIONS).join(", ")}`);
    if (edition && seenEditions.has(edition)) problems.push(`${label}: edition ${edition} is given to two guilds (one guild per edition)`);
    if (edition) seenEditions.add(edition);
    const kind = edition ? EDITIONS[edition].kind : null;

    // The real guild is only ever the event; the event is only ever the real guild.
    if (guildId && realGuildId && guildId === realGuildId && kind === "rehearsal") {
      problems.push(
        `${label}: refusing to map the real hackathon guild (real_guild_id) to the rehearsal edition ${edition}`,
      );
    }
    if (guildId && kind === "event" && guildId !== realGuildId) {
      problems.push(
        realGuildId
          ? `${label}: only real_guild_id may use the event edition ${edition}`
          : `${label}: set real_guild_id to this guild's id to bind it to the event edition ${edition}`,
      );
    }

    const ids = (field: string, allowed: readonly string[]): Record<string, string> | null => {
      const src = raw[field];
      const out: Record<string, string> = {};
      if (src === undefined) {
        warnings.push(`${label}: no ${field} (left as it is in the database)`);
        return null;
      }
      if (!isObject(src)) {
        problems.push(`${label}.${field}: must be an object`);
        return out;
      }
      for (const [key, id] of Object.entries(src)) {
        if (!allowed.includes(key)) problems.push(`${label}.${field}: unknown key ${key} (allowed: ${allowed.join(", ")})`);
        else if (typeof id !== "string" || !SNOWFLAKE.test(id)) problems.push(`${label}.${field}.${key}: must be a Discord id string`);
        else out[key] = id;
      }
      const missing = allowed.filter((key) => !(key in src));
      if (missing.length) warnings.push(`${label}.${field}: not set yet: ${missing.join(", ")}`);
      return out;
    };
    const roleIds = ids("role_ids", ROLE_KEYS);
    const channelIds = ids("channel_ids", CHANNEL_KEYS);

    const cats = raw.element_category_ids;
    const elementCategoryIds: Record<string, string[]> | null = cats === undefined ? null : {};
    if (cats !== undefined && !isObject(cats)) problems.push(`${label}.element_category_ids: must be an object`);
    else if (isObject(cats) && elementCategoryIds) {
      for (const [key, list] of Object.entries(cats)) {
        if (!(ELEMENT_KEYS as readonly string[]).includes(key)) problems.push(`${label}.element_category_ids: unknown element ${key}`);
        else if (!Array.isArray(list) || !list.every((id) => typeof id === "string" && SNOWFLAKE.test(id))) {
          problems.push(`${label}.element_category_ids.${key}: must be a list of Discord id strings`);
        } else elementCategoryIds[key] = list as string[];
      }
    }
    const noCats = ELEMENT_KEYS.filter((el) => !elementCategoryIds?.[el]?.length);
    if (elementCategoryIds === null) warnings.push(`${label}: no element_category_ids (left as it is in the database)`);
    else if (noCats.length) warnings.push(`${label}.element_category_ids: no category yet for ${noCats.join(", ")}`);

    // Boards: every element needs at least one.
    const boards = {} as Record<ElementKey, string[]>;
    const rawBoards = raw.boards;
    if (!isObject(rawBoards)) {
      problems.push(`${label}.boards: missing; every element (${ELEMENT_KEYS.join(", ")}) needs at least one whiteboard id`);
    } else {
      for (const key of Object.keys(rawBoards)) {
        if (!(ELEMENT_KEYS as readonly string[]).includes(key)) problems.push(`${label}.boards: unknown element ${key}`);
      }
      for (const element of ELEMENT_KEYS) {
        const list = rawBoards[element];
        if (!Array.isArray(list) || list.length === 0) {
          problems.push(`${label}.boards.${element}: missing; every element needs at least one whiteboard id`);
          continue;
        }
        const clean: string[] = [];
        for (const id of list) {
          if (typeof id !== "string" || !UUID.test(id)) {
            problems.push(`${label}.boards.${element}: ${JSON.stringify(id)} is not a whiteboard id (uuid)`);
            continue;
          }
          const lower = id.toLowerCase();
          const before = seenBoards.get(lower);
          if (before) problems.push(`${label}.boards.${element}: board ${lower} is already listed under ${before}`);
          seenBoards.set(lower, `${label} ${element}`);
          clean.push(lower);
        }
        boards[element] = clean;
      }
    }

    let schedule: Schedule | null = null;
    if (raw.schedule !== undefined) {
      if (kind === "event") {
        problems.push(`${label}.schedule: the event guild's schedule comes from the flags (--opening, --days, --call-at, --card-at)`);
      } else {
        const found = scheduleProblems(raw.schedule);
        if (found.length) problems.push(...found.map((p) => `${label}.schedule ${p}`));
        else schedule = raw.schedule as Schedule;
      }
    }

    const optional: GuildSeed["optional"] = {};
    for (const column of OPTIONAL_COLUMNS) {
      if (!(column in raw)) continue;
      const value = raw[column];
      if (value === null) optional[column] = null;
      else if (TIMESTAMP_COLUMNS.includes(column)) {
        if (typeof value !== "string" || !INSTANT.test(value) || Number.isNaN(Date.parse(value))) {
          problems.push(`${label}.${column}: must be an ISO time with an offset, e.g. 2026-12-04T20:00:00+07:00, or null`);
        } else optional[column] = value;
      } else {
        const [lo, hi] = INT_RANGE[column]!;
        if (!Number.isInteger(value) || (value as number) < lo || (value as number) > hi) {
          problems.push(`${label}.${column}: must be a whole number from ${lo} to ${hi}`);
        } else optional[column] = value as number;
      }
    }
    const opens = optional.team_create_opens_at;
    const closes = optional.team_create_closes_at;
    if (typeof opens === "string" && typeof closes === "string" && Date.parse(closes) <= Date.parse(opens)) {
      problems.push(`${label}: team_create_closes_at must be after team_create_opens_at`);
    }

    if (guildId && edition) {
      guilds.push({ guildId, edition, roleIds, channelIds, elementCategoryIds, boards, schedule, optional });
    }
  });

  if (problems.length) throw new UsageError(problems.join("\n"));
  return { config: { realGuildId, guilds }, warnings };
}

// ---------------------------------------------------------------------------
// The database
// ---------------------------------------------------------------------------

/** Makes sure both editions exist with the kind this script expects. */
async function seedEditions(client: DbClient, out: (line: string) => void): Promise<void> {
  for (const [key, want] of Object.entries(EDITIONS)) {
    const { rows: created } = await client.query(
      `INSERT INTO public.elemental_editions (key, kind, event_slug) VALUES ($1, $2, $3)
       ON CONFLICT (key) DO NOTHING RETURNING key`,
      [key, want.kind, want.eventSlug],
    );
    const { rows } = await client.query("SELECT kind, event_slug FROM public.elemental_editions WHERE key = $1", [key]);
    const have = rows[0];
    if (!have || have.kind !== want.kind || (have.event_slug ?? null) !== want.eventSlug) {
      throw new StopError(
        `Edition ${key} exists as kind ${String(have?.kind)}, event_slug ${String(have?.event_slug ?? "null")}; ` +
          `this script expects ${want.kind}, ${String(want.eventSlug ?? "null")}. Fix it by hand first.`,
      );
    }
    out(`  edition ${key} (${want.kind}): ${created.length ? "created" : "ok"}`);
  }
}

async function seedSettings(client: DbClient, guild: GuildSeed, schedule: Schedule | null): Promise<string> {
  const { rows: current } = await client.query(
    `SELECT s.edition, e.kind FROM public.elemental_settings s
     JOIN public.elemental_editions e ON e.key = s.edition WHERE s.guild_id = $1`,
    [guild.guildId],
  );
  const kind = EDITIONS[guild.edition].kind;
  const before = current[0];
  if (before && before.kind === "event" && kind === "rehearsal") {
    throw new StopError(
      `Refusing: guild ${guild.guildId} is bound to the event edition ${String(before.edition)}; ` +
        `the real hackathon guild is never mapped to a rehearsal edition.`,
    );
  }
  const { rows: holders } = await client.query(
    "SELECT guild_id FROM public.elemental_settings WHERE edition = $1 AND guild_id <> $2",
    [guild.edition, guild.guildId],
  );
  if (holders.length) {
    throw new StopError(
      `Edition ${guild.edition} is already bound to guild ${String(holders[0].guild_id)} (one guild per edition). ` +
        `Move it by hand if that is really wanted.`,
    );
  }

  const columns: string[] = ["guild_id", "edition"];
  const values: unknown[] = [guild.guildId, guild.edition];
  const casts: string[] = ["text", "text"];
  // An id map left out of the JSON keeps its database value (the default {} on a new row).
  for (const [column, ids] of [
    ["role_ids", guild.roleIds],
    ["channel_ids", guild.channelIds],
    ["element_category_ids", guild.elementCategoryIds],
  ] as const) {
    if (ids === null) continue;
    columns.push(column);
    values.push(JSON.stringify(ids));
    casts.push("jsonb");
  }
  if (schedule) {
    columns.push("schedule");
    values.push(JSON.stringify(schedule));
    casts.push("jsonb");
  }
  for (const [column, value] of Object.entries(guild.optional)) {
    columns.push(column);
    values.push(value);
    casts.push(TIMESTAMP_COLUMNS.includes(column as OptionalColumn) ? "timestamptz" : "integer");
  }
  const updatable = columns.filter((c) => c !== "guild_id");
  const sql = `
    INSERT INTO public.elemental_settings AS s (${columns.join(", ")})
    VALUES (${columns.map((_, i) => `$${i + 1}::${casts[i]}`).join(", ")})
    ON CONFLICT (guild_id) DO UPDATE SET
      ${updatable.map((c) => `${c} = EXCLUDED.${c}`).join(", ")}, updated_at = now()
    WHERE (${updatable.map((c) => `s.${c}`).join(", ")}) IS DISTINCT FROM (${updatable.map((c) => `EXCLUDED.${c}`).join(", ")})
    RETURNING (xmax = 0) AS inserted`;
  const { rows } = await client.query(sql, values);
  const moved = before && before.edition !== guild.edition ? ` (moved from ${String(before.edition)})` : "";
  if (!rows.length) return "unchanged";
  return (rows[0].inserted ? "created" : "updated") + moved;
}

async function seedBoards(client: DbClient, guild: GuildSeed, warn: (line: string) => void): Promise<string> {
  const ids = ELEMENT_KEYS.flatMap((el) => guild.boards[el]);
  const elements = ELEMENT_KEYS.flatMap((el) => guild.boards[el].map(() => el));

  const { rows: missing } = await client.query(
    `SELECT b::text AS id FROM unnest($1::uuid[]) AS b
     WHERE NOT EXISTS (SELECT 1 FROM public.whiteboards w WHERE w.id = b)`,
    [ids],
  );
  if (missing.length) {
    throw new StopError(
      `guild ${guild.guildId}: these board ids are not whiteboards: ${missing.map((r) => String(r.id)).join(", ")}. ` +
        `Create each board on /whiteboard and copy its id from the URL.`,
    );
  }
  const { rows: elsewhere } = await client.query(
    `SELECT board_id::text AS id, edition FROM public.elemental_boards
     WHERE board_id = ANY ($1::uuid[]) AND edition <> $2`,
    [ids, guild.edition],
  );
  if (elsewhere.length) {
    throw new StopError(
      `guild ${guild.guildId}: refusing to share boards between editions: ` +
        elsewhere.map((r) => `${String(r.id)} is a ${String(r.edition)} board`).join("; "),
    );
  }

  const { rows: written } = await client.query(
    `INSERT INTO public.elemental_boards AS b (edition, board_id, element)
     SELECT $1, t.board_id, t.element FROM unnest($2::uuid[], $3::text[]) AS t(board_id, element)
     ON CONFLICT (edition, board_id) DO UPDATE SET element = EXCLUDED.element
     WHERE b.element IS DISTINCT FROM EXCLUDED.element
     RETURNING board_id::text AS id, (xmax = 0) AS inserted`,
    [guild.edition, ids, elements],
  );
  const { rows: extra } = await client.query(
    `SELECT board_id::text AS id, element FROM public.elemental_boards
     WHERE edition = $1 AND NOT (board_id = ANY ($2::uuid[])) ORDER BY element, board_id`,
    [guild.edition, ids],
  );
  for (const row of extra) {
    warn(`  guild ${guild.guildId}: board ${String(row.id)} (${String(row.element)}) is in ${guild.edition} but not in the config; left as is`);
  }
  const added = written.filter((r) => r.inserted).length;
  const changed = written.length - added;
  const counts = ELEMENT_KEYS.map((el) => `${el} ${guild.boards[el].length}`).join(", ");
  return `${counts} (${added} added, ${changed} moved to another element, ${ids.length - written.length} unchanged)`;
}

function readConfigFile(file: string): unknown {
  let text: string;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    throw new UsageError(`Cannot read the config file ${file}. Copy the example from --help into it.`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new UsageError(`${file} is not valid JSON`);
  }
}

/** Runs the script. Returns the exit code: 0 ok, 1 refused or failed, 2 usage. */
export async function run(argv: string[], deps: Deps): Promise<number> {
  let options: Options;
  let config: SeedConfig;
  let warnings: string[];
  let admin: ReturnType<typeof readAdmin>;
  try {
    options = parseArgs(argv);
    if (options.help) {
      deps.out(USAGE);
      return 0;
    }
    if (!options.allowDateChange && !datesAreDefault(options.dates)) {
      throw new UsageError(
        "The event dates differ from components/hackathon/poster/elemental/facts.ts (ELEMENTAL.schedule). " +
          "If the programme really changed, update facts.ts and EVENT_DEFAULTS in this script, or pass --allow-date-change.",
      );
    }
    ({ config, warnings } = parseConfig(readConfigFile(options.configPath)));
    admin = readAdmin(deps.env, "elemental-seed");
  } catch (error) {
    if (error instanceof UsageError) return usageFailure(deps, error, USAGE);
    throw error;
  }

  for (const warning of warnings) deps.err(`warning: ${warning}`);

  let client: DbClient;
  try {
    client = await deps.connect(admin.config);
  } catch (error) {
    deps.err(`Could not connect as the admin user (${describeError(error, admin.secrets)})`);
    return 1;
  }

  let open = false;
  try {
    deps.out(options.dryRun ? "Seeding Elemental (dry run: everything is rolled back)" : "Seeding Elemental");
    await client.query("BEGIN");
    open = true;
    await client.query("SELECT pg_advisory_xact_lock(17741, hashtext('elemental:seed'))");
    await seedEditions(client, deps.out);
    for (const guild of config.guilds) {
      const kind = EDITIONS[guild.edition].kind;
      const schedule = kind === "event" ? eventSchedule(options.dates) : guild.schedule;
      const settings = await seedSettings(client, guild, schedule);
      deps.out(`  guild ${guild.guildId} -> ${guild.edition} (${kind}): settings ${settings}`);
      if (schedule) deps.out(`    schedule: ${Object.keys(schedule).sort().join(", ") || "no days"}`);
      deps.out(`    boards: ${await seedBoards(client, guild, deps.err)}`);
    }
    await client.query(options.dryRun ? "ROLLBACK" : "COMMIT");
    open = false;
    deps.out(options.dryRun ? "Dry run: rolled back, nothing changed." : "Done.");
    return 0;
  } catch (error) {
    if (open) await client.query("ROLLBACK").catch(() => undefined);
    deps.err(error instanceof StopError ? error.message : `Database call failed (${describeError(error, admin.secrets)})`);
    deps.err("Nothing was changed.");
    return 1;
  } finally {
    await client.end().catch(() => undefined);
  }
}

if (require.main === module) runMain(run);
