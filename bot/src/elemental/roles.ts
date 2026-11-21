import type { ElementalSettings } from "./context";
import { COMMON } from "./copy/common";

/**
 * Discord roles, read from the guild's settings row (never hardcoded IDs):
 *
 * - Host: every tool, every space.
 * - Helper and Mentor: team channels and the tester mirror.
 * - Judge: no team channels, no mirror, refused by every staff tool.
 * - Safety: Angpao plus a second staff member; the #reports channel.
 * - Paid: a claimed student (/join); every channel but #start-here needs it.
 * - One role per element.
 *
 * Gates are a convenience in front of SQL, which re-checks what matters.
 */

/** Fixed order; must match lib/elemental/core/elements.ts ELEMENT_KEYS (E02). */
export const ELEMENTS = ["water", "earth", "air", "fire", "aether"] as const;
export type ElementKey = (typeof ELEMENTS)[number];

export const STAFF_ROLES = ["host", "helper", "mentor", "judge", "safety"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export type RoleKey = StaffRole | "paid" | ElementKey;

/** Staff roles a team's private channel allows besides its members and the bot. Never Judge. */
export const TEAM_CHANNEL_STAFF: readonly StaffRole[] = ["host", "helper", "mentor"];
/** Staff roles that see the tester mirror threads. */
export const MIRROR_STAFF: readonly StaffRole[] = ["host", "helper", "mentor"];
/** Staff roles that read and handle #reports. */
export const REPORT_STAFF: readonly StaffRole[] = ["host", "safety"];

/** A gate refused: the message is safe to show the person, ephemerally. */
export class GateError extends Error {
  constructor(message: string = COMMON.staffOnly) {
    super(message);
    this.name = "GateError";
  }
}

export function isElement(value: unknown): value is ElementKey {
  return typeof value === "string" && (ELEMENTS as readonly string[]).includes(value);
}

/** The Discord role ID for key in this guild, or null when staff have not set it. */
export function roleId(settings: ElementalSettings, key: RoleKey): string | null {
  return settings.roles[key] ?? null;
}

export function holds(memberRoleIds: readonly string[], settings: ElementalSettings, key: RoleKey): boolean {
  const id = roleId(settings, key);
  return id !== null && memberRoleIds.includes(id);
}

export function staffRolesOf(memberRoleIds: readonly string[], settings: ElementalSettings): StaffRole[] {
  return STAFF_ROLES.filter((key) => holds(memberRoleIds, settings, key));
}

export function isHost(memberRoleIds: readonly string[], settings: ElementalSettings): boolean {
  return holds(memberRoleIds, settings, "host");
}

/** Host always passes; otherwise the person must hold one of gate. Judge passes only where listed. */
export function allowed(memberRoleIds: readonly string[], settings: ElementalSettings, gate: readonly StaffRole[]): boolean {
  if (isHost(memberRoleIds, settings)) return true;
  return gate.some((key) => holds(memberRoleIds, settings, key));
}

export interface RoleHolder {
  memberRoleIds: readonly string[];
  settings: ElementalSettings;
}

export function requireRole(who: RoleHolder, gate: readonly StaffRole[]): void {
  if (!allowed(who.memberRoleIds, who.settings, gate)) throw new GateError(COMMON.staffOnly);
}

export function isPaid(memberRoleIds: readonly string[], settings: ElementalSettings): boolean {
  return holds(memberRoleIds, settings, "paid");
}

/** Paid students and any staff role except Judge. */
export function requirePaid(who: RoleHolder): void {
  if (isPaid(who.memberRoleIds, who.settings)) return;
  if (allowed(who.memberRoleIds, who.settings, ["helper", "mentor", "safety"])) return;
  throw new GateError(COMMON.paidOnly);
}

/** Element role IDs that are set, in fixed element order. */
export function elementRoleIds(settings: ElementalSettings): { element: ElementKey; roleId: string }[] {
  return ELEMENTS.flatMap((element) => {
    const id = roleId(settings, element);
    return id ? [{ element, roleId: id }] : [];
  });
}

/** The element role the member holds, first in fixed order, or null. */
export function elementOf(memberRoleIds: readonly string[], settings: ElementalSettings): ElementKey | null {
  return elementRoleIds(settings).find((e) => memberRoleIds.includes(e.roleId))?.element ?? null;
}
