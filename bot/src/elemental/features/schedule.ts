import {
  ApplicationCommandOptionType,
  DiscordAPIError,
  Routes,
  type APIApplicationCommandSubcommandOption,
  type RESTPostAPIChannelMessageJSONBody,
} from "discord.js";

import {
  addBangkokDays,
  atBangkok,
  bangkokDay,
  bangkokTime,
  isBangkokDay,
  isElementKey,
  scheduledAt,
  ELEMENT_KEYS,
  type ElementKey,
  type ElementalSchedule,
} from "../../../../lib/elemental/core/index";
import { cardPng } from "../../../../lib/elemental/island/card";
import { healthFor, type ElementHealth, type HealthSettings, type HealthTotals } from "../../../../lib/elemental/island/healing";
import { renderIsland } from "../../../../lib/elemental/island/render";
import { buildElementalScene, type ElementalPlotInput } from "../../../../lib/elemental/island/scene";
import { ElementalDbError, ElementalError } from "../api";
import { say, type ElCtx, type ElementalFeature, type ElementalRuntime, type ElementalSettings } from "../context";
import { SCHEDULE, type CaptionTotals, type SchedulePostName } from "../copy/schedule";
import { isSnowflake } from "../ids";
import { buildLegend, legendRows, type LegendRow } from "../legend";
import { realSleep, withRetry } from "../queue";
import { roleId } from "../roles";

/**
 * Scheduled posts (E19). Every 30 seconds, for each guild in
 * ELEMENTAL_GUILD_IDS, the poller reads that guild's settings.schedule
 * (Bangkok wall clock, elemental_settings.schedule) and sends what is due:
 *
 * - opening (opening_at): the news post with the island (or that day's
 *   card_override image) and the /join and picker steps;
 * - call (call_at): the news post with the campfire voice link, then in the
 *   campfire channel's chat the island PNG and the LEGEND (one line per live
 *   team, "NN · element · project", legend.ts);
 * - card (card_at): the nightly card in news: the override for that day, else
 *   ELEMENTAL_CARD_URL (secret header, 10 s timeout), else the E14 pixel card;
 *   the totals go in the caption as text.
 *
 * Exactly once, across pollers and restarts. Each post is a GROUP claim
 * (elemental_bot_post_claim, kind sch_<post>, key = Bangkok day, no lease),
 * and each Discord message in it is its own PART claim (no lease). The group
 * is marked 'sent' when every part is sent or already claimed, else 'failed',
 * which the next poll claims again and sends only the parts still missing. A
 * crash between a send and its mark leaves that part claimed for good: never
 * posted twice. Every send also carries a per-part nonce Discord enforces, so
 * a POST discord.js retries returns the first message.
 *
 * Missed post: 15 minutes after a post's time, a probe claims its group with
 * a 10-minute lease (every poll until this poller saw it sent or the note is
 * settled). False means sent (or being sent right now). True means
 * not sent (never claimed, failed, or stuck): the probe releases the group as
 * 'failed' (parts already sent stay sent) and claims the note
 * (sch_missed, "<post>:<day>"), so staff get exactly one note per post.
 *
 * Health always comes from healthFor (E10 stub, E25 healing), never from the
 * SHIFT calendar or lib/shift/voiceWindow. A day with no schedule entry is
 * silent; the rehearsal guild follows its own row. Host tools: /el post-now
 * and /el card-override. Logs carry codes only, never project names.
 */

export type PostKind = "opening" | "call" | "card";
export const POST_KINDS: readonly PostKind[] = ["opening", "call", "card"];
/** What /el post-now can send: the posts, or the campfire picture and legend alone. */
export type NowKind = PostKind | "legend";
export const NOW_KINDS: readonly NowKind[] = ["opening", "call", "legend", "card"];

const TIME_FIELD = { opening: "opening_at", call: "call_at", card: "card_at" } as const;

/** elemental_posts kinds: one group claim per post and day. */
export const GROUP_KIND: Record<PostKind, string> = { opening: "sch_opening", call: "sch_call", card: "sch_card" };
/** elemental_posts kinds: one claim per Discord message. */
export const PART_KIND = {
  opening: "sch_opening_msg",
  call: "sch_call_msg",
  campfire: "sch_campfire_img",
  legend: "sch_legend",
  card: "sch_card_msg",
} as const;
export const MISSED_KIND = "sch_missed";

