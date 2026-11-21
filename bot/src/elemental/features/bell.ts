import { DiscordAPIError, Routes, type RESTPostAPIChannelMessageJSONBody } from "discord.js";

import { isElementKey, type ElementKey } from "../../../../lib/elemental/core/index";
import { healthFor } from "../../../../lib/elemental/island/healing";
import type { ElementalPlotInput } from "../../../../lib/elemental/island/scene";
import { ElementalDbError, ElementalError } from "../api";
import type { ElementalEventMap, ElementalFeature, ElementalRuntime, ElementalSettings } from "../context";
import { BELL } from "../copy/bell";
import { isSnowflake } from "../ids";
import { legendRows } from "../legend";
import { realSleep, withRetry } from "../queue";
import { healthSettings, healthTotalsOfPlots, islandPng } from "./schedule";

/**
 * The first-person bell (E22). On 'tester.first' (a team's first counted
 * tester entry, emitted by tester.ts deliverEntry) the news channel gets one
 * post: "NN · element · project" plus the landscape island PNG with that
 * team's lantern lit.
 *
 * Exactly once per team. The post is claimed with elemental_bot_post_claim
 * (kind 'bell', key = team id, no lease) before anything is sent, and marked
 * 'sent' with its message id after. A repeated or concurrent event finds the
 * claim taken and sends nothing; a crash between the send and the mark leaves
 * the claim held for good (never posted twice). The send carries an enforced
 * nonce, so a POST that discord.js retries returns the first message.
 *
 * Removed before posting: after the claim, elemental_bot_canvas_target (read
 * only) says whether the entry was removed or the team is no longer live. If
 * so nothing is sent and the claim is released ('failed'): if staff removed
 * the only counted entry, the team went dark, and its next counted entry
 * emits 'tester.first' again and rings then.
 *
 * A send that fails (Discord or database) releases the claim and is retried
 * in this process after 1, 5 and 15 minutes, checking removal again each time.
 * Logs carry codes only, never project names or ids of people.
 */

export type BellPayload = ElementalEventMap["tester.first"];

/** elemental_posts kind: one bell per team, keyed by team id. */
export const BELL_KIND = "bell";
/** Waits before each retry of a bell that failed to send. */
export const RETRY_DELAYS_MS: readonly number[] = [60_000, 5 * 60_000, 15 * 60_000];
/** How often the retry list is checked. */
export const RETRY_POLL_MS = 30_000;
/** Tries per Discord message (discord.js already waits out most 429s itself). */
const DISCORD_ATTEMPTS = 3;

/**
 * - sent: this call posted the bell;
 * - skip: already claimed (sent, or being sent elsewhere), or the guild now
 *   points at another edition;
 * - removed: the entry was removed or the team is not live; nothing sent, claim released;
 * - failed: not sent; the claim is released and the bell is retried.
 */
export type BellOutcome = "sent" | "skip" | "removed" | "failed";

