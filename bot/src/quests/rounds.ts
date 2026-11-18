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
 * About one rest in three carries an encounter (encounterAt): a moment from
 * the island's lore that leaves one side quest's note at the fire. Which rest,
 * and which moment, follow from the round number alone, so a restart shows
 * the same one and everyone at the fire sees the same lines.
 *
 * On a night with an evening guest (schema 21, call.ts), the 19:00 focus
 * round carries a teaser, and from the first rest (19:25) to 21:00 the round
 * messages carry the guest instead of any encounter: its arrival on that
 * rest with who counts (anyone who sits at the fire until 19:30), then that
 * it is still here, and once the night is settled how many teams it left a
 * look for (never which) with the private 🎁 check (rd_guest). On a staff
 * night (the founder or a mentor sat at the fire during the rest) the guest
 * is them, by display name, from the check that saw them on: the message is
 * edited when the guest changes. The evening comes from the call loop's
 * cache (deps.evening); without it the rounds are as before.
 *
 * Design: docs/superpowers/specs/2026-11-13-shift-campfire-rounds-roots-design.md.
 */
import type { Client, Message } from "discord.js";

import { FOCUS_MINUTES, REST_MINUTES } from "@/lib/shift-island/rounds-rules";

import { ROUND_GUEST, CALL, guestOf, type GuestKey } from "./callCopy";
import type { Campfire } from "./campfire";
import { cid } from "./ids";
import { R, type Encounter } from "./rounds-copy";
import { ButtonStyle, button, buttonRows, renderView, type View } from "./ui";

const MINUTE = 60_000;
/** Focus and rest lengths, in minutes; two rounds an hour. */
export const FOCUS_MIN = FOCUS_MINUTES;
export const REST_MIN = REST_MINUTES;
const ROUND_MIN = FOCUS_MIN + REST_MIN;
/** How often the loop looks at the clock and the campfire. */
const TICK_MS = 15_000;
/** Discord's "Unknown Message" error code: the message no longer exists. */
const UNKNOWN_MESSAGE = 10008;
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

/**
 * A well-mixed 32-bit number from a round (a murmur3 finaliser), so encounters
 * do not fall on a visible every-third-rest beat. Pure: the same round always
 * gives the same number, in every process.
 */
