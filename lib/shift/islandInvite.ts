import type { AlumniMemberStatus } from "@/lib/shift/alumniMember";
import type { IslandSeasonPhase } from "@/lib/content/shift-island";

/**
 * Who is looking at the SHIFT High Island invite, and what they may do.
 * Pure on purpose (no Supabase or server imports) so the alumni gate is
 * unit-testable.
 */

export interface IslandTicket {
  nickname: string;
  cohort: string;
}

export type IslandViewer =
  | { kind: "signedOut" }
  | { kind: "notAlumni" }
  | { kind: "closed" }
  | { kind: "canRsvp" }
  | { kind: "going"; ticket: IslandTicket; discordUrl: string | null };

export interface IslandViewerInput {
  user: { anonymous: boolean } | null;
  isAdmin: boolean;
  member: { nickname: string; cohort: string; status: AlumniMemberStatus } | null;
  linkedApplication: { nickname: string; cohort: string } | null;
  rsvp: boolean;
  phase: IslandSeasonPhase;
}

export const MENTOR_TICKET: IslandTicket = { nickname: "พี่เลี้ยง", cohort: "SHIFT High" };

function isAlumni(input: IslandViewerInput): boolean {
  if (input.isAdmin) return true;
  // A member record decides on its own: a declined account stays out even
  // when a paid application is linked.
  if (input.member) return input.member.status !== "declined";
  return input.linkedApplication !== null;
}

function ticketFor(input: IslandViewerInput): IslandTicket {
  const source = input.member ?? input.linkedApplication;
  if (source) return { nickname: source.nickname, cohort: source.cohort };
  return MENTOR_TICKET;
}

export function islandViewer(input: IslandViewerInput, discordUrl: string | null): IslandViewer {
  if (!input.user || input.user.anonymous) return { kind: "signedOut" };
  if (!isAlumni(input)) return { kind: "notAlumni" };
  if (input.rsvp) return { kind: "going", ticket: ticketFor(input), discordUrl };
  if (input.phase === "after") return { kind: "closed" };
  return { kind: "canRsvp" };
}

/** Island channel, else the SHIFT server, else the public invite, else nothing. */
export function islandDiscordUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  const channel = env.DISCORD_SHIFT_ISLAND_CHANNEL_URL;
  if (channel) return channel;
  const guildId = env.DISCORD_SHIFT_GUILD_ID;
  if (guildId) return `https://discord.com/channels/${guildId}`;
  return env.DISCORD_SHIFT_INVITE_URL || null;
}
