/**
 * Component and modal custom IDs: "el|<action>|<arg>|<arg>". Discord caps
 * them at 100 characters. They carry IDs only (a team UUID, an entry id, a
 * slot), never student text, and every action re-checks rights in the
 * database, so a forged ID gets the same answer as a stale one.
 *
 * SHIFT High uses "sq|"; anything without the "el" prefix belongs to someone
 * else and is ignored.
 */
const PREFIX = "el";
const SEP = "|";
const MAX = 100;
const ACTION = /^[a-z][a-z0-9_]*$/;

export type CidArg = string | number | null | undefined;

export function cid(action: string, ...args: CidArg[]): string {
  if (!ACTION.test(action)) throw new Error(`custom id action must be lowercase: ${action}`);
  const parts = args.map((a) => String(a ?? ""));
  if (parts.some((part) => part.includes(SEP))) throw new Error(`custom id arg contains a separator (${action})`);
  const id = [PREFIX, action, ...parts].join(SEP);
  if (id.length > MAX) throw new Error(`custom id too long for ${action}`);
  return id;
}

export interface ParsedId {
  action: string;
  args: string[];
}

export function parseCid(id: string | null | undefined): ParsedId | null {
  if (typeof id !== "string" || id.length > MAX) return null;
  const parts = id.split(SEP);
  if (parts[0] !== PREFIX || parts.length < 2 || !ACTION.test(parts[1])) return null;
  return { action: parts[1], args: parts.slice(2) };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SNOWFLAKE = /^\d{17,20}$/;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function isSnowflake(value: unknown): value is string {
  return typeof value === "string" && SNOWFLAKE.test(value);
}
