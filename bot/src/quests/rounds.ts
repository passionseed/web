/**
 * Campfire rounds: a shared focus and rest rhythm in the coworking voice
 * channel's text chat, while someone sits at the campfire.
 *
 * Rounds follow the clock, so everyone at the fire shares one rhythm and no
 * per-person timer exists: 🔥 focus from :00 to :25 and :30 to :55, 🌊 rest
 * (diffuse mode) from :25 to :30 and :55 to :00. One message per round,
 * posted when the round starts (or when the first person sits down during
 * it), edited from focus to rest, and deleted when the next round posts or
 * when the round ends with nobody left at the fire. No pings, no names: the
 * message is the same for everyone, and its buttons answer each person
 * privately (handlers/rounds.ts). Nothing here is stored.
 *
 * Design: docs/superpowers/specs/2026-11-13-shift-campfire-rounds-roots-design.md.
 */
import type { Client, Message } from "discord.js";

import { FOCUS_MINUTES, REST_MINUTES } from "@/lib/shift-island/rounds-rules";

import type { Campfire } from "./campfire";
import { cid } from "./ids";
import { R } from "./rounds-copy";
import { ButtonStyle, button, buttonRows, renderView, type View } from "./ui";

const MINUTE = 60_000;
/** Focus and rest lengths, in minutes; two rounds an hour. */
export const FOCUS_MIN = FOCUS_MINUTES;
export const REST_MIN = REST_MINUTES;
const ROUND_MIN = FOCUS_MIN + REST_MIN;
/** How often the loop looks at the clock and the campfire. */
const TICK_MS = 15_000;
/** A line only round messages carry, so a restart can find and remove its own leftovers. */
export const ROUND_MARKER = "-# 🔥 รอบกองไฟ";

export type Phase = "focus" | "rest";

export interface RoundAt {
  /** Rounds since the epoch: equal for the focus and the rest of one round. */
  round: number;
  phase: Phase;
  /** When the focus ends (the rest starts), in unix seconds. */
  restAt: number;
  /** When the next round starts, in unix seconds. */
  nextAt: number;
}

/**
 * The round at a moment. Bangkok is a whole number of hours from UTC, so
 * :00 and :30 on the Bangkok clock are :00 and :30 in UTC.
 */
export function roundAt(nowMs: number): RoundAt {
  const minutes = Math.floor(nowMs / MINUTE);
  const round = Math.floor(minutes / ROUND_MIN);
  const start = round * ROUND_MIN * 60;
  const into = minutes - round * ROUND_MIN;
  return {
    round,
    phase: into < FOCUS_MIN ? "focus" : "rest",
    restAt: start + FOCUS_MIN * 60,
    nextAt: start + ROUND_MIN * 60,
  };
}

/** The round's message: the same for everyone at the fire. */
export function roundView(at: RoundAt): View {
  if (at.phase === "focus") {
    return {
      tone: "island",
      title: R.focusTitle,
      blocks: [
        { kind: "text", text: R.focus(at.restAt) },
        { kind: "subtext", text: `${R.focusFine}\n${ROUND_MARKER}` },
      ],
      rows: buttonRows([button(cid("rd_aim"), R.btnAim, ButtonStyle.Primary)]),
    };
  }
  const tip = R.tips[((at.round % R.tips.length) + R.tips.length) % R.tips.length];
  return {
    tone: "island",
    title: R.restTitle,
    blocks: [
      { kind: "text", text: R.rest(tip, at.nextAt) },
      { kind: "subtext", text: `${R.restFine}\n${ROUND_MARKER}` },
    ],
    rows: buttonRows([button(cid("rd_close"), R.btnClose, ButtonStyle.Success), button(cid("rd_aim"), R.btnAim)]),
  };
}

/** The text channel a voice channel carries (its chat), as far as the rounds need it. */
interface RoundChannel {
  id: string;
  send: (payload: ReturnType<typeof renderView>) => Promise<Message>;
  messages: { fetch: (o: { limit: number }) => Promise<Map<string, Message> | { values(): IterableIterator<Message> }> };
}

