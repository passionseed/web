/**
 * The campfire's chime: when a round's focus or rest starts, the bot steps
 * into the coworking voice channel, plays a short sound everyone at the fire
 * hears, and leaves. It says nothing and names no one; the round message in
 * the channel's chat carries the words (🎯 ตั้งเป้ารอบนี้).
 *
 * The files are Ogg Opus (bot/assets/sounds), so they go to Discord as they
 * are: no encoder and no ffmpeg in the image. The bot is a bot, so the
 * campfire and voice participation never count it as a sitter
 * (campfire.ts, bot/src/shift/voice.ts).
 *
 * Never throws and never blocks the round loop. Off with SHIFT_ROUND_CHIME=off.
 * Needs Connect and Speak in the coworking channel; without them it warns
 * once per cause and the rounds carry on silently.
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
  type VoiceConnection,
} from "@discordjs/voice";
import type { Client } from "discord.js";

export type ChimeKind = "focus" | "rest";

const SOUNDS: Record<ChimeKind, string> = {
  focus: path.join(__dirname, "..", "..", "assets", "sounds", "focus.ogg"),
  rest: path.join(__dirname, "..", "..", "assets", "sounds", "rest.ogg"),
};

/** How long joining, and then playing, may take before the bot gives up and leaves. */
const JOIN_TIMEOUT_MS = 10_000;
const PLAY_TIMEOUT_MS = 15_000;

export function chimeEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.SHIFT_ROUND_CHIME ?? "").trim().toLowerCase() !== "off";
}

export type Chime = (channelId: string, kind: ChimeKind) => void;

function codeOf(error: unknown): string {
  const e = error as { code?: unknown; name?: string };
  return typeof e?.code === "number" || typeof e?.code === "string" ? String(e.code) : (e?.name ?? "unknown");
}

/** A chime player for this client: one sound at a time, extra calls while one plays are dropped. */
export function createChime(client: Client): Chime {
  let playing = false;
  const warned = new Set<string>();
  const warnOnce = (key: string, line: string) => {
    if (warned.has(key)) return;
    warned.add(key);
    console.warn(line);
  };

  async function play(channelId: string, kind: ChimeKind): Promise<void> {
    const channel = client.channels.cache.get(channelId);
    if (!channel || !channel.isVoiceBased()) return;
    const me = channel.guild.members.me;
    const perms = me ? channel.permissionsFor(me) : null;
    if (!perms?.has(["Connect", "Speak"])) {
      warnOnce(`perm:${channelId}`, `[shift-quests] chime: no Connect/Speak in the coworking channel (${channelId}); rounds stay silent`);
      return;
    }

    let connection: VoiceConnection | null = null;
    try {
      connection = joinVoiceChannel({
        channelId,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: false,
      });
      await entersState(connection, VoiceConnectionStatus.Ready, JOIN_TIMEOUT_MS);
      const player = createAudioPlayer();
      connection.subscribe(player);
      player.play(createAudioResource(createReadStream(SOUNDS[kind]), { inputType: StreamType.OggOpus }));
      await entersState(player, AudioPlayerStatus.Playing, JOIN_TIMEOUT_MS);
      await entersState(player, AudioPlayerStatus.Idle, PLAY_TIMEOUT_MS);
      player.stop(true);
    } catch (error) {
      warnOnce(`play:${codeOf(error)}`, `[shift-quests] chime: ${kind} failed (${codeOf(error)})`);
    } finally {
      try {
        connection?.destroy();
      } catch {
        // Already destroyed.
      }
    }
  }

  return (channelId, kind) => {
    if (playing) return;
    playing = true;
    void play(channelId, kind).finally(() => {
      playing = false;
    });
  };
}
