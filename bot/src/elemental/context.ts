import {
  MessageFlags,
  type APIApplicationCommandSubcommandOption,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type Client,
  type GuildMember,
  type Interaction,
  type InteractionEditReplyOptions,
  type InteractionReplyOptions,
  type MessageComponentInteraction,
  type ModalSubmitInteraction,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";

import { ElementalDbError, ElementalError, type ElementalApi } from "./api";
import { COMMON } from "./copy/common";
import type { ElementalEnv } from "./env";
import type { KeyedQueue } from "./queue";
import { ELEMENTS, GateError, STAFF_ROLES, requireRole, type ElementKey, type RoleKey, type StaffRole } from "./roles";

// ---------------------------------------------------------------------------
// Settings: one row per guild (elemental_settings), read through
// elemental_bot_settings_get(guild_id text) → jsonb | null.
// ---------------------------------------------------------------------------

export const CHANNEL_KEYS = ["start_here", "news", "mirror", "reports", "campfire"] as const;
export type ChannelKey = (typeof CHANNEL_KEYS)[number];

/** One event day's posting times, Bangkok wall clock "HH:MM" (or an ISO time, as SQL stores it). */
export interface ScheduleDay {
  opening_at?: string;
  call_at?: string;
  card_at?: string;
}

export interface ElementalSettings {
  guildId: string;
  /** The edition this guild writes to: 'elemental-2026' or 'elemental-dryrun'. */
  edition: string;
  editionKind: "event" | "rehearsal";
  /** Discord role IDs by key; a key staff have not set is absent. */
  roles: Partial<Record<RoleKey, string>>;
  channels: Partial<Record<ChannelKey, string>>;
  /** Per element, its category IDs in order (a new one when one fills at 50 channels). */
  elementCategories: Partial<Record<ElementKey, string[]>>;
  /** Keyed by Bangkok day "YYYY-MM-DD". */
  schedule: Record<string, ScheduleDay>;
  teamCreateOpensAt: string | null;
  teamCreateClosesAt: string | null;
  testerCap: number;
  teamCap: number;
  healSteps: number;
  healPerTeam: number;
  healingEnabled: boolean;
  cardOverride: { day: string; url: string } | null;
  retentionUntil: string | null;
  /** Exactly what SQL returned, for fields a later migration adds. */
  raw: Record<string, unknown>;
}

const SNOWFLAKE = /^\d{17,20}$/;

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function snowflake(value: unknown): string | undefined {
  const s = typeof value === "number" ? String(value) : value;
  return typeof s === "string" && SNOWFLAKE.test(s) ? s : undefined;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function int(value: unknown, fallback: number): number {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) ? n : fallback;
}

/**
 * Normalises the settings jsonb. Tolerant on purpose: a malformed ID is left
 * out (the gate then refuses) instead of failing every interaction. Accepts
 * a nested object (roles, channels, element_categories) or flat
 * "<key>_role_id" / "<key>_channel_id" columns.
 */
export function normalizeSettings(input: unknown, guildId: string): ElementalSettings | null {
  if (input === null || input === undefined) return null;
  const raw = obj(input);
  const edition = str(raw.edition) ?? str(raw.edition_key);
  if (!edition) return null;
  const kind = str(raw.edition_kind) ?? str(raw.kind);

  const roleSrc = obj(raw.roles ?? raw.role_ids);
  const roles: Partial<Record<RoleKey, string>> = {};
  for (const key of [...STAFF_ROLES, "paid" as const, ...ELEMENTS]) {
    const id = snowflake(roleSrc[key]) ?? snowflake(raw[`${key}_role_id`]);
    if (id) roles[key] = id;
  }

  const channelSrc = obj(raw.channels ?? raw.channel_ids);
  const channels: Partial<Record<ChannelKey, string>> = {};
  for (const key of CHANNEL_KEYS) {
    const id = snowflake(channelSrc[key]) ?? snowflake(raw[`${key}_channel_id`]);
    if (id) channels[key] = id;
  }

  const catSrc = obj(raw.element_categories ?? raw.element_category_ids ?? raw.categories);
  const elementCategories: Partial<Record<ElementKey, string[]>> = {};
  for (const element of ELEMENTS) {
    const list = Array.isArray(catSrc[element]) ? (catSrc[element] as unknown[]) : [];
    const ids = list.map(snowflake).filter((id): id is string => Boolean(id));
    if (ids.length) elementCategories[element] = ids;
  }

  const schedule: Record<string, ScheduleDay> = {};
  for (const [day, value] of Object.entries(obj(raw.schedule))) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    const v = obj(value);
    const entry: ScheduleDay = {};
    for (const k of ["opening_at", "call_at", "card_at"] as const) {
      const t = str(v[k]);
      if (t) entry[k] = t;
    }
    schedule[day] = entry;
  }

  const override = obj(raw.card_override);
  const overrideDay = str(override.day);
  const overrideUrl = str(override.url);

  return {
    guildId,
    edition,
    editionKind: kind === "rehearsal" ? "rehearsal" : "event",
    roles,
    channels,
    elementCategories,
    schedule,
    teamCreateOpensAt: str(raw.team_create_opens_at),
    teamCreateClosesAt: str(raw.team_create_closes_at),
    testerCap: int(raw.tester_cap, 10),
    teamCap: int(raw.team_cap, 175),
    healSteps: int(raw.heal_steps, 5),
    healPerTeam: int(raw.heal_per_team, 3),
    healingEnabled: raw.healing_enabled === true,
    cardOverride: overrideDay && overrideUrl ? { day: overrideDay, url: overrideUrl } : null,
    retentionUntil: str(raw.retention_until),
    raw,
  };
}