export const POLL_MS = 30_000;
/** A post still unsent this long after its time gets one staff note. */
export const MISSED_AFTER_MS = 15 * 60_000;
/** The call is not sent later than this after its time (the campfire is under way). */
export const CALL_LATE_MS = 60 * 60_000;
/** The missed-post probe takes over a claim older than this (a send is long done by then). */
export const PROBE_LEASE_SECONDS = 10 * 60;
/** Web card and override downloads. */
export const FETCH_TIMEOUT_MS = 10_000;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
/** Tries per Discord message (discord.js already waits out most 429s itself). */
const DISCORD_ATTEMPTS = 3;

export const POST_NOW = "post-now";
export const CARD_OVERRIDE = "card-override";

const IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};
const DISCORD_CDN = new Set(["cdn.discordapp.com", "media.discordapp.net"]);
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MESSAGE_LINK = /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/channels\/(\d{17,20})\/(\d{17,20})\/(\d{17,20})$/;

// ---------------------------------------------------------------------------
// Dependencies (a fake clock, sleep and fetch in tests)
// ---------------------------------------------------------------------------

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface ScheduleDeps {
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  fetch?: FetchLike;
}

export interface Env {
  rt: ElementalRuntime;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  fetch: FetchLike;
}

const DEPS = new WeakMap<ElementalRuntime, ScheduleDeps>();

export function envFor(rt: ElementalRuntime, deps: ScheduleDeps = DEPS.get(rt) ?? {}): Env {
  return {
    rt,
    now: deps.now ?? Date.now,
    sleep: deps.sleep ?? realSleep,
    fetch: deps.fetch ?? ((input, init) => fetch(input, init)),
  };
}

function reasonOf(error: unknown): string {
  if (error instanceof ElementalError) return `el:${error.code}`;
  if (error instanceof ElementalDbError) return `SQLSTATE ${error.sqlstate}`;
  if (error instanceof DiscordAPIError) return `discord ${error.code} (${error.status})`;
  const e = error as { status?: number; name?: string } | null;
  return e?.status ? `status ${e.status}` : e?.name ?? "error";
}

// ---------------------------------------------------------------------------
// Data: the island and the totals (numbers, element keys and project names only)
// ---------------------------------------------------------------------------

interface Island {
  plots: ElementalPlotInput[];
  legend: LegendRow[];
}

function count(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** elemental_bot_island_state(edition): live teams. Discord ids never come back from it. */
async function loadIsland(env: Env, settings: ElementalSettings): Promise<Island> {
  const rows = await env.rt.api.rows<Record<string, unknown>>("elemental_bot_island_state", settings.edition);
  const legend = legendRows(rows);
  const bySlot = new Map(rows.map((r) => [r.slot, r]));
  const plots = legend.map((l): ElementalPlotInput => {
    const r = bySlot.get(l.slot) ?? {};
    return { slot: l.slot, element: l.element, counted: count(r.counted), lit: r.lit === true, badges: Array.isArray(r.badges) ? r.badges.length : 0 };
  });
  return { plots, legend };
}

/** What elemental_bot_totals returns. */
export interface Totals {
  helped: number;
  helped_today: number;
  checked_in: number;
  teams_total: number;
  top_element: ElementKey | null;
  levels: Partial<Record<ElementKey, number>>;
  teams: Partial<Record<ElementKey, number>>;
}

function perElement(value: unknown): Partial<Record<ElementKey, number>> {
  const src = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return Object.fromEntries(ELEMENT_KEYS.map((e) => [e, count(src[e])])) as Partial<Record<ElementKey, number>>;
}

export function normalizeTotals(raw: unknown): Totals {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    helped: count(r.helped),
    helped_today: count(r.helped_today),
    checked_in: count(r.checked_in),
    teams_total: count(r.teams_total),
    top_element: isElementKey(r.top_element) ? r.top_element : null,
    levels: perElement(r.levels),
    teams: perElement(r.teams),
  };
}

export function healthSettings(settings: ElementalSettings): HealthSettings {
  return { healing_enabled: settings.healingEnabled, heal_per_team: settings.healPerTeam, heal_steps: settings.healSteps };
}

