import { Events, PermissionFlagsBits, type Client, type VoiceState } from "discord.js";

import { QuestDbError, QuestError, type QuestApi } from "./api";
import { campersIn, voiceChange, type VoiceMember } from "./campfire-state";

/**
 * The island's campfire: who is in the SHIFT coworking voice channel right
 * now, so the web can draw one figure per person and list their server names
 * to signed-in SHIFT students. The bot never joins voice, never hears audio
 * and keeps no history: a row is written on join, deleted on leave, and the
 * whole table is replaced from the gateway's voice cache on every ready,
 * resume and clean stop. Nothing about any other channel is ever written.
 *
 * Writes go through shift_quest_voice_set/sync/beat (20261111093000, schema 7),
 * which only the bot role may call. The coworking channel is the database's
 * setting (/admin channel kind:coworking), learned from each heartbeat; the
 * web treats the campfire as empty once the heartbeat is 3 minutes old.
 *
 * This module has its own listener next to shift-voice (bot/src/shift/voice.ts)
 * and shares nothing with it: not its pool, role, tables or state.
 */

/** The island schema that adds the campfire functions (20261111093000_shift_quest_campfire.sql). */
export const CAMPFIRE_SCHEMA = 7;

/** Heartbeat: keeps the web's view live and picks up a changed coworking channel. */
const BEAT_MS = 60_000;
/** A full resync even when nothing looked wrong: catches any event the gateway lost. */
const RESYNC_MS = 5 * 60_000;
/**
 * Heartbeats after a ready that resync anyway. During a deploy the old process
 * can stop (and empty the campfire with its clean-stop sync) just after this
 * one synced; the next heartbeat puts everyone back within a minute.
 */
const SETTLE_BEATS = 1;

const SNOWFLAKE = /^[0-9]{5,25}$/;

/** The one method openToStudents needs from a guild channel (discord.js GuildChannel has it). */
interface Permissioned {
  permissionsFor?: (role: string) => { has: (permissions: bigint[]) => boolean } | null;
}

/**
 * Students can see and join the voice channel: any configured student role,
 * or @everyone (whose role id is the guild id) while none is configured. Only
 * then is who sits in it something the island may show to students. Unknown
 * (no permissions to read) counts as closed.
 */
export function openToStudents(channel: Permissioned | null | undefined, studentRoleIds: string[], everyoneId: string): boolean {
  const permissionsFor = channel?.permissionsFor?.bind(channel);
  if (!permissionsFor) return false;
  const roles = studentRoleIds.length > 0 ? studentRoleIds : [everyoneId];
  return roles.some((role) => permissionsFor(role)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]) ?? false);
}

export interface Campfire {
  stop: () => Promise<void>;
}

/** A failure as a code only: messages can carry names, which never go to logs. */
function codeOf(error: unknown): string {
  if (error instanceof QuestError) return `sq:${error.code}`;
  if (error instanceof QuestDbError) return `SQLSTATE ${error.sqlstate}`;
  return (error as Error)?.name ?? "unknown";
}

/**
 * Starts the campfire when the database has its functions; otherwise logs
 * one line and starts nothing, so the bot can deploy before the migration.
 */
export function campfireFor(version: number, start: () => Campfire): Campfire | null {
  if (version >= CAMPFIRE_SCHEMA) return start();
  console.log(`[shift-quests] campfire off (schema ${version} < ${CAMPFIRE_SCHEMA})`);
  return null;
}

