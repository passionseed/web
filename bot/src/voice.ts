import type { Client, VoiceState } from "discord.js";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { BotEnv } from "./env";
import { closeAllVoiceSessions, voiceJoin, voiceLeave } from "./db";

function isTracked(env: BotEnv, channelId: string | null): boolean {
  if (!channelId) return false;
  if (env.voiceChannelIds.length === 0) return true;
  return env.voiceChannelIds.includes(channelId);
}

/**
 * Turns Discord voice state into session rows.
 *
 * `voiceStateUpdate` fires for far more than join and leave — mute, deafen,
 * stream, and camera all produce an event with the same channel on both sides.
 * Only a change of channel is presence, so everything else is ignored rather
 * than recorded as a leave immediately followed by a join.
 */
export function registerVoiceTracking(
  client: Client,
  db: SupabaseClient,
  env: BotEnv,
  cohortId: string
): void {
  client.on("voiceStateUpdate", async (oldState: VoiceState, newState: VoiceState) => {
    // The same bot can sit in the SHIFT server too; only this guild is ProjectSeed.
    if (newState.guild.id !== env.guildId) return;
    const userId = newState.id ?? oldState.id;
    if (!userId) return;
    if (newState.member?.user.bot) return;

    const before = oldState.channelId;
    const after = newState.channelId;
    if (before === after) return;

    try {
      const leftTracked = isTracked(env, before);
      const joinedTracked = isTracked(env, after);

      // A move between two tracked channels closes the old session and opens a
      // new one, so time is attributed to the channel it was actually spent in.
      if (joinedTracked && after) {
        await voiceJoin(db, cohortId, userId, after);
      } else if (leftTracked) {
        await voiceLeave(db, userId);
      }
    } catch (error) {
      console.error("[voice] state update failed:", error);
    }
  });
}

/**
 * Reconciles the database with reality at startup.
 *
 * While the process was down no leave events arrived, so any session still open
 * would keep accruing time nobody was present for. Closing everything first and
 * then re-opening for whoever is genuinely in voice right now is the only
 * version of this that cannot inflate someone's hours.
 */
export async function reconcileVoiceState(
  client: Client,
  db: SupabaseClient,
  env: BotEnv,
  cohortId: string
): Promise<void> {
  const closed = await closeAllVoiceSessions(db, cohortId);
  if (closed > 0) {
    console.log(`[voice] closed ${closed} stale session(s) from a previous run`);
  }

  const guild = await client.guilds.fetch(env.guildId);
  const channels = await guild.channels.fetch();
  let reopened = 0;

  for (const channel of channels.values()) {
    if (!channel?.isVoiceBased()) continue;
    if (!isTracked(env, channel.id)) continue;

    for (const member of channel.members.values()) {
      if (member.user.bot) continue;
      await voiceJoin(db, cohortId, member.id, channel.id);
      reopened += 1;
    }
  }

  if (reopened > 0) {
    console.log(`[voice] re-opened ${reopened} session(s) for people already in voice`);
  }
}