export const SETTINGS_FN = "elemental_bot_settings_get";
/** The heartbeat refreshes every minute; this only bounds staleness if it stalls. */
const SETTINGS_TTL_MS = 5 * 60_000;

export interface SettingsCache {
  /** The cached value: settings, null (guild has no row), or undefined (never loaded). */
  peek(guildId: string): ElementalSettings | null | undefined;
  /** The cached value if fresh, else one database read. */
  get(guildId: string): Promise<ElementalSettings | null>;
  /** Always reads the database (one read in flight per guild). Throws on a database failure. */
  refresh(guildId: string): Promise<ElementalSettings | null>;
  /** After /el settings changes, so the next read sees them. */
  invalidate(guildId?: string): void;
}

export function createSettingsCache(api: ElementalApi, opts: { ttlMs?: number; now?: () => number } = {}): SettingsCache {
  const ttl = opts.ttlMs ?? SETTINGS_TTL_MS;
  const now = opts.now ?? Date.now;
  const cache = new Map<string, { value: ElementalSettings | null; at: number }>();
  const inflight = new Map<string, Promise<ElementalSettings | null>>();

  function refresh(guildId: string): Promise<ElementalSettings | null> {
    const running = inflight.get(guildId);
    if (running) return running;
    const next = api
      .call<unknown>(SETTINGS_FN, guildId)
      .then((raw) => {
        const value = normalizeSettings(raw, guildId);
        cache.set(guildId, { value, at: now() });
        return value;
      })
      .finally(() => inflight.delete(guildId));
    inflight.set(guildId, next);
    return next;
  }

  return {
    peek: (guildId) => cache.get(guildId)?.value,
    async get(guildId) {
      const hit = cache.get(guildId);
      if (hit && now() - hit.at < ttl) return hit.value;
      return refresh(guildId);
    },
    refresh,
    invalidate(guildId) {
      if (guildId === undefined) cache.clear();
      else cache.delete(guildId);
    },
  };
}

// ---------------------------------------------------------------------------
// Events between features (E18 emits 'tester.first', E22 listens). A later
// ticket adds an event by module augmentation:
//   declare module "../context" { interface ElementalEventMap { "x.y": {...} } }
// ---------------------------------------------------------------------------

export interface ElementalEventMap {
  /** The first counted tester entry of a team (lit_at was just set). */
  "tester.first": { guildId: string; edition: string; teamId: string; entryId: string };
  /** A team became active and has a slot (its channel may still be pending). */
  "team.activated": { guildId: string; edition: string; teamId: string; slot: number; element: ElementKey };
}

export type ElementalEventName = keyof ElementalEventMap;
export type ElementalListener<K extends ElementalEventName> = (payload: ElementalEventMap[K]) => Promise<void> | void;

export interface ElementalEvents {
  on<K extends ElementalEventName>(name: K, listener: ElementalListener<K>): void;
  /** Runs every listener; a failing one is logged by event name only. Resolves when all settled. */
  emit<K extends ElementalEventName>(name: K, payload: ElementalEventMap[K]): Promise<void>;
}

export function createEvents(): ElementalEvents {
  const listeners = new Map<string, ElementalListener<never>[]>();
  return {
    on(name, listener) {
      const list = listeners.get(name) ?? [];
      list.push(listener as ElementalListener<never>);
      listeners.set(name, list);
    },
    async emit(name, payload) {
      const list = (listeners.get(name) ?? []) as ElementalListener<typeof name>[];
      await Promise.all(
        list.map(async (listener) => {
          try {
            await listener(payload);
          } catch (error) {
            console.error(`[elemental] listener for ${name} failed: ${(error as Error)?.name ?? "error"}`);
          }
        })
      );
    },
  };
}