/** healthFor's input from elemental_bot_totals: counted entries (levels) and live teams per element. */
export function healthTotalsFrom(totals: Pick<Totals, "levels" | "teams">): HealthTotals {
  return Object.fromEntries(ELEMENT_KEYS.map((e) => [e, { counted: totals.levels[e] ?? 0, teams: totals.teams[e] ?? 0 }])) as HealthTotals;
}

/** The same tally from the island's plots (as the web island page counts it). */
export function healthTotalsOfPlots(plots: readonly ElementalPlotInput[]): HealthTotals {
  const levels: Partial<Record<ElementKey, number>> = {};
  const teams: Partial<Record<ElementKey, number>> = {};
  for (const p of plots) {
    levels[p.element] = (levels[p.element] ?? 0) + p.counted;
    teams[p.element] = (teams[p.element] ?? 0) + 1;
  }
  return healthTotalsFrom({ levels, teams });
}

/** The landscape island PNG for Discord, or null (logged) when it cannot be drawn. */
export function islandPng(plots: readonly ElementalPlotInput[], health: ElementHealth): Buffer | null {
  try {
    return renderIsland(buildElementalScene(plots), { layout: "landscape", health }).png;
  } catch (error) {
    console.error(`[elemental] schedule: island not drawn (${(error as Error)?.name ?? "error"})`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Images: override, web card, pixel card
// ---------------------------------------------------------------------------

interface Img {
  data: Buffer;
  contentType: string;
}

async function download(env: Env, url: string, opts: { discordOnly?: boolean; init?: RequestInit } = {}): Promise<Img | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && parsed.hostname === "localhost")) return null;
  if (opts.discordOnly && !DISCORD_CDN.has(parsed.hostname)) return null;
  try {
    const res = await env.fetch(parsed, { ...opts.init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!res.ok || !IMAGE_TYPES[type] || Number(res.headers.get("content-length") ?? 0) > MAX_IMAGE_BYTES) return null;
    const data = Buffer.from(await res.arrayBuffer());
    return data.length > 0 && data.length <= MAX_IMAGE_BYTES ? { data, contentType: type } : null;
  } catch {
    return null;
  }
}

export function messageLink(guildId: string, channelId: string, messageId: string): string {
  return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
}

/**
 * That day's card_override image, or null. A Discord message link (what
 * /el card-override stores) is fetched again for a fresh attachment URL, since
 * Discord's CDN links expire; any other https URL is downloaded as it is.
 */
export async function overrideImage(env: Env, settings: ElementalSettings, day: string): Promise<Img | null> {
  const o = settings.cardOverride;
  if (!o || o.day !== day) return null;
  const link = MESSAGE_LINK.exec(o.url);
  if (!link) return download(env, o.url);
  if (link[1] !== settings.guildId) return null;
  try {
    const message = (await env.rt.client.rest.get(Routes.channelMessage(link[2], link[3]))) as {
      attachments?: { url?: string; content_type?: string }[];
    } | null;
    const att = (message?.attachments ?? []).find((a) => typeof a.url === "string" && (!a.content_type || IMAGE_TYPES[a.content_type]));
    return att?.url ? download(env, att.url, { discordOnly: true }) : null;
  } catch (error) {
    console.error(`[elemental] schedule: card override not read (${reasonOf(error)})`);
    return null;
  }
}

/** The web card (E24): GET ELEMENTAL_CARD_URL?edition=&day= with the secret header, 10 s. Null on anything but a PNG. */
export async function webCard(env: Env, settings: ElementalSettings, day: string): Promise<Img | null> {
  const { cardUrl, cardSecret } = env.rt.env;
  if (!cardUrl || !cardSecret) return null;
  const url = new URL(cardUrl);
  url.searchParams.set("edition", settings.edition);
  url.searchParams.set("day", day);
  const img = await download(env, url.toString(), {
    init: {
      headers: { "x-elemental-card-secret": cardSecret, authorization: `Bearer ${cardSecret}`, accept: "image/png" },
      redirect: "error",
    },
  });
  if (!img || img.contentType !== "image/png" || !img.data.subarray(0, 8).equals(PNG_SIGNATURE)) {
    console.error("[elemental] schedule: web card unavailable, using the pixel card");
    return null;
  }
  return img;
}

function pixelCard(island: Island, totals: Totals, settings: ElementalSettings): Img | null {
  try {
    const data = cardPng({
      island: {
        plots: buildElementalScene(island.plots).plots,
        health: healthFor(healthTotalsFrom(totals), healthSettings(settings)),
      },
      helped: totals.helped,
      checkedIn: totals.checked_in,
      topElement: totals.top_element,
      levels: totals.levels,
    });
    return { data, contentType: "image/png" };
  } catch (error) {
    console.error(`[elemental] schedule: pixel card not drawn (${(error as Error)?.name ?? "error"})`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

interface FileOut {
  name: string;
  data: Buffer;
  contentType: string;
  description?: string;
}

/** One Discord message of a post, claimed on its own. */
export interface Part {
  kind: string;
  key: string;
  /** Discord's enforced nonce (at most 25 characters). */
  nonce: string;
  channelId: string | null;
  content: string;
  files: FileOut[];
}

/** A short stable tag of the guild (FNV-1a, base 36, at most 7 characters). */
function guildTag(guildId: string): string {
  let h = 0x811c9dc5;
  for (let k = 0; k < guildId.length; k++) {
    h ^= guildId.charCodeAt(k);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/**
 * Discord checks an enforced nonce against every message the same author
 * (this bot) sent in the past few minutes, in any channel or guild. The guild
 * tag keeps the real and rehearsal guilds' posts of the same day apart, so
 * neither swallows the other's. At most 2 + 2 + 7 + 8 + 2 = 21 characters.
 */
function nonceFor(guildId: string, abbr: string, day: string, index = ""): string {
  return `el${abbr}${guildTag(guildId)}${day.replace(/-/g, "")}${index}`.slice(0, 25);
}

function file(name: string, img: Img, description: string): FileOut {
  return { name: `${name}.${IMAGE_TYPES[img.contentType] ?? "png"}`, data: img.data, contentType: img.contentType, description };
}

function campfireParts(settings: ElementalSettings, day: string, island: Island, png: Buffer | null): Part[] {
  const g = settings.guildId;
  const channelId = settings.channels.campfire ?? settings.channels.news ?? null;
  const teams = island.legend.length;
  const parts: Part[] = [
    {
      kind: PART_KIND.campfire,
      key: day,
      nonce: nonceFor(g, "ci", day),
      channelId,
      content: teams ? SCHEDULE.campfireHeader(teams) : SCHEDULE.campfireEmpty,
      files: png ? [file("island", { data: png, contentType: "image/png" }, SCHEDULE.islandAlt)] : [],
    },
  ];
  const legend = buildLegend(island.legend);
  if (legend.kind === "file") {
    parts.push({
      kind: PART_KIND.legend,
      key: `${day}#file`,
      nonce: nonceFor(g, "lg", day, "f"),
      channelId,
      content: legend.summary,
      files: [{ name: legend.file.name, data: legend.file.data, contentType: "text/plain; charset=utf-8" }],
    });
  } else {
    legend.messages.forEach((content, i) =>
      parts.push({ kind: PART_KIND.legend, key: `${day}#${i}`, nonce: nonceFor(g, "lg", day, String(i)), channelId, content, files: [] })
    );
  }
  return parts;
}

/** Builds a post's messages. Reads the database; never sends. */
export async function buildParts(env: Env, settings: ElementalSettings, kind: NowKind, day: string): Promise<Part[]> {
  const news = settings.channels.news ?? null;
  if (kind === "card") {
    const [rawTotals, island] = await Promise.all([env.rt.api.call<unknown>("elemental_bot_totals", settings.edition, day), loadIsland(env, settings)]);
    const totals = normalizeTotals(rawTotals);
    const img = (await overrideImage(env, settings, day)) ?? (await webCard(env, settings, day)) ?? pixelCard(island, totals, settings);
    const caption: CaptionTotals = {
      helped: totals.helped,
      helpedToday: totals.helped_today,
      checkedIn: totals.checked_in,
      teamsTotal: totals.teams_total,
      topElement: totals.top_element,
      levels: totals.levels,
    };
    return [
      {
        kind: PART_KIND.card,
        key: day,
        nonce: nonceFor(settings.guildId, "cd", day),
        channelId: news,
        content: SCHEDULE.caption(caption),
        files: img ? [file("card", img, SCHEDULE.cardAlt)] : [],
      },
    ];
  }

  const island = await loadIsland(env, settings);
  const health = healthFor(healthTotalsOfPlots(island.plots), healthSettings(settings));
  if (kind === "opening") {
    const img = (await overrideImage(env, settings, day)) ?? (() => {
      const png = islandPng(island.plots, health);
      return png ? { data: png, contentType: "image/png" } : null;
    })();
    return [
      {
        kind: PART_KIND.opening,
        key: day,
        nonce: nonceFor(settings.guildId, "op", day),
        channelId: news,
        content: SCHEDULE.opening(settings.channels.start_here ?? null),
        files: img ? [file("island", img, SCHEDULE.islandAlt)] : [],
      },
    ];
  }

  const png = islandPng(island.plots, health);
  const campfire = campfireParts(settings, day, island, png);
  if (kind === "legend") return campfire;
  return [
    {
      kind: PART_KIND.call,
      key: day,
      nonce: nonceFor(settings.guildId, "ca", day),
      channelId: news,
      content: SCHEDULE.call(settings.channels.campfire ?? null),
      files: [],
    },
    ...campfire,
  ];
}

/** POSTs one message (nonce enforced, no mentions). Resolves with its id, or null when Discord gave none. */
async function postMessage(env: Env, part: Part, nonce: string): Promise<string | null> {
  if (!part.channelId) throw new ElementalError("no_channel");
  const body: RESTPostAPIChannelMessageJSONBody = {
    content: part.content,
    allowed_mentions: { parse: [] },
    nonce,
    enforce_nonce: true,
    ...(part.files.length ? { attachments: part.files.map((f, id) => ({ id, filename: f.name, ...(f.description ? { description: f.description } : {}) })) } : {}),
  };
  const channelId = part.channelId;
  const files = part.files.map((f) => ({ name: f.name, data: f.data, contentType: f.contentType }));
  const sent = (await withRetry(() => env.rt.client.rest.post(Routes.channelMessages(channelId), { body, ...(files.length ? { files } : {}) }), {
    maxAttempts: DISCORD_ATTEMPTS,
    sleep: env.sleep,
  })) as { id?: unknown } | null;
  return isSnowflake(sent?.id) ? sent.id : null;
}

type Outcome = "sent" | "skip" | "failed";

async function mark(env: Env, guildId: string, kind: string, key: string, status: "sent" | "failed", messageId: string | null = null): Promise<void> {
  try {
    await env.rt.api.call("elemental_bot_post_mark", guildId, kind, key, status, messageId);
  } catch (error) {
    console.error(`[elemental] schedule: ${kind} not marked ${status} (${reasonOf(error)})`);
  }
}

/** Claims and sends one part. 'skip' when it is sent or held elsewhere. */
async function sendClaimedPart(env: Env, guildId: string, part: Part): Promise<Outcome> {
  const claimed = await env.rt.api.call<boolean>("elemental_bot_post_claim", guildId, part.kind, part.key, null);
  if (!claimed) return "skip";
  let messageId: string | null;
  try {
    messageId = await postMessage(env, part, part.nonce);
  } catch (error) {
    console.error(`[elemental] schedule: ${part.kind} not sent (${reasonOf(error)})`);
    await mark(env, guildId, part.kind, part.key, "failed");
    return "failed";
  }
  await mark(env, guildId, part.kind, part.key, "sent", messageId);
  return "sent";
}

/**
 * One scheduled post, once: the group claim, then each part. Returns 'skip'
 * when another poller holds or finished it.
 */
export async function runScheduledPost(env: Env, settings: ElementalSettings, kind: PostKind, day: string): Promise<Outcome> {
  const guildId = settings.guildId;
  const claimed = await env.rt.api.call<boolean>("elemental_bot_post_claim", guildId, GROUP_KIND[kind], day, null);
  if (!claimed) return "skip";
  let outcome: Outcome = "sent";
  try {
    const parts = await buildParts(env, settings, kind, day);
    for (const part of parts) {
      if ((await sendClaimedPart(env, guildId, part)) === "failed") outcome = "failed";
    }
  } catch (error) {
    console.error(`[elemental] schedule: ${kind} not built (${reasonOf(error)})`);
    outcome = "failed";
  }
  await mark(env, guildId, GROUP_KIND[kind], day, outcome === "sent" ? "sent" : "failed");
  return outcome;
}

/** Where staff notes go: the staff mirror channel, else #reports (as join.ts staffAlert). */
export function staffChannel(settings: ElementalSettings): string | null {
  return settings.channels.mirror ?? settings.channels.reports ?? null;
}

/**
 * 15 minutes after a post's time. 'done': the post went (or is going out
 * now); 'noted': this call sent the one staff note; 'already': another poller
 * holds the note; 'failed': the note could not be sent (retried next poll).
 * Probes the group with a lease; see the file comment.
 */
export async function checkMissed(env: Env, settings: ElementalSettings, kind: PostKind, day: string, time: string): Promise<"done" | "noted" | "already" | "failed"> {
  const guildId = settings.guildId;
  const api = env.rt.api;
  const unsent = await api.call<boolean>("elemental_bot_post_claim", guildId, GROUP_KIND[kind], day, PROBE_LEASE_SECONDS);
  if (!unsent) return "done";
  // Release at once: the poller sends what is still missing on its next tick.
  await mark(env, guildId, GROUP_KIND[kind], day, "failed");
  const key = `${kind}:${day}`;
  const mine = await api.call<boolean>("elemental_bot_post_claim", guildId, MISSED_KIND, key, null);
  if (!mine) return "already";
  const channelId = staffChannel(settings);
  const host = roleId(settings, "host");
  try {
    if (!channelId) throw new ElementalError("no_staff_channel");
    const content = `${host ? `<@&${host}> ` : ""}${SCHEDULE.missed(SCHEDULE.postName[kind], day, time, settings.channels.news ?? null)}`;
    const sent = (await withRetry(
      () =>
        env.rt.client.rest.post(Routes.channelMessages(channelId), {
          body: { content, allowed_mentions: { parse: [], roles: host ? [host] : [] } },
        }),
      { maxAttempts: DISCORD_ATTEMPTS, sleep: env.sleep }
    )) as { id?: unknown } | null;
    await mark(env, guildId, MISSED_KIND, key, "sent", isSnowflake(sent?.id) ? sent.id : null);
    return "noted";
  } catch (error) {
    console.error(`[elemental] schedule: missed-post note for ${kind} not sent (${reasonOf(error)})`);
    await mark(env, guildId, MISSED_KIND, key, "failed");
    return "failed";
  }
}

// ---------------------------------------------------------------------------
// The poller
// ---------------------------------------------------------------------------

export interface Scheduler {
  /** One poll of every guild. */
  tick(): Promise<void>;
  /** One poll of one guild. */
  tickGuild(guildId: string): Promise<void>;
  start(): void;
  stop(): Promise<void>;
}

function endOfDay(day: string): number {
  return atBangkok(addBangkokDays(day, 1), "00:00").getTime();
}

export function createScheduler(rt: ElementalRuntime, deps: ScheduleDeps = {}): Scheduler {
  DEPS.set(rt, deps);
  const env = envFor(rt, deps);
  /** Posts this poller finished (or found finished), and missed checks it settled. */
  const done = new Set<string>();
  const checked = new Set<string>();
  const running = new Map<string, Promise<void>>();
  const logged = new Set<string>();
  let timer: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  function logOnce(key: string, line: string): void {
    if (logged.has(key)) return;
    logged.add(key);
    console.error(line);
  }

  async function pollGuild(guildId: string): Promise<void> {
    const settings = await rt.settings.get(guildId);
    if (!settings) return;
    const now = env.now();
    const day = bangkokDay(now);
    if (!settings.schedule[day]) return;
    for (const kind of POST_KINDS) {
      const due = scheduledAt(settings.schedule as unknown as ElementalSchedule, day, TIME_FIELD[kind]);
      if (!due || now < due.getTime()) continue;
      const id = `${guildId}|${settings.edition}|${kind}|${day}`;
      const windowEnd = kind === "call" ? Math.min(due.getTime() + CALL_LATE_MS, endOfDay(day)) : endOfDay(day);
      try {
        if (!done.has(id) && now < windowEnd) {
          if (!settings.channels.news) {
            logOnce(`news|${guildId}`, `[elemental] schedule: no news channel set; ${kind} waits`);
          } else if ((await runScheduledPost(env, settings, kind, day)) === "sent") {
            done.add(id);
          }
        }
        // Probe until settled. A 'done' probe means sent OR held by a claim
        // younger than the lease (another poller, or one that crashed mid-send),
        // so it settles nothing: the next tick probes again, and once a dead
        // claim passes the lease the probe takes it over and the post goes.
        if (!checked.has(id) && !done.has(id) && now >= due.getTime() + MISSED_AFTER_MS && now < endOfDay(day)) {
          const result = await checkMissed(env, settings, kind, day, bangkokTime(due));
          if (result === "noted" || result === "already") checked.add(id);
        }
      } catch (error) {
        console.error(`[elemental] schedule: ${kind} check failed (${reasonOf(error)})`);
      }
    }
  }

  function tickGuild(guildId: string): Promise<void> {
    // One poll per guild at a time: a slow web card in one guild never delays the other.
    const busy = running.get(guildId);
    if (busy) return busy;
    const run = pollGuild(guildId)
      .catch((error) => console.error(`[elemental] schedule poll failed (${reasonOf(error)})`))
      .finally(() => running.delete(guildId));
    running.set(guildId, run);
    return run;
  }

  async function tick(): Promise<void> {
    if (stopped) return;
    await Promise.all(rt.env.guildIds.map(tickGuild));
  }

  return {
    tick,
    tickGuild,
    start() {
      if (timer || stopped) return;
      void tick();
      timer = setInterval(() => void tick(), POLL_MS);
      timer.unref?.();
    },
    async stop() {
      stopped = true;
      if (timer) clearInterval(timer);
      timer = null;
      await Promise.all([...running.values()]);
    },
  };
}

// ---------------------------------------------------------------------------
// Host tools
// ---------------------------------------------------------------------------

export interface PostNowResult {
  sent: number;
  failed: number;
  channelId: string | null;
}

/**
 * /el post-now: builds and sends the post now, without its claims (staff
 * asked). When its scheduled time today has already passed, the group is then
 * claimed and marked sent, so the poller does not send it again; before that
 * time the scheduled post still goes.
 */
export async function postNow(env: Env, settings: ElementalSettings, kind: NowKind, day: string): Promise<PostNowResult> {
  const parts = await buildParts(env, settings, kind, day);
  const stamp = env.now().toString(36);
  let sent = 0;
  let failed = 0;
  for (const [i, part] of parts.entries()) {
    try {
      await postMessage(env, part, `elnow${stamp}${i}`.slice(0, 25));
      sent += 1;
    } catch (error) {
      console.error(`[elemental] post-now ${kind}: a message failed (${reasonOf(error)})`);
      failed += 1;
    }
  }
  if (kind !== "legend" && failed === 0) {
    const due = scheduledAt(settings.schedule as unknown as ElementalSchedule, day, TIME_FIELD[kind]);
    if (due && env.now() >= due.getTime()) {
      const claimed = await env.rt.api.call<boolean>("elemental_bot_post_claim", settings.guildId, GROUP_KIND[kind], day, null);
      if (claimed) await mark(env, settings.guildId, GROUP_KIND[kind], day, "sent");
    }
  }
  return { sent, failed, channelId: parts[0]?.channelId ?? null };
}

/**
 * /el card-override: keeps the image in the staff channel and stores that
 * message's link (Discord's CDN links expire; the message can be re-read for a
 * fresh one), or the attachment URL when there is no staff channel. No image
 * clears the override. It applies to that day's opening post and card only.
 */
export async function setCardOverride(
  env: Env,
  ctx: Pick<ElCtx, "guildId" | "userId" | "settings">,
  day: string,
  image: { url: string; contentType: string | null; size: number } | null
): Promise<string> {
  const api = env.rt.api;
  if (!image) {
    await api.call("elemental_bot_settings_set", ctx.guildId, ctx.userId, { card_override: null });
    env.rt.settings.invalidate(ctx.guildId);
    return SCHEDULE.overrideCleared;
  }
  const type = (image.contentType ?? "").split(";")[0].trim().toLowerCase();
  if (!IMAGE_TYPES[type] || image.size > MAX_IMAGE_BYTES) return SCHEDULE.overrideBadImage;
  const staff = staffChannel(ctx.settings);
  let url = image.url;
  let fragile = true;
  if (staff) {
    const img = await download(env, image.url, { discordOnly: true });
    if (!img) return SCHEDULE.overrideFailed;
    try {
      const messageId = await postMessage(
        env,
        { kind: "override", key: day, nonce: "", channelId: staff, content: SCHEDULE.overrideKept(day), files: [file("override", img, SCHEDULE.islandAlt)] },
        `elov${env.now().toString(36)}`
      );
      if (!messageId) return SCHEDULE.overrideFailed;
      url = messageLink(ctx.guildId, staff, messageId);
      fragile = false;
    } catch (error) {
      console.error(`[elemental] card-override: image not kept (${reasonOf(error)})`);
      return SCHEDULE.overrideFailed;
    }
  }
  if (!/^https:\/\/\S+$/.test(url) || url.length > 1000) return SCHEDULE.overrideFailed;
  try {
    await api.call("elemental_bot_settings_set", ctx.guildId, ctx.userId, { card_override: { day, url } });
  } catch (error) {
    if (error instanceof ElementalError && error.code === "bad_patch") return SCHEDULE.overrideFailed;
    throw error;
  }
  env.rt.settings.invalidate(ctx.guildId);
  return fragile ? SCHEDULE.overrideSetFragile(day) : SCHEDULE.overrideSet(day);
}

const STAFF_SUBCOMMANDS: APIApplicationCommandSubcommandOption[] = [
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: POST_NOW,
    description: SCHEDULE.postNowDescription.slice(0, 100),
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: "kind",
        description: SCHEDULE.postNowKind.slice(0, 100),
        required: true,
        choices: NOW_KINDS.map((k) => ({ name: SCHEDULE.postName[k].slice(0, 100), value: k })),
      },
    ],
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: CARD_OVERRIDE,
    description: SCHEDULE.overrideDescription.slice(0, 100),
    options: [
      { type: ApplicationCommandOptionType.Attachment, name: "image", description: SCHEDULE.overrideImage.slice(0, 100), required: false },
      { type: ApplicationCommandOptionType.String, name: "day", description: SCHEDULE.overrideDay.slice(0, 100), required: false, min_length: 10, max_length: 10 },
    ],
  },
];

function isNowKind(value: unknown): value is NowKind {
  return typeof value === "string" && (NOW_KINDS as readonly string[]).includes(value);
}

export const feature: ElementalFeature = {
  name: "schedule",
  staffSubcommands: STAFF_SUBCOMMANDS,
  commandHandlers: {
    // Host only (an empty gate: Host always passes, nobody else does).
    [`el ${POST_NOW}`]: {
      gate: [],
      async run(i, ctx) {
        const kind = i.options.getString("kind", true);
        if (!isNowKind(kind)) return say(i, SCHEDULE.postNowFailed(""));
        const env = envFor(ctx.rt);
        const result = await postNow(env, ctx.settings, kind, bangkokDay(env.now()));
        const name = SCHEDULE.postName[kind as SchedulePostName];
        await say(i, result.failed === 0 && result.channelId ? SCHEDULE.postNowDone(name, result.channelId) : SCHEDULE.postNowFailed(name));
      },
    },
    [`el ${CARD_OVERRIDE}`]: {
      gate: [],
      async run(i, ctx) {
        const env = envFor(ctx.rt);
        const dayOption = i.options.getString("day")?.trim();
        const day = dayOption || bangkokDay(env.now());
        if (!isBangkokDay(day)) return say(i, SCHEDULE.overrideBadDay);
        const att = i.options.getAttachment("image");
        const text = await setCardOverride(env, ctx, day, att ? { url: att.url, contentType: att.contentType, size: att.size } : null);
        await say(i, text);
      },
    },
  },
  start(rt) {
    const scheduler = createScheduler(rt, DEPS.get(rt));
    scheduler.start();
    return () => scheduler.stop();
  },
};