export function roundHash(round: number, salt = 0): number {
  let x = (Math.trunc(round) ^ Math.imul(salt + 1, 0x9e3779b9)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

/** One rest in this many carries an encounter, on average. */
export const ENCOUNTER_EVERY = 3;

/** The encounter a round's rest carries, or null (most rests): decided by the round number only. */
export function encounterAt(round: number): Encounter | null {
  if (!Number.isSafeInteger(round)) return null;
  if (roundHash(round) % ENCOUNTER_EVERY !== 0) return null;
  return R.encounters[roundHash(round, 1) % R.encounters.length];
}

/**
 * Tonight's evening, as the call loop last read it (call.ts evening()): the
 * Bangkok day, its guest, the clock in unix seconds, and once the night is
 * settled how many teams got a look. Null on a night without a call (or a
 * SHIFT cohort day, when the call pauses).
 */
export interface Evening {
  day: string;
  /** Null on a night without a guest (no active season): the call runs, the rounds stay as they are. */
  guest: GuestKey | null;
  /** On a staff night: the display names of up to two staff who are the guest. */
  staffNames?: readonly string[];
  /** 19:00 Bangkok: the first focus round. */
  litAt: number;
  /** 19:25 Bangkok: the first rest, when the guest arrives; anyone at the fire from now counts. */
  guestFrom: number;
  /** 19:30 Bangkok: that rest ends, and the night's rolls are made. */
  dropEnd: number;
  /** 21:00 Bangkok: the guest leaves. */
  guestUntil: number;
  /** Once the night is settled: how many teams the guest left a look for. Null before. */
  drop: { teams: number } | null;
}

/** What a round shows of the evening: the teaser, the guest, or nothing. */
type GuestPart =
  | { kind: "teaser" }
  | {
      kind: "guest";
      key: GuestKey;
      names: string[];
      arriving: boolean;
      day: string;
      dropEnd: number;
      drop: { teams: number } | null;
    }
  | null;

/** The evening's part of a round, by when the round's own phase starts. */
export function guestPart(at: RoundAt, evening: Evening | null | undefined): GuestPart {
  if (!evening?.guest) return null;
  const startsAt = at.phase === "focus" ? at.restAt - FOCUS_MIN * 60 : at.restAt;
  if (at.phase === "focus" && startsAt === evening.litAt) return { kind: "teaser" };
  if (startsAt < evening.guestFrom || startsAt >= evening.guestUntil) return null;
  return {
    kind: "guest",
    key: evening.guest,
    names: [...(evening.staffNames ?? [])],
    arriving: startsAt === evening.guestFrom,
    day: evening.day,
    dropEnd: evening.dropEnd,
    drop: evening.drop ?? null,
  };
}

/** What makes a round's message change: its round, its phase, and the evening's part of it. */
export function roundKey(at: RoundAt, evening: Evening | null | undefined): string {
  return JSON.stringify([at.round, at.phase, guestPart(at, evening)]);
}

/**
 * The guest's lines on a round message: on its rest, who counts until the
 * night is settled; once settled, how many teams got a look and the private
 * 🎁 check (no button before: there is nothing to check yet).
 */
function guestLines(part: Extract<GuestPart, { kind: "guest" }>): { text: string; button: ReturnType<typeof button> | null } {
  const g = guestOf(part.key, part.names);
  const lines = [part.arriving ? g.arrive : g.still];
  if (part.drop) lines.push(ROUND_GUEST.dropped(g, part.drop.teams));
  else if (part.arriving) lines.push(ROUND_GUEST.sit(part.dropEnd));
  return { text: lines.join("\n"), button: part.drop ? button(cid("rd_guest", part.day), CALL.btnCheck) : null };
}

/** The round's message: the same for everyone at the fire. */
export function roundView(at: RoundAt, evening: Evening | null = null): View {
  const part = guestPart(at, evening);
  const guest = part?.kind === "guest" ? guestLines(part) : null;
  if (at.phase === "focus") {
    const buttons = [button(cid("rd_aim"), R.btnAim, ButtonStyle.Primary)];
    if (guest?.button) buttons.push(guest.button);
    return {
      tone: "island",
      title: R.focusTitle,
      blocks: [
        { kind: "text", text: R.focus(at.restAt) },
        ...(part?.kind === "teaser" ? [{ kind: "text", text: ROUND_GUEST.teaser } as const] : []),
        ...(guest ? [{ kind: "divider" } as const, { kind: "text", text: guest.text } as const] : []),
        { kind: "subtext", text: `${guest ? `${ROUND_GUEST.fine}\n` : ""}${R.focusFine}\n${ROUND_MARKER}` },
      ],
      rows: buttonRows(buttons),
    };
  }
  const tip = R.tips[((at.round % R.tips.length) + R.tips.length) % R.tips.length];
  // The guest's stay replaces the encounters: one moment per rest.
  const encounter = guest ? null : encounterAt(at.round);
  const buttons = [button(cid("rd_close"), R.btnClose, ButtonStyle.Success), button(cid("rd_aim"), R.btnAim)];
  if (encounter) buttons.push(button(cid("rd_enc", at.round), encounter.button));
  if (guest?.button) buttons.push(guest.button);
  const moment = guest?.text ?? encounter?.text;
  const fine = guest ? `${ROUND_GUEST.fine}\n` : encounter ? `${R.encounterFine}\n` : "";
  return {
    tone: "island",
    title: R.restTitle,
    blocks: [
      { kind: "text", text: R.rest(tip, at.nextAt) },
      ...(moment ? [{ kind: "divider" } as const, { kind: "text", text: moment } as const] : []),
      { kind: "subtext", text: `${fine}${R.restFine}\n${ROUND_MARKER}` },
    ],
    rows: buttonRows(buttons),
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
  /** Tonight's evening (the call loop's cache, call.ts), or null: the guest on the round messages. */
  evening?: (nowMs: number) => Evening | null;
}

function codeOf(error: unknown): string {
  const e = error as { code?: unknown; name?: string };
  return typeof e?.code === "number" || typeof e?.code === "string" ? String(e.code) : (e?.name ?? "unknown");
}

export function startRounds(client: Client, campfire: Pick<Campfire, "status">, deps: RoundDeps = {}): Rounds & { tick: () => Promise<void> } {
  const now = deps.now ?? Date.now;
  const botId = deps.botId ?? (() => client.user?.id);
  const eveningAt = (nowMs: number): Evening | null => {
    try {
      return deps.evening?.(nowMs) ?? null;
    } catch {
      return null;
    }
  };
  const channelOf =
    deps.channelOf ??
    ((id: string): RoundChannel | null => {
      const found = client.channels.cache.get(id);
      if (!found || !found.isVoiceBased() || !found.isSendable()) return null;
      return found as unknown as RoundChannel;
    });

  /** The round message this process posted, and what it shows (key: roundKey). */
  let current: { message: Message; channel: string; round: number; key: string } | null = null;
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
    const nowMs = now();
    const at = roundAt(nowMs);
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
    const evening = eveningAt(nowMs);
    const key = roundKey(at, evening);
    if (current && current.channel === room && current.round === at.round) {
      // The same round: an edit only when it shows something new (the rest, or the guest learned late).
      if (current.key === key) return;
      try {
        await current.message.edit({ ...renderView(roundView(at, evening), { ephemeral: false }), allowedMentions: { parse: [] } });
        current.key = key;
      } catch (error) {
        warnOnce(`edit:${codeOf(error)}`, `[shift-quests] rounds: edit failed (${codeOf(error)})`);
        // The message is gone (deleted by hand): post anew next tick. Any other
        // failure (network, Discord 5xx) keeps it, and the next tick retries
        // the edit, so a stale message never stays behind.
        if (codeOf(error) === String(UNKNOWN_MESSAGE)) current = null;
      }
      return;
    }
    await remove();
    await sweep(channel);
    try {
      const message = await channel.send({ ...renderView(roundView(at, evening), { ephemeral: false }), allowedMentions: { parse: [] } });
      current = { message, channel: room, round: at.round, key };
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