// ---------------------------------------------------------------------------
// Runtime, context and the feature contract
// ---------------------------------------------------------------------------

export interface ElementalRuntime {
  client: Client;
  api: ElementalApi;
  env: ElementalEnv;
  settings: SettingsCache;
  queues: {
    /** Channel creation and edits, keyed by guild id. */
    channels: KeyedQueue;
    /** Whiteboard canvas writes, keyed by board id. */
    canvas: KeyedQueue;
  };
  events: ElementalEvents;
  /** Gateway state: false between a disconnect and the next ready/resume. */
  connected(): boolean;
}

/** Who is asking, where, resolved once per interaction after the ack. */
export interface ElCtx {
  rt: ElementalRuntime;
  api: ElementalApi;
  guildId: string;
  userId: string;
  channelId: string | null;
  memberRoleIds: string[];
  settings: ElementalSettings;
}

/**
 * How the wrapper acknowledges before anything else runs:
 * - "ephemeral" (default): deferReply, only the person sees the answer;
 * - "public": deferReply visible to the channel;
 * - "update": deferUpdate on the button's message (components and modal submits from one);
 * - "modal": no defer, because the handler's first act is showModal (itself the ack).
 *   Settings come from the cache; a cold cache gets one bounded read.
 */
export type Ack = "ephemeral" | "public" | "update" | "modal";

export type ComponentOrModal = MessageComponentInteraction | ModalSubmitInteraction;
export type RepliableInteraction = ChatInputCommandInteraction | ComponentOrModal;

export interface CommandHandler {
  ack?: Ack;
  /** Staff roles allowed (Host always is). Omit for anyone in the guild. */
  gate?: readonly StaffRole[];
  run(i: ChatInputCommandInteraction, ctx: ElCtx): Promise<void>;
}

export interface ActionHandler {
  ack?: Ack;
  gate?: readonly StaffRole[];
  /** args are the custom id's parts after the action: el|<action>|<args...>. */
  run(i: ComponentOrModal, ctx: ElCtx, args: string[]): Promise<void>;
}

export interface AutocompleteHandler {
  run(i: AutocompleteInteraction, ctx: ElCtx): Promise<void>;
}

export type StopFn = () => Promise<void> | void;

/**
 * What a feature file exports (features/<name>.ts: `export const feature`).
 * Handler keys: "join", "team create", "el totals" (command plus subcommand).
 * Action keys are custom-id actions. Staff tools are /el subcommands, merged
 * into one /el command by registry.ts.
 */
export interface ElementalFeature {
  name: string;
  /** Top-level slash commands (guild-only), registered per guild by POST. */
  commands?: RESTPostAPIChatInputApplicationCommandsJSONBody[];
  /** Subcommands of the shared staff command /el. */
  staffSubcommands?: APIApplicationCommandSubcommandOption[];
  commandHandlers?: Record<string, CommandHandler>;
  actions?: Record<string, ActionHandler>;
  autocomplete?: Record<string, AutocompleteHandler>;
  events?: { [K in ElementalEventName]?: (payload: ElementalEventMap[K], rt: ElementalRuntime) => Promise<void> | void };
  /** Pollers, re-enqueues after a restart. A throw disables this feature only. */
  start?(rt: ElementalRuntime): Promise<StopFn | void> | StopFn | void;
}

// ---------------------------------------------------------------------------
// Guild filter and interaction helpers
// ---------------------------------------------------------------------------

/** Only the configured guilds (real and rehearsal); everything else is ignored. */
export function isElementalGuild(guildIds: readonly string[], i: Interaction): boolean {
  return i.inGuild() && guildIds.includes(i.guildId);
}

/** The parts of an interaction a context is built from. */
export interface InteractionLike {
  guildId: string;
  user: { id: string };
  channelId: string | null;
  member: unknown;
}

export function memberRoleIds(i: Pick<InteractionLike, "member">): string[] {
  const member = i.member as GuildMember | { roles: string[] } | null;
  if (!member) return [];
  if (Array.isArray(member.roles)) return member.roles;
  return [...(member as GuildMember).roles.cache.keys()];
}

const NO_MENTIONS = { parse: [] as never[] };
/** How each interaction was acknowledged, so replies and errors go to the right place. */
const ACKS = new WeakMap<object, Ack>();

export function ackOf(i: RepliableInteraction): Ack | undefined {
  return ACKS.get(i);
}

