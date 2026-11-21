/**
 * Elemental hackathon module configuration, read once at startup by
 * bot/src/env.ts when BOT_MODULES contains "elemental".
 *
 * There is no edition variable: each guild's elemental_settings row names the
 * edition (the real guild is always 'elemental-2026', the rehearsal guild
 * 'elemental-dryrun'), so a dry-run can never write into the real event.
 */

export interface ElementalEnv {
  /** Every guild the module answers in: the real hackathon guild and the rehearsal guild. */
  guildIds: string[];
  /**
   * Postgres URL for the least-privilege elemental_bot login, through the
   * Supavisor pooler. It may execute elemental_bot_* functions and nothing else.
   */
  databaseUrl: string;
  /** Optional web card endpoint (E24); the pixel card is the fallback. */
  cardUrl: string | null;
  /** Sent as a header to cardUrl; required when cardUrl is set. */
  cardSecret: string | null;
}

/**
 * The modules that must never share a process with elemental. It runs alone
 * in its own container (passionseed-discord-bot-elemental) with its own token,
 * so a slow hackathon night can never stall SHIFT voice rows or quests.
 * "hackathon-ops" is PR #344's module, listed even before it merges.
 */
export const ELEMENTAL_EXCLUSIVE = ["shift-voice", "shift-quests", "projectseed", "hackathon-ops"] as const;

const SNOWFLAKE = /^\d{17,20}$/;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

type Source = Record<string, string | undefined>;

function optional(source: Source, name: string): string | undefined {
  return source[name]?.trim() || undefined;
}

function required(source: Source, name: string): string {
  const value = optional(source, name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

/** Throws when elemental is asked to share a process with another module. */
export function assertElementalAlone(names: readonly string[]): void {
  if (!names.includes("elemental")) return;
  const others = [...new Set(names.filter((name) => name !== "elemental"))];
  if (others.length === 0) return;
  throw new Error(
    `BOT_MODULES: elemental runs alone in its own container (passionseed-discord-bot-elemental), ` +
      `never with ${ELEMENTAL_EXCLUSIVE.join(", ")}. Remove ${others.join(", ")} from BOT_MODULES, ` +
      `or run them in the main bot container.`
  );
}

/** The token: its own Discord application (own rate limit), else the shared one. */
export function elementalToken(source: Source = process.env): string {
  const token = optional(source, "ELEMENTAL_BOT_TOKEN") ?? optional(source, "DISCORD_BOT_TOKEN");
  if (!token) {
    throw new Error("Missing required environment variable: ELEMENTAL_BOT_TOKEN or DISCORD_BOT_TOKEN");
  }
  return token;
}

export function parseGuildIds(raw: string): string[] {
  const ids = [...new Set(raw.split(",").map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) throw new Error("ELEMENTAL_GUILD_IDS is empty");
  for (const id of ids) {
    if (!SNOWFLAKE.test(id)) {
      throw new Error("ELEMENTAL_GUILD_IDS must be Discord IDs (17 to 20 digits), comma-separated");
    }
  }
  return ids;
}

/**
 * The database URL must be a postgres URL for the elemental_bot login
 * ("elemental_bot" or the pooler's "elemental_bot.<project ref>"), so an
 * admin or service URL pasted by mistake fails at startup, not in production.
 * The URL itself is never echoed: it holds a password.
 */
export function checkDatabaseUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("ELEMENTAL_DATABASE_URL is not a valid URL");
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("ELEMENTAL_DATABASE_URL must be a postgresql:// URL");
  }
  const user = decodeURIComponent(url.username);
  if (user !== "elemental_bot" && !user.startsWith("elemental_bot.")) {
    throw new Error("ELEMENTAL_DATABASE_URL must log in as elemental_bot (the least-privilege role), never an admin role");
  }
  return raw;
}

function checkCardUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("ELEMENTAL_CARD_URL is not a valid URL");
  }
  const local = LOCAL_HOSTS.has(url.hostname);
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("ELEMENTAL_CARD_URL must be https (http only for localhost)");
  }
  return url.toString();
}

export function parseElementalEnv(source: Source = process.env): ElementalEnv {
  const cardUrl = optional(source, "ELEMENTAL_CARD_URL");
  const cardSecret = optional(source, "ELEMENTAL_CARD_SECRET") ?? null;
  if (cardUrl && !cardSecret) {
    throw new Error("ELEMENTAL_CARD_URL is set without ELEMENTAL_CARD_SECRET; set both or neither");
  }
  return {
    guildIds: parseGuildIds(required(source, "ELEMENTAL_GUILD_IDS")),
    databaseUrl: checkDatabaseUrl(required(source, "ELEMENTAL_DATABASE_URL")),
    cardUrl: cardUrl ? checkCardUrl(cardUrl) : null,
    cardSecret,
  };
}
