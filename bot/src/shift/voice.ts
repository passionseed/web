import fs from "node:fs";

import { Events, type Client, type Guild, type GuildMember, type VoiceState } from "discord.js";

import { roundsInSession } from "@/lib/shift/voiceWindow";

import type { ShiftVoiceEnv } from "../env";
import {
  createVoicePool,
  fetchRosterRows,
  voiceBeat,
  voiceCloseAll,
  voiceTransition,
  type TrackedStudent,
} from "./db";
import { pickRoster, type RosterEntry } from "./roster";
import { NOT_IN_VOICE, flagsChanged, roundFromRoles, toFlags, type RawVoiceState, type VoiceFlags } from "./state";

const BEAT_MS = 60_000;
/** New students link during a round; this is how soon the bot notices. */
const ROSTER_REFRESH_MS = 5 * 60_000;
/**
 * Touched after every heartbeat that reached the database while connected.
 * The Docker HEALTHCHECK reads its age; bot/watchdog.py alerts on it.
 */
export const HEALTH_FILE = "/tmp/shift-voice-healthy";
/** With no good heartbeat this long, exit and let the restart policy start fresh. */
const STALE_EXIT_MS = 15 * 60_000;

function markHealthy(): void {
  try {
    fs.writeFileSync(HEALTH_FILE, new Date().toISOString());
  } catch (error) {
    console.error("[shift-voice] could not write health file:", (error as Error).message);
  }
}

function raw(state: VoiceState): RawVoiceState {
  return {
    channelId: state.channelId,
    channelName: state.channel?.name ?? null,
    selfMute: state.selfMute,
    selfDeaf: state.selfDeaf,
    serverMute: state.serverMute,
    serverDeaf: state.serverDeaf,
    streaming: state.streaming,
    selfVideo: state.selfVideo,
  };
}

/**
 * Records SHIFT students' voice state in shift_voice_spans: presence, mic
 * open, screen share and camera. Never joins voice and never receives audio.
 *
 * Only students of a round in session are recorded: a linked, non-declined
 * application, or a SHIFT[n] role for students who never linked. Everyone
 * else in the shared server is dropped before anything is written.
 */
