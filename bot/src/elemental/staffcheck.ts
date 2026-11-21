import { Routes, type APIGuildMember } from "discord.js";

import { ElementalError } from "./api";
import type { ElementalRuntime, ElementalSettings } from "./context";
import { withRetry } from "./queue";
import { isStaff } from "./roles";

/**
 * Staff are never on a team (AGENTS.md safeguarding: no private adult-student
 * channel; Judges see no team chat). The person clicking is checked from the
 * interaction's own roles; everyone else a team op names (invitees, members
 * of a staff-made team, the member being moved) is looked up here, one REST
 * read per person (GET guild member: no privileged intent needed).
 *
 * The bot passes the ids it finds to SQL (p_staff_ids / p_is_staff), which
 * refuses them with el:staff_member, as it does any member row marked
 * is_staff. A lookup that fails refuses the op (el:roles_unavailable) rather
 * than letting an unchecked person through.
 */

/** Discord's "Unknown Member": the person is not in the server, so holds no role. */
const UNKNOWN_MEMBER = 10007;
const ATTEMPTS = 3;

export interface MemberRolesPort {
  /** The person's role ids in this guild, or null when they are not in it. Throws on any other failure. */
  roles(userId: string): Promise<string[] | null>;
}

export function discordMemberRolesPort(rt: ElementalRuntime, guildId: string): MemberRolesPort {
  return {
    async roles(userId) {
      try {
        const member = (await withRetry(() => rt.client.rest.get(Routes.guildMember(guildId, userId)), { maxAttempts: ATTEMPTS })) as APIGuildMember;
        return Array.isArray(member?.roles) ? member.roles : [];
      } catch (error) {
        const e = error as { code?: unknown; status?: number } | null;
        if (e?.code === UNKNOWN_MEMBER || e?.status === 404) return null;
        throw error;
      }
    },
  };
}

/** Tests swap the Discord side for a fake, per runtime. */
const PORTS = new WeakMap<ElementalRuntime, (guildId: string) => MemberRolesPort>();

export function setMemberRolesPortFactory(rt: ElementalRuntime, factory: ((guildId: string) => MemberRolesPort) | null): void {
  if (factory) PORTS.set(rt, factory);
  else PORTS.delete(rt);
}

export function memberRolesPort(rt: ElementalRuntime, guildId: string): MemberRolesPort {
  const factory = PORTS.get(rt);
  return factory ? factory(guildId) : discordMemberRolesPort(rt, guildId);
}

/**
 * The ids among userIds that hold a staff role in this guild, in the order
 * given. Throws ElementalError('roles_unavailable') when a lookup fails.
 */
export async function staffIdsAmong(
  rt: ElementalRuntime,
  guildId: string,
  settings: ElementalSettings,
  userIds: readonly string[]
): Promise<string[]> {
  const port = memberRolesPort(rt, guildId);
  const unique = [...new Set(userIds)];
  let roles: (string[] | null)[];
  try {
    roles = await Promise.all(unique.map((id) => port.roles(id)));
  } catch (error) {
    const e = error as { status?: number; name?: string } | null;
    console.error(`[elemental] staff check: roles not read (${e?.status ?? e?.name ?? "error"})`);
    throw new ElementalError("roles_unavailable");
  }
  return unique.filter((_, k) => isStaff(roles[k] ?? [], settings));
}
