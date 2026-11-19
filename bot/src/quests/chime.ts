/**
 * The campfire's sound in the coworking voice channel (rounds.ts decides when):
 *
 * - **Chime**: as a focus or a rest starts, the bot steps in, plays a short
 *   chime and leaves.
 * - **Rest music**: a minute before a rest, the bot steps in and starts the
 *   rest track, which fades in on its own over that minute, plays through
 *   the rest and fades out. As the next focus starts it stops the music,
 *   plays the focus chime and leaves. It leaves at once if nobody is left
 *   at the fire or the rhythm changes (stillWanted).
 *
 * One thing plays at a time; a call while something plays is dropped. The
 * files are Ogg Opus (bot/assets/sounds; the music is made by
 * bot/scripts/make-campfire-music.mjs), so they go to Discord as they are:
 * no encoder and no ffmpeg in the image. The bot says nothing and names no
 * one, and as a bot it is never counted as a sitter (campfire.ts,
 * bot/src/shift/voice.ts).
 *
 * Never throws. Needs Connect and Speak in the channel; without them it warns
 * once and the rounds carry on silently. SHIFT_ROUND_CHIME=off turns all of
 * it off, SHIFT_REST_MUSIC=off only the music.
 */
import { createReadStream } from "node:fs";
import path from "node:path";
import {
  AudioPlayerStatus,
  StreamType,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  VoiceConnectionStatus,
  type AudioPlayer,
  type VoiceConnection,
} from "@discordjs/voice";
import type { Client } from "discord.js";

export type ChimeKind = "focus" | "rest";

const SOUNDS_DIR = path.join(__dirname, "..", "..", "assets", "sounds");
const sound = (name: string) => path.join(SOUNDS_DIR, `${name}.ogg`);
export const SOUND_FILES = {
  focus: sound("focus"),
  rest: sound("rest"),
  restShort: sound("rest-short"),
  restLong: sound("rest-long"),
} as const;

const JOIN_TIMEOUT_MS = 10_000;
const CHIME_TIMEOUT_MS = 15_000;
/** How often the music checks that someone is still at the fire. */
const WATCH_MS = 2_000;
/** A focus chime this soon after the last one is the same start: dropped. */
const CHIME_DEDUPE_MS = 90_000;
/**
 * The music may start at most this late. The track ends with a 12 s fade out
 * timed to the next focus, so a later start would be cut off at full volume.
 */
export const MUSIC_LATE_MS = 10_000;

export function chimeEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.SHIFT_ROUND_CHIME ?? "").trim().toLowerCase() !== "off";
}

export function restMusicEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return chimeEnabled(env) && (env.SHIFT_REST_MUSIC ?? "").trim().toLowerCase() !== "off";
}

export interface RestMusicPlan {
  channelId: string;
  /** When the track starts (unix ms): a minute before the rest, the length of its fade in. */
  startAt: number;
  /** When the next focus starts (unix ms): the music stops and the focus chime plays. */
  endAt: number;
  long: boolean;
  /** False once nobody sits at the fire or the rhythm changed: the bot leaves. */
  stillWanted: () => boolean;
}

export interface CampfireVoice {
  chime: (channelId: string, kind: ChimeKind) => void;
  /** False when the plan was not taken (music off, too late, or something else playing): the caller may try again. */
  restMusic: (plan: RestMusicPlan) => boolean;
}

function codeOf(error: unknown): string {
  const e = error as { code?: unknown; name?: string };
  return typeof e?.code === "number" || typeof e?.code === "string" ? String(e.code) : (e?.name ?? "unknown");
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));

export function createCampfireVoice(client: Client, options: { music?: boolean; now?: () => number } = {}): CampfireVoice {
  const now = options.now ?? Date.now;
  const music = options.music ?? true;
  let busy = false;
  let lastFocusChime = 0;
  const warned = new Set<string>();
  const warnOnce = (key: string, line: string) => {
    if (warned.has(key)) return;
    warned.add(key);
    console.warn(line);
  };

  /** Joins the channel, or null (no permission, not a voice channel, no answer). */
  async function join(channelId: string): Promise<VoiceConnection | null> {
    const channel = client.channels.cache.get(channelId);
    if (!channel || !channel.isVoiceBased()) return null;
    const me = channel.guild.members.me;
    if (!me || !channel.permissionsFor(me)?.has(["Connect", "Speak"])) {
      warnOnce(`perm:${channelId}`, `[shift-quests] campfire voice: no Connect/Speak in the coworking channel (${channelId}); rounds stay silent`);
      return null;
    }
    const connection = joinVoiceChannel({
      channelId,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false,
    });
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, JOIN_TIMEOUT_MS);
      return connection;
    } catch (error) {
      connection.destroy();
      throw error;
    }
  }

  async function playTo(player: AudioPlayer, file: string, timeoutMs: number): Promise<void> {
    player.play(createAudioResource(createReadStream(file), { inputType: StreamType.OggOpus }));
    await entersState(player, AudioPlayerStatus.Playing, JOIN_TIMEOUT_MS);
    await entersState(player, AudioPlayerStatus.Idle, timeoutMs);
  }

  /** Runs one session in the channel; nothing else plays until it ends. False when something already plays. */
  function session(label: string, channelId: string, run: (player: AudioPlayer) => Promise<void>): boolean {
    if (busy) return false;
    busy = true;
    void (async () => {
      let connection: VoiceConnection | null = null;
      try {
        connection = await join(channelId);
        if (!connection) return;
        const player = createAudioPlayer();
        connection.subscribe(player);
        await run(player);
        player.stop(true);
      } catch (error) {
        warnOnce(`${label}:${codeOf(error)}`, `[shift-quests] campfire voice: ${label} failed (${codeOf(error)})`);
      } finally {
        try {
          connection?.destroy();
        } catch {
          // Already destroyed.
        }
        busy = false;
      }
    })();
    return true;
  }

  return {
    chime(channelId, kind) {
      if (kind === "focus" && now() - lastFocusChime < CHIME_DEDUPE_MS) return;
      session(`${kind} chime`, channelId, async (player) => {
        if (kind === "focus") lastFocusChime = now();
        await playTo(player, SOUND_FILES[kind], CHIME_TIMEOUT_MS);
      });
    },

    restMusic(plan) {
      if (!music || now() > plan.startAt + MUSIC_LATE_MS) return false;
      return session("rest music", plan.channelId, async (player) => {
        await sleep(plan.startAt - now());
        // A slow join: too late to start the track and still end on its fade out.
        if (now() > plan.startAt + MUSIC_LATE_MS || !plan.stillWanted()) return;
        player.play(
          createAudioResource(createReadStream(plan.long ? SOUND_FILES.restLong : SOUND_FILES.restShort), {
            inputType: StreamType.OggOpus,
          })
        );
        await entersState(player, AudioPlayerStatus.Playing, JOIN_TIMEOUT_MS);
        while (now() < plan.endAt && player.state.status !== AudioPlayerStatus.Idle) {
          if (!plan.stillWanted()) return;
          await sleep(Math.min(WATCH_MS, plan.endAt - now()));
        }
        player.stop(true);
        if (!plan.stillWanted()) return;
        // The next focus starts now: its chime, on the connection already open.
        await sleep(plan.endAt - now());
        lastFocusChime = now();
        await playTo(player, SOUND_FILES.focus, CHIME_TIMEOUT_MS);
      });
    },
  };
}
