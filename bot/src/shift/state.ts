/**
 * Pure voice-state helpers for SHIFT tracking, kept free of discord.js objects
 * so they can be tested with plain data.
 */

/** The parts of a Discord voice state the tracker reads. */
export interface RawVoiceState {
  channelId: string | null;
  channelName: string | null;
  selfMute: boolean | null;
  selfDeaf: boolean | null;
  serverMute: boolean | null;
  serverDeaf: boolean | null;
  streaming: boolean | null;
  selfVideo: boolean | null;
}

/** What one row of shift_voice_spans records. */
export interface VoiceFlags {
  channelId: string | null;
  channelName: string | null;
  micOpen: boolean;
  streaming: boolean;
  camera: boolean;
}

export const NOT_IN_VOICE: VoiceFlags = {
  channelId: null,
  channelName: null,
  micOpen: false,
  streaming: false,
  camera: false,
};

/**
 * The server's AFK channel counts as not in voice: Discord moves idle people
 * there, and sitting in it is not taking part.
 */
export function toFlags(state: RawVoiceState, afkChannelId: string | null): VoiceFlags {
  if (!state.channelId || state.channelId === afkChannelId) return NOT_IN_VOICE;
  const muted = Boolean(state.selfMute || state.selfDeaf || state.serverMute || state.serverDeaf);
  return {
    channelId: state.channelId,
    channelName: state.channelName,
    micOpen: !muted,
    streaming: Boolean(state.streaming),
    camera: Boolean(state.selfVideo),
  };
}

/**
 * Whether a voice state update changes anything recorded. Deafen without a
 * mute change, suppress and request-to-speak all fire the same gateway event;
 * a channel rename does not matter either.
 */
export function flagsChanged(before: VoiceFlags, after: VoiceFlags): boolean {
  return (
    before.channelId !== after.channelId ||
    before.micOpen !== after.micOpen ||
    before.streaming !== after.streaming ||
    before.camera !== after.camera
  );
}

const SHIFT_ROLE = /^SHIFT\[(\d+)\]$/;

/**
 * The round a member belongs to by Discord role, for students who joined the
 * server by invite and never linked an application. Only rounds in session
 * count; with several, the newest round wins.
 */
export function roundFromRoles(roleNames: Iterable<string>, inSession: ReadonlySet<string>): string | null {
  let best: { name: string; round: number } | null = null;
  for (const name of roleNames) {
    const match = SHIFT_ROLE.exec(name);
    if (!match || !inSession.has(name)) continue;
    const round = Number(match[1]);
    if (!best || round > best.round) best = { name, round };
  }
  return best?.name ?? null;
}