export interface BellDeps {
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export interface Bell {
  /** Rings for one event; a failure is queued for retry. Never rejects. */
  ring(payload: BellPayload): Promise<BellOutcome>;
  /** Retries every failed bell that is due now. */
  retryDue(): Promise<void>;
  /** Bells waiting for a retry. */
  pending(): number;
  start(): void;
  stop(): Promise<void>;
}

function reasonOf(error: unknown): string {
  if (error instanceof ElementalError) return `el:${error.code}`;
  if (error instanceof ElementalDbError) return `SQLSTATE ${error.sqlstate}`;
  if (error instanceof DiscordAPIError) return `discord ${error.code} (${error.status})`;
  const e = error as { status?: number; name?: string } | null;
  return e?.status ? `status ${e.status}` : e?.name ?? "error";
}

/** FNV-1a in base 36 (at most 7 characters), seeded so two tags of one input differ. */
function fnv(text: string, seed = 0x811c9dc5): string {
  let h = seed >>> 0;
  for (let k = 0; k < text.length; k++) {
    h ^= text.charCodeAt(k);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/**
 * Discord's enforced nonce (at most 25 characters), stable per guild and
 * team: "elbl" plus two independent 32-bit hashes, so two teams' bells in the
 * same few minutes never share one and swallow each other.
 */
export function bellNonce(guildId: string, teamId: string): string {
  const key = `${guildId}|${teamId}`;
  return `elbl${fnv(key)}${fnv(key, 0x9e3779b9)}`.slice(0, 25);
}

/** The team's plot facts, from canvas_target, for an entry that still stands. */
interface Target {
  teamId: string;
  slot: number;
  element: ElementKey;
  projectName: string;
}

/**
 * elemental_bot_canvas_target's answer as a Target, or null when the bell must
 * not ring: the entry was removed, the team is not live (archived), the entry
 * belongs to another team, or the team has no plot.
 */
export function standingTarget(raw: unknown, teamId: string): Target | null {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!r || r.removed !== false || r.live !== true || r.team_id !== teamId) return null;
  const slot = r.slot;
  if (typeof slot !== "number" || !Number.isInteger(slot) || slot < 1 || slot > 200 || !isElementKey(r.element)) return null;
  return { teamId, slot, element: r.element, projectName: typeof r.project_name === "string" ? r.project_name : "" };
}

/** The island's plots, with this team's lantern lit (added when island_state does not list it yet). */
async function plotsLit(rt: ElementalRuntime, settings: ElementalSettings, target: Target): Promise<ElementalPlotInput[]> {
  const rows = await rt.api.rows<Record<string, unknown>>("elemental_bot_island_state", settings.edition);
  const bySlot = new Map(rows.map((r) => [r.slot, r]));
  const plots = legendRows(rows).map((l): ElementalPlotInput => {
    const r = bySlot.get(l.slot) ?? {};
    const mine = r.team_id === target.teamId || l.slot === target.slot;
    const counted = typeof r.counted === "number" && r.counted > 0 ? Math.floor(r.counted) : 0;
    return {
      slot: l.slot,
      element: mine ? target.element : l.element,
      counted: mine ? Math.max(1, counted) : counted,
      lit: mine || r.lit === true,
      badges: Array.isArray(r.badges) ? r.badges.length : 0,
    };
  });
  if (!plots.some((p) => p.slot === target.slot)) {
    plots.push({ slot: target.slot, element: target.element, counted: 1, lit: true, badges: 0 });
    plots.sort((a, b) => a.slot - b.slot);
  }
  return plots;
}

/** The bell's message body (text only; the PNG goes as a file). Exported for tests. */
export function bellBody(target: Pick<Target, "slot" | "element" | "projectName">, nonce: string, withImage: boolean): RESTPostAPIChannelMessageJSONBody {
  return {
    content: BELL.post({ slot: target.slot, element: target.element, projectName: target.projectName }),
    allowed_mentions: { parse: [] },
    nonce,
    enforce_nonce: true,
    ...(withImage ? { attachments: [{ id: 0, filename: "island.png", description: BELL.islandAlt(target.slot) }] } : {}),
  };
}

async function mark(rt: ElementalRuntime, guildId: string, key: string, status: "sent" | "failed", messageId: string | null = null): Promise<void> {
  try {
    await rt.api.call("elemental_bot_post_mark", guildId, BELL_KIND, key, status, messageId);
  } catch (error) {
    console.error(`[elemental] bell: not marked ${status} (${reasonOf(error)})`);
  }
}

/** One try: claim, check, draw, send, mark. Throws only before the claim (a database refusal). */
export async function ringOnce(rt: ElementalRuntime, payload: BellPayload, sleep: (ms: number) => Promise<void> = realSleep): Promise<BellOutcome> {
  const { guildId, teamId, entryId } = payload;
  const settings = await rt.settings.get(guildId);
  if (!settings || settings.edition !== payload.edition) return "skip";
  const news = settings.channels.news;
  if (!news) {
    console.error("[elemental] bell: no news channel set; the bell waits");
    return "failed";
  }

  const claimed = await rt.api.call<boolean>("elemental_bot_post_claim", guildId, BELL_KIND, teamId, null);
  if (!claimed) return "skip";

  try {
    let raw: unknown = null;
    try {
      raw = await rt.api.call<unknown>("elemental_bot_canvas_target", guildId, entryId);
    } catch (error) {
      // An entry this edition does not have is never rung; anything else is retried.
      if (!(error instanceof ElementalError && error.code === "entry_not_found")) throw error;
    }
    const target = standingTarget(raw, teamId);
    if (!target) {
      await mark(rt, guildId, teamId, "failed");
      return "removed";
    }
    const plots = await plotsLit(rt, settings, target);
    const png = islandPng(plots, healthFor(healthTotalsOfPlots(plots), healthSettings(settings)));
    const body = bellBody(target, bellNonce(guildId, teamId), png !== null);
    const files = png ? [{ name: "island.png", data: png, contentType: "image/png" }] : [];
    const sent = (await withRetry(() => rt.client.rest.post(Routes.channelMessages(news), { body, ...(files.length ? { files } : {}) }), {
      maxAttempts: DISCORD_ATTEMPTS,
      sleep,
    })) as { id?: unknown } | null;
    await mark(rt, guildId, teamId, "sent", isSnowflake(sent?.id) ? sent.id : null);
    return "sent";
  } catch (error) {
    console.error(`[elemental] bell: not sent (${reasonOf(error)})`);
    await mark(rt, guildId, teamId, "failed");
    return "failed";
  }
}

interface Retry {
  payload: BellPayload;
  /** Retries already made. */
  tries: number;
  dueAt: number;
}

export function createBell(rt: ElementalRuntime, deps: BellDeps = {}): Bell {
  const now = deps.now ?? Date.now;
  const sleep = deps.sleep ?? realSleep;
  const retries = new Map<string, Retry>();
  let timer: ReturnType<typeof setInterval> | null = null;
  let running: Promise<void> | null = null;
  let stopped = false;

  const keyOf = (p: BellPayload) => `${p.guildId}|${p.teamId}`;

  async function attempt(payload: BellPayload, tries: number): Promise<BellOutcome> {
    let outcome: BellOutcome;
    try {
      outcome = await ringOnce(rt, payload, sleep);
    } catch (error) {
      console.error(`[elemental] bell: not claimed (${reasonOf(error)})`);
      outcome = "failed";
    }
    const key = keyOf(payload);
    if (outcome !== "failed") {
      retries.delete(key);
    } else if (tries < RETRY_DELAYS_MS.length) {
      retries.set(key, { payload, tries, dueAt: now() + RETRY_DELAYS_MS[tries] });
    } else {
      retries.delete(key);
      console.error("[elemental] bell: given up after retries");
    }
    return outcome;
  }

  async function retryDue(): Promise<void> {
    const due = [...retries.values()].filter((r) => r.dueAt <= now());
    for (const r of due) await attempt(r.payload, r.tries + 1);
  }

  return {
    ring: (payload) => attempt(payload, 0),
    retryDue,
    pending: () => retries.size,
    start() {
      if (timer || stopped) return;
      timer = setInterval(() => {
        if (running) return;
        running = retryDue().finally(() => {
          running = null;
        });
      }, RETRY_POLL_MS);
      timer.unref?.();
    },
    async stop() {
      stopped = true;
      if (timer) clearInterval(timer);
      timer = null;
      await running;
    },
  };
}

const BELLS = new WeakMap<ElementalRuntime, Bell>();

/** The runtime's bell (made on first use). Tests pass deps first, to fake time. */
export function bellFor(rt: ElementalRuntime, deps?: BellDeps): Bell {
  let bell = BELLS.get(rt);
  if (!bell || deps) {
    bell = createBell(rt, deps);
    BELLS.set(rt, bell);
  }
  return bell;
}

export const feature: ElementalFeature = {
  name: "bell",
  events: {
    "tester.first": async (payload, rt) => {
      await bellFor(rt).ring(payload);
    },
  },
  start(rt) {
    const bell = bellFor(rt);
    bell.start();
    return () => bell.stop();
  },
};