export async function acknowledge(i: RepliableInteraction, ack: Ack): Promise<void> {
  ACKS.set(i, ack);
  if (ack === "modal") return;
  if (ack === "update") {
    if (i.isMessageComponent() || (i.isModalSubmit() && i.isFromMessage())) {
      await i.deferUpdate();
      return;
    }
    ACKS.set(i, "ephemeral");
    await i.deferReply({ flags: MessageFlags.Ephemeral });
    return;
  }
  await i.deferReply(ack === "ephemeral" ? { flags: MessageFlags.Ephemeral } : {});
}

type Payload = string | (InteractionReplyOptions & InteractionEditReplyOptions);

function withDefaults(payload: Payload): InteractionReplyOptions & InteractionEditReplyOptions {
  const options = typeof payload === "string" ? { content: payload } : payload;
  return { allowedMentions: NO_MENTIONS, ...options };
}

/**
 * The main answer: fills the deferred reply, or replies (ephemeral) when
 * nothing was sent yet. After an "update" ack it edits the button's message.
 */
export async function say(i: RepliableInteraction, payload: Payload): Promise<void> {
  const options = withDefaults(payload);
  if (i.deferred || i.replied) {
    await i.editReply(options);
    return;
  }
  await i.reply({ ...options, flags: MessageFlags.Ephemeral } as InteractionReplyOptions);
}

/** A private line to the person: a refusal, an error, a confirmation after an update ack. */
export async function notify(i: RepliableInteraction, text: string): Promise<void> {
  const options = { content: text, allowedMentions: NO_MENTIONS };
  const ack = ACKS.get(i);
  if (i.replied || (i.deferred && ack === "update")) {
    await i.followUp({ ...options, flags: MessageFlags.Ephemeral });
  } else if (i.deferred) {
    await i.editReply(options);
  } else {
    await i.reply({ ...options, flags: MessageFlags.Ephemeral });
  }
}

/** What the person sees for an error nobody handled. Logs name and code only, never text. */
export function errorText(error: unknown): string {
  if (error instanceof GateError) return error.message;
  if (error instanceof ElementalError) return error.code === "busy" ? COMMON.busy : COMMON.failed;
  return COMMON.failed;
}

export async function showError(i: RepliableInteraction, error: unknown, where: string): Promise<void> {
  if (!(error instanceof GateError)) {
    const code =
      error instanceof ElementalError ? error.code : error instanceof ElementalDbError ? error.sqlstate : (error as Error)?.name ?? "unknown";
    console.error(`[elemental] ${where} failed: ${code}`);
  }
  try {
    await notify(i, errorText(error));
  } catch {
    // The interaction expired or the channel is gone: nothing more to say.
  }
}

/** Bounded wait, so a modal or autocomplete still answers inside Discord's 3 seconds. */
export const FAST_SETTINGS_MS = 1_500;

export async function settingsFast(rt: ElementalRuntime, guildId: string, waitMs = FAST_SETTINGS_MS): Promise<ElementalSettings | null> {
  const cached = rt.settings.peek(guildId);
  if (cached !== undefined) return cached;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ElementalError("busy")), waitMs);
  });
  try {
    return await Promise.race([rt.settings.get(guildId), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export function buildCtx(rt: ElementalRuntime, i: InteractionLike, settings: ElementalSettings): ElCtx {
  return {
    rt,
    api: rt.api,
    guildId: i.guildId,
    userId: i.user.id,
    channelId: i.channelId ?? null,
    memberRoleIds: memberRoleIds(i),
    settings,
  };
}

/**
 * The wrapper every command, button and modal goes through:
 * 1. acknowledge FIRST (deferReply, ephemeral by default), before any database
 *    call, so Discord's 3-second window can never expire on a slow night;
 * 2. load the guild's settings (cache, else one read);
 * 3. the role gate, if any;
 * 4. the handler. Any throw becomes an ephemeral line; nothing crashes.
 */
export async function runWithAck(
  rt: ElementalRuntime,
  i: RepliableInteraction,
  handler: { ack?: Ack; gate?: readonly StaffRole[] },
  where: string,
  run: (ctx: ElCtx) => Promise<void>
): Promise<void> {
  if (!i.inGuild()) return;
  const ack = handler.ack ?? "ephemeral";
  try {
    await acknowledge(i, ack);
  } catch (error) {
    // Expired (more than 3 s already) or already acknowledged: nothing can be sent.
    console.error(`[elemental] ${where} could not acknowledge: ${(error as Error)?.name ?? "error"}`);
    return;
  }
  try {
    const settings = ack === "modal" ? await settingsFast(rt, i.guildId) : await rt.settings.get(i.guildId);
    if (!settings) {
      await notify(i, COMMON.notSetUp);
      return;
    }
    const ctx = buildCtx(rt, i, settings);
    if (handler.gate) requireRole(ctx, handler.gate);
    await run(ctx);
  } catch (error) {
    await showError(i, error, where);
  }
}
