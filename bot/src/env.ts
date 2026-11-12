/**
 * Bot configuration, validated once at startup.
 *
 * Fails loudly and immediately rather than at the first Discord call: a bot
 * that connects to the gateway and then discovers it has no Supabase key will
 * sit there looking healthy while silently recording nothing.
 *
 * The process runs modules chosen by BOT_MODULES (comma-separated, default
 * "shift-voice"). Each module checks only the variables it needs.
 */

export type BotModule = "shift-voice" | "shift-quests" | "projectseed";

const KNOWN_MODULES: BotModule[] = ["shift-voice", "shift-quests", "projectseed"];

export interface CoreEnv {
  discordToken: string;
}

/** ProjectSeed: voice hours, slot reminders and /stats in its own guild. */
export interface BotEnv extends CoreEnv {
  supabaseUrl: string;
  supabaseServiceKey: string;
  guildId: string;
  /** Text channel the reminders are posted to. */
  reminderChannelId: string;
  cohortSlug: string;
  /** Voice channels to record. Empty means every voice channel in the guild. */
  voiceChannelIds: string[];
  reminderIntervalMs: number;
}

/** SHIFT voice participation in the SHIFT server. */
export interface ShiftVoiceEnv {
  guildId: string;
  /**
   * Postgres URL for the least-privilege shift_voice_bot role, through the
   * Supavisor pooler. Never the service role key: see migration 20261109200000.
   */
  databaseUrl: string;
}

/** SHIFT High quests in the SHIFT server. */
export interface ShiftQuestsEnv {
  guildId: string;
  /**
   * Postgres URL for the least-privilege shift_quest_bot role, through the
   * Supavisor pooler. Never the service role key: see migration 20261111090600.
   */
  databaseUrl: string;
}

export interface LoadedEnv {
  core: CoreEnv;
  projectseed: BotEnv | null;
  shiftVoice: ShiftVoiceEnv | null;
  shiftQuests: ShiftQuestsEnv | null;
}

function optional(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

function required(name: string): string {
  const value = optional(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseModules(raw: string | undefined): Set<BotModule> {
  const names = (raw ?? "shift-voice")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  for (const name of names) {
    if (!KNOWN_MODULES.includes(name as BotModule)) {
      throw new Error(`Unknown BOT_MODULES entry "${name}". Known: ${KNOWN_MODULES.join(", ")}`);
    }
  }
  if (names.length === 0) throw new Error("BOT_MODULES is empty");
  return new Set(names as BotModule[]);
}

/**
 * One process, one gateway connection, one token. SHIFT resolves its token the
 * way the web app does (DISCORD_SHIFT_BOT_TOKEN, then DISCORD_BOT_TOKEN), so
 * the bot that hands out SHIFT roles is the bot that watches SHIFT voice.
 */
function resolveToken(modules: Set<BotModule>): string {
  const shared = optional("DISCORD_BOT_TOKEN");
  const shift = optional("DISCORD_SHIFT_BOT_TOKEN") ?? shared;
  const usesShift = modules.has("shift-voice") || modules.has("shift-quests");

  if (usesShift && modules.has("projectseed") && shift !== shared) {
    throw new Error(
      "DISCORD_SHIFT_BOT_TOKEN and DISCORD_BOT_TOKEN are different bots; run the SHIFT modules and projectseed as separate processes"
    );
  }
  const token = usesShift ? shift : shared;
  if (!token) {
    throw new Error(
      usesShift
        ? "Missing required environment variable: DISCORD_SHIFT_BOT_TOKEN or DISCORD_BOT_TOKEN"
        : "Missing required environment variable: DISCORD_BOT_TOKEN"
    );
  }
  return token;
}

export function loadEnv(): LoadedEnv {
  const modules = parseModules(process.env.BOT_MODULES);
  const core: CoreEnv = { discordToken: resolveToken(modules) };

  const projectseed: BotEnv | null = modules.has("projectseed")
    ? {
        ...core,
        supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
        supabaseServiceKey: required("SUPABASE_SERVICE_ROLE_KEY"),
        guildId: required("DISCORD_GUILD_ID"),
        reminderChannelId: required("DISCORD_REMINDER_CHANNEL_ID"),
        cohortSlug: optional("PSEED_COHORT_SLUG") ?? "alumni-mvp",
        voiceChannelIds: (process.env.PSEED_VOICE_CHANNEL_IDS ?? "")
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean),
        // Once a minute. Lead times are set in whole minutes, so polling faster
        // buys nothing and polling slower makes a 5-minute lead unreliable.
        reminderIntervalMs: Number(process.env.PSEED_REMINDER_INTERVAL_MS ?? 60_000),
      }
    : null;

  const shiftVoice: ShiftVoiceEnv | null = modules.has("shift-voice")
    ? { guildId: required("DISCORD_SHIFT_GUILD_ID"), databaseUrl: required("SHIFT_VOICE_DATABASE_URL") }
    : null;

  const shiftQuests: ShiftQuestsEnv | null = modules.has("shift-quests")
    ? { guildId: required("DISCORD_SHIFT_GUILD_ID"), databaseUrl: required("SHIFT_QUEST_DATABASE_URL") }
    : null;

  return { core, projectseed, shiftVoice, shiftQuests };
}