export function startCampfire(client: Client, api: QuestApi, guildId: string, connected: () => boolean): Campfire {
  /** The coworking channel from the last heartbeat; undefined until the first one answers. */
  let channel: string | null | undefined;
  /** Who the database has at the campfire, as far as this process knows, with the name written. */
  const names = new Map<string, string | null>();
  /** A write failed or was refused: the next heartbeat resyncs everything. */
  let dirty = false;
  let lastSync = 0;
  /** Heartbeats left that resync after a ready (SETTLE_BEATS). */
  let settle = 0;
  let stopped = false;
  /** The last "cannot see the channel" warning, so it is logged once per cause. */
  let warned = "";
  /** One chain for every write, so the database sees them in the order they happened. */
  let chain: Promise<void> = Promise.resolve();

  function enqueue(what: string, task: () => Promise<unknown>): Promise<void> {
    const next = chain.then(task).then(
      () => undefined,
      (error) => {
        dirty = true;
        console.error(`[shift-quests] campfire ${what} failed: ${codeOf(error)}`);
      }
    );
    chain = next;
    return next;
  }

  /** Vouches for the rows and reads the coworking channel; true when it changed. */
  async function beat(): Promise<boolean> {
    const value = await api.call<unknown>("shift_quest_voice_beat", guildId);
    const next = typeof value === "string" && SNOWFLAKE.test(value) ? value : null;
    const changed = next !== channel;
    // The beat itself deleted every row of an older channel.
    if (changed) names.clear();
    channel = next;
    return changed;
  }

  function warnOnce(key: string, line: string): void {
    if (warned === key) return;
    warned = key;
    console.warn(line);
  }

  /**
   * Replaces the database's campfire with who the gateway's voice cache has in
   * the coworking channel now. No REST call and no privileged intent: voice
   * states arrive with GuildVoiceStates, which the bot already has.
   */
  async function resync(): Promise<number> {
    const room = channel ?? null;
    let ids: string[] = [];
    let list: (string | null)[] = [];
    /** The guild itself is not in the cache yet (an outage): look again at the next heartbeat. */
    let blind = false;
    if (room) {
      const guild = client.guilds.cache.get(guildId);
      const voice = guild?.channels.cache.get(room);
      if (!guild || !voice?.isVoiceBased()) {
        blind = !guild || guild.available === false;
        warnOnce(
          `${room}:hidden`,
          `[shift-quests] campfire: coworking channel ${room} is not a voice channel the bot can see; the campfire stays empty`
        );
      } else {
        warned = "";
        const members: VoiceMember[] = [...guild.voiceStates.cache.values()].map((state) => ({
          id: state.id,
          channelId: state.channelId,
          bot: state.member?.user.bot ?? false,
          name: state.member?.displayName ?? null,
        }));
        ({ ids, names: list } = campersIn(members, room));
      }
    }
    const count = Number(await api.call<number>("shift_quest_voice_sync", guildId, room, ids, list));
    names.clear();
    ids.forEach((id, i) => names.set(id, list[i]));
    lastSync = Date.now();
    // Nobody stored although someone is there: the setting moved under us. The next beat sorts it out.
    dirty = blind || (ids.length > 0 && count === 0);
    return count;
  }

  const onVoice = (oldState: VoiceState, newState: VoiceState): void => {
    if (stopped || channel === undefined) return;
    if (newState.guild.id !== guildId) return;
    const member = newState.member ?? oldState.member;
    if (member?.user.bot) return;
    const userId = newState.id;
    const room = channel;
    const change = voiceChange(oldState.channelId, newState.channelId, room, member?.displayName ?? null, names.get(userId));
    if (change.kind === "none") return;

    if (change.kind === "leave") {
      names.delete(userId);
      void enqueue("leave", () => api.call("shift_quest_voice_set", guildId, userId, null, null));
      return;
    }

    names.set(userId, change.name);
    void enqueue(change.kind, async () => {
      let name = change.name;
      if (name === null) {
        const fetched = await newState.guild.members.fetch(userId).catch(() => null);
        if (fetched?.user.bot) {
          names.delete(userId);
          return;
        }
        name = fetched?.displayName ?? null;
        if (names.has(userId)) names.set(userId, name);
      }
      const kept = await api.call<boolean>("shift_quest_voice_set", guildId, userId, room, name);
      // false: the coworking channel is no longer this one. The next beat resyncs.
      if (kept === false) dirty = true;
    });
  };

  // A fresh session: nothing seen before it counts, so read the channel and replace everything.
  const onReady = (): void => {
    if (stopped) return;
    void enqueue("ready", async () => {
      await beat();
      await resync();
      settle = SETTLE_BEATS;
    });
  };
  // A resume replays missed events, but a full resync is cheap and certain.
  const onResume = (): void => {
    if (stopped) return;
    void enqueue("resume", async () => {
      if (channel === undefined) await beat();
      await resync();
    });
  };

  client.on(Events.VoiceStateUpdate, onVoice);
  client.on(Events.ShardReady, onReady);
  client.on(Events.ShardResume, onResume);

  // While disconnected no events arrive, so the heartbeat must not vouch for
  // rows it cannot see: after 3 minutes the web shows the campfire empty.
  let ticking = false;
  const timer = setInterval(() => {
    if (stopped || ticking || !connected()) return;
    ticking = true;
    void enqueue("beat", async () => {
      const changed = await beat();
      const settling = settle > 0;
      if (settling) settle -= 1;
      if (changed || dirty || settling || Date.now() - lastSync >= RESYNC_MS) await resync();
    }).finally(() => {
      ticking = false;
    });
  }, BEAT_MS);
  timer.unref?.();

  return {
    async stop() {
      stopped = true;
      clearInterval(timer);
      client.off(Events.VoiceStateUpdate, onVoice);
      client.off(Events.ShardReady, onReady);
      client.off(Events.ShardResume, onResume);
      await chain;
      try {
        // Nobody sits at a campfire the bot no longer watches.
        await api.call("shift_quest_voice_sync", guildId, channel ?? null, [], []);
      } catch {
        // The web shows it empty 3 minutes after the last heartbeat anyway.
      }
      names.clear();
    },
  };
}
