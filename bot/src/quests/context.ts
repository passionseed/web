import type { GuildMember, Interaction } from "discord.js";

import type { QuestApi, Session } from "./api";
import { T } from "./copy";
import { GateError } from "./ui";

/** Who is asking, resolved once per interaction. */
export interface Ctx {
  api: QuestApi;
  userId: string;
  name: string;
  /** Discord role IDs the person holds in the SHIFT server right now. */
  memberRoleIds: string[];
  session: Session;
  /**
   * The coworking voice channel and how many sit in it now (campfire.ts's
   * status), for the campfire on /island's picture; absent when the campfire
   * is not running (schema below 7, or tests).
   */
  campfire?: () => { channel: string | null; sitters: number };
}

export function displayName(i: Interaction): string {
  const member = i.member as GuildMember | { nick?: string | null } | null;
  if (member && "displayName" in member && typeof member.displayName === "string") return member.displayName;
  if (member && "nick" in member && member.nick) return member.nick;
  return i.user.globalName ?? i.user.username;
}

export function memberRoleIds(i: Interaction): string[] {
  const member = i.member as GuildMember | { roles: string[] } | null;
  if (!member) return [];
  if (Array.isArray(member.roles)) return member.roles;
  return [...(member as GuildMember).roles.cache.keys()];
}

export async function loadCtx(api: QuestApi, i: Interaction, extras: Pick<Ctx, "campfire"> = {}): Promise<Ctx> {
  const name = displayName(i);
  const session = await api.call<Session>("shift_quest_session", i.user.id, name);
  return { api, userId: i.user.id, name, memberRoleIds: memberRoleIds(i), session, ...extras };
}

export function isStaff(ctx: Ctx, roles: string[] = ["reviewer", "admin", "fulfillment"]): boolean {
  return ctx.session.roles.some((role) => roles.includes(role));
}

/**
 * Pilot eligibility: a student role an admin configured, or any staff role.
 * Discord server permissions alone never count.
 */
export function isEligible(ctx: Ctx): boolean {
  if (isStaff(ctx)) return true;
  return ctx.session.settings.student_role_ids.some((role) => ctx.memberRoleIds.includes(role));
}

export function requireEligible(ctx: Ctx): void {
  if (isEligible(ctx)) return;
  throw new GateError(ctx.session.settings.student_role_ids.length ? T.notEligible : T.pilotClosed);
}

export function requireStudent(ctx: Ctx): void {
  requireEligible(ctx);
  if (!ctx.session.onboarded) throw new GateError(T.notStarted);
}

/** Data rights and private notices outlive the pilot: any known member. */
export function requireMember(ctx: Ctx): void {
  if (!ctx.session.member_id) throw new GateError(T.notStarted);
}

export function requireStaff(ctx: Ctx, roles: string[]): void {
  if (!isStaff(ctx, roles)) throw new GateError(T.staffOnly);
}
