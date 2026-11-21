import type { APIEmbed, Client } from "discord.js";

import type { HackathonOpsEnv } from "../env";
import type { OpsApi } from "./api";
import { NO_PINGS, isStaffChannel } from "./handlers";
import { bangkokDate, bangkokMinutes, boardEmbed, dueEmbed, embedSize, worthPosting } from "./model";

/** 08:30 Bangkok. */
export const MORNING_FROM = 8 * 60 + 30;
/** A bot that was down at 08:30 still posts until noon; after that it waits for tomorrow. */
export const MORNING_UNTIL = 12 * 60;

const CHECK_MS = 60_000;

/** Where the morning post may go: the configured channel, nothing else. */
export interface MorningChannel {
  send(message: { embeds: APIEmbed[]; allowedMentions: typeof NO_PINGS }): Promise<unknown>;
}

export type ChannelCheck = { ok: true; channel: MorningChannel } | { ok: false; reason: string };

export interface MorningDeps {
  api: OpsApi;
  now: () => number;
  connected: () => boolean;
  channel: () => Promise<ChannelCheck>;
  log: (line: string) => void;
}

export interface MorningState {
  /** The Bangkok day already settled here (sent, sent by another process, or nothing to say). */
  settled: string | null;
  /** The Bangkok day a channel problem was last logged, so it is logged once a day. */
  warned: string | null;
}

export type TickResult = "outside" | "settled" | "offline" | "no_channel" | "taken" | "nothing" | "sent" | "failed";

/** One check: posts the board and the due list once per Bangkok day, from 08:30 until noon. */
export async function morningTick(deps: MorningDeps, state: MorningState): Promise<TickResult> {
  const now = deps.now();
  const minutes = bangkokMinutes(now);
  if (minutes < MORNING_FROM || minutes >= MORNING_UNTIL) return "outside";
  const day = bangkokDate(now);
  if (state.settled === day) return "settled";
  if (!deps.connected()) return "offline";

  // Checked before claiming, so a channel problem does not use up today's post.
  const check = await deps.channel();
  if (!check.ok) {
    if (state.warned !== day) {
      state.warned = day;
      deps.log(`[hackathon-ops] morning post skipped: ${check.reason}`);
    }
    return "no_channel";
  }

  if (!(await deps.api.claimMorning(day))) {
    state.settled = day;
    return "taken";
  }
  try {
    const ops = await deps.api.board();
    if (!worthPosting(ops)) {
      state.settled = day;
      deps.log("[hackathon-ops] morning post: nothing open, nothing posted");
      return "nothing";
    }
    const board = boardEmbed(ops, now);
    const due = dueEmbed(ops, now);
    // One message holds 6000 characters of embeds; a long board goes as two.
    if (embedSize(board) + embedSize(due) <= 5900) {
      await check.channel.send({ embeds: [due, board], allowedMentions: NO_PINGS });
    } else {
      await check.channel.send({ embeds: [due], allowedMentions: NO_PINGS });
      await check.channel.send({ embeds: [board], allowedMentions: NO_PINGS });
    }
    state.settled = day;
    deps.log("[hackathon-ops] morning post sent");
    return "sent";
  } catch (error) {
    // Give the claim back so the next check (until noon) can try again.
    await deps.api.releaseMorning(day).catch(() => undefined);
    deps.log(`[hackathon-ops] morning post failed: ${(error as Error)?.name ?? "unknown"}; will retry`);
    return "failed";
  }
}

/**
 * The configured channel, only when it is in the configured server, the bot
 * can send there, and @everyone cannot see it (a staff room).
 */
export async function configuredChannel(
  client: Client,
  env: Pick<HackathonOpsEnv, "guildId" | "channelId">
): Promise<ChannelCheck> {
  const channel = await client.channels.fetch(env.channelId).catch(() => null);
  if (!channel) return { ok: false, reason: "HACKATHON_OPS_CHANNEL_ID not found or not visible to the bot" };
  if (!("guildId" in channel) || channel.guildId !== env.guildId) {
    return { ok: false, reason: "HACKATHON_OPS_CHANNEL_ID is not in HACKATHON_OPS_GUILD_ID" };
  }
  if (!channel.isSendable()) return { ok: false, reason: "the bot cannot send messages in the ops channel" };
  if (!isStaffChannel(channel, env.channelId)) {
    return { ok: false, reason: "the ops channel is visible to @everyone; make it staff-only" };
  }
  return { ok: true, channel };
}

export interface MorningLoop {
  stop(): Promise<void>;
}

export function startMorningPost(deps: MorningDeps): MorningLoop {
  const state: MorningState = { settled: null, warned: null };
  let running: Promise<unknown> | null = null;
  let stopped = false;
  const tick = () => {
    if (stopped || running) return;
    running = morningTick(deps, state)
      .catch((error: unknown) => deps.log(`[hackathon-ops] morning check failed: ${(error as Error)?.name ?? "unknown"}`))
      .finally(() => {
        running = null;
      });
  };
  const first = setTimeout(tick, 10_000);
  const timer = setInterval(tick, CHECK_MS);
  return {
    async stop() {
      stopped = true;
      clearTimeout(first);
      clearInterval(timer);
      await running;
    },
  };
}
