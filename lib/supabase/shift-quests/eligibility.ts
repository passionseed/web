/**
 * Who may play on the island: the same rule as the bot
 * (bot/src/quests/context.ts). Any staff role in the quest database passes;
 * otherwise the person must hold one of the student roles an admin configured
 * (settings.student_role_ids) in the SHIFT Discord server right now. Discord
 * server permissions alone never count. Pure, so it is easy to test.
 */

export const STAFF_ROLES = ["reviewer", "admin", "fulfillment"] as const;

export function isStaff(roles: readonly string[] | null | undefined): boolean {
  return (roles ?? []).some((role) => (STAFF_ROLES as readonly string[]).includes(role));
}

export function isEligible(input: {
  /** session.roles from shift_quest_session */
  sessionRoles: readonly string[] | null | undefined;
  /** session.settings.student_role_ids */
  studentRoleIds: readonly string[] | null | undefined;
  /** The member's Discord role ids in the SHIFT server. */
  memberRoleIds: readonly string[] | null | undefined;
}): boolean {
  if (isStaff(input.sessionRoles)) return true;
  const memberRoles = input.memberRoleIds ?? [];
  return (input.studentRoleIds ?? []).some((role) => memberRoles.includes(role));
}