export interface Rounds {
  stop: () => Promise<void>;
}

/** What the loop needs from discord.js, so tests can stand in for it. */
export interface RoundDeps {
  now?: () => number;
  /** The coworking voice channel's chat, or null when the bot cannot post there. */
  channelOf?: (id: string) => RoundChannel | null;
  botId?: () => string | undefined;
}

function codeOf(error: unknown): string {
  const e = error as { code?: unknown; name?: string };
  return typeof e?.code === "number" || typeof e?.code === "string" ? String(e.code) : (e?.name ?? "unknown");
}

export function startRounds(client: Client, campfire: Pick<Campfire, "status">, deps: RoundDeps = {}): Rounds & { tick: () => Promise<void> } {
  const now = deps.now ?? Date.now;
  const botId = deps.botId ?? (() => client.user?.id);
  const channelOf =
    deps.channelOf ??
    ((id: string): RoundChannel | null => {
      const found = client.channels.cache.get(id);
      if (!found || !found.isVoiceBased() || !found.isSendable()) return null;
      return found as unknown as RoundChannel;
    });

  /** The round message this process posted, and what it shows. */
  let current: { message: Message; channel: string; round: number; phase: Phase } | null = null;
  /** Channels already swept for an earlier process's leftovers. */
  const swept = new Set<string>();
  let warned = "";
  let stopped = false;
  let running: Promise<void> = Promise.resolve();

  function warnOnce(key: string, line: string): void {
    if (warned === key) return;
    warned = key;
    console.warn(line);
  }

  async function remove(): Promise<void> {
    const old = current;
    current = null;
    if (old) await old.message.delete().catch(() => undefined);
  }

  /** Deletes round messages a previous process left behind (a restart mid-round). */
  async function sweep(channel: RoundChannel): Promise<void> {
    if (swept.has(channel.id)) return;
    swept.add(channel.id);
    const me = botId();
    try {
      const recent = await channel.messages.fetch({ limit: 25 });
      for (const m of recent.values()) {
        if (m.author?.id === me && JSON.stringify(m.components ?? []).includes(ROUND_MARKER)) await m.delete().catch(() => undefined);
      }
    } catch {
      // No Read Message History: the leftover stays; the new round still posts.
    }
  }

  async function step(): Promise<void> {
    if (stopped) return;
    const { channel: room, sitters } = campfire.status();
    const at = roundAt(now());
    if (!room || sitters === 0) {
      // Nobody at the fire: the round's message goes once the round it shows is over.
      if (current && (current.round !== at.round || current.channel !== room)) await remove();
      return;
    }
    const channel = channelOf(room);
    if (!channel) {
      warnOnce(`${room}:send`, `[shift-quests] rounds: cannot post in the coworking channel's chat (${room}); rounds are off there`);
      return;
    }
    if (current && current.channel === room && current.round === at.round) {
      if (current.phase === at.phase) return;
      try {
        await current.message.edit(renderView(roundView(at), { ephemeral: false }));
        current.phase = at.phase;
      } catch (error) {
        warnOnce(`edit:${codeOf(error)}`, `[shift-quests] rounds: edit failed (${codeOf(error)})`);
        current = null;
      }
      return;
    }
    await remove();
    await sweep(channel);
    try {
      const message = await channel.send({ ...renderView(roundView(at), { ephemeral: false }), allowedMentions: { parse: [] } });
      current = { message, channel: room, round: at.round, phase: at.phase };
      warned = "";
    } catch (error) {
      warnOnce(`send:${codeOf(error)}`, `[shift-quests] rounds: post failed (${codeOf(error)})`);
    }
  }

  function tick(): Promise<void> {
    running = running.then(step).catch((error) => {
      console.error(`[shift-quests] rounds: ${codeOf(error)}`);
    });
    return running;
  }

  const timer = setInterval(() => void tick(), TICK_MS);
  timer.unref?.();

  return {
    tick,
    async stop() {
      stopped = true;
      clearInterval(timer);
      await running;
      // The message would go stale while no bot keeps it: remove it; the next process posts anew.
      await remove();
    },
  };
}