export function registerShiftVoice(client: Client, env: ShiftVoiceEnv): { stop: () => Promise<void> } {
  const db = createVoicePool(env.databaseUrl);
  let inSession = new Set<string>();
  let roster = new Map<string, RosterEntry>();
  let connected = false;
  /** Discord users with an open row, as far as this process knows. */
  const open = new Set<string>();
  /** One promise chain per user, so their transitions reach the database in order. */
  const queues = new Map<string, Promise<void>>();

  function enqueue(userId: string, task: () => Promise<void>): Promise<void> {
    const next: Promise<void> = (queues.get(userId) ?? Promise.resolve())
      .then(task)
      .catch((error) => console.error("[shift-voice] transition failed:", error))
      .finally(() => {
        if (queues.get(userId) === next) queues.delete(userId);
      });
    queues.set(userId, next);
    return next;
  }

  function identify(member: GuildMember | null, userId: string): TrackedStudent | null {
    const linked = roster.get(userId);
    const displayName = member?.displayName ?? null;
    if (linked) return { cohort: linked.cohort, applicationId: linked.applicationId, displayName };
    if (!member) return null;
    const cohort = roundFromRoles(member.roles.cache.map((role) => role.name), inSession);
    return cohort ? { cohort, applicationId: null, displayName } : null;
  }

  function record(userId: string, student: TrackedStudent | null, flags: VoiceFlags, isJoin: boolean) {
    return enqueue(userId, async () => {
      await voiceTransition(db, userId, student, flags, isJoin);
      if (student && flags.channelId) open.add(userId);
      else open.delete(userId);
    });
  }

  /**
   * Makes the open rows match who is in voice right now. Runs after every
   * roster refresh: a student who links mid-session is picked up without a
   * voice event, and a declined student's role removal (which fires no voice
   * event) closes their row.
   */
  async function sync(guild: Guild): Promise<{ opened: number; closed: number }> {
    let opened = 0;
    let closed = 0;
    const present = new Set<string>();

    for (const state of guild.voiceStates.cache.values()) {
      if (state.member?.user.bot) continue;
      const flags = toFlags(raw(state), guild.afkChannelId);
      if (!flags.channelId) continue;
      const student = identify(state.member, state.id);
      if (!student) continue;
      present.add(state.id);
      if (open.has(state.id)) continue;
      await record(state.id, student, flags, false);
      opened += 1;
    }

    for (const userId of [...open]) {
      if (present.has(userId)) continue;
      await record(userId, null, NOT_IN_VOICE, false);
      closed += 1;
    }
    return { opened, closed };
  }

  async function refreshRoster(): Promise<void> {
    const rounds = roundsInSession();
    roster = rounds.size > 0 ? pickRoster(await fetchRosterRows(db, [...rounds])) : new Map();
    inSession = rounds;
  }

  /** Fresh gateway session: nothing seen since the last heartbeat counts. */
  async function reconcile(): Promise<void> {
    await refreshRoster();
    const closed = await voiceCloseAll(db);
    open.clear();
    const guild = await client.guilds.fetch(env.guildId);
    const { opened } = await sync(guild);
    markHealthy();
    console.log(
      `[shift-voice] watching "${guild.name}": rounds in session ${[...inSession].join(", ") || "none"}, ` +
        `${roster.size} linked student(s), closed ${closed} stale row(s), ${opened} student(s) in voice now`
    );
  }

  client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    if (newState.guild.id !== env.guildId) return;
    if ((newState.member ?? oldState.member)?.user.bot) return;

    const afk = newState.guild.afkChannelId;
    const before = toFlags(raw(oldState), afk);
    const after = toFlags(raw(newState), afk);
    if (!flagsChanged(before, after)) return;

    const userId = newState.id;
    const student = identify(newState.member, userId);
    // Not a student, and nothing open to close: never written.
    if (!student && !open.has(userId)) return;
    void record(userId, student, after, !before.channelId);
  });

  // shardReady fires on the first connection and on every fresh session after
  // an invalidated one. A resume replays missed events, so it needs nothing.
  client.on(Events.ShardReady, () => {
    connected = true;
    reconcile().catch((error) => console.error("[shift-voice] reconcile failed:", error));
  });
  client.on(Events.ShardResume, () => {
    connected = true;
  });
  client.on(Events.ShardDisconnect, () => {
    connected = false;
  });
  client.on(Events.ShardReconnecting, () => {
    connected = false;
  });

  // While disconnected no events arrive, so the heartbeat must not vouch for
  // rows it cannot see.
  let lastGoodBeat = Date.now();
  const beatTimer = setInterval(async () => {
    if (connected && (await voiceBeat(db))) {
      lastGoodBeat = Date.now();
      markHealthy();
      return;
    }
    if (Date.now() - lastGoodBeat > STALE_EXIT_MS) {
      console.error("[shift-voice] no good heartbeat for 15 minutes; exiting so Docker restarts the bot");
      process.exit(1);
    }
  }, BEAT_MS);

  const rosterTimer = setInterval(() => {
    if (!connected) return;
    refreshRoster()
      .then(() => client.guilds.fetch(env.guildId))
      .then(sync)
      .then(({ opened, closed }) => {
        if (opened || closed) console.log(`[shift-voice] roster sync: opened ${opened}, closed ${closed}`);
      })
      .catch((error) => console.error("[shift-voice] roster refresh failed:", error));
  }, ROSTER_REFRESH_MS);

  return {
    async stop() {
      clearInterval(beatTimer);
      clearInterval(rosterTimer);
      await Promise.allSettled([...queues.values()]);
      // Vouch up to now, then close: a clean shutdown loses no observed time.
      if (connected) await voiceBeat(db);
      const closed = await voiceCloseAll(db);
      console.log(`[shift-voice] closed ${closed} open row(s)`);
      await db.end();
    },
  };
}
