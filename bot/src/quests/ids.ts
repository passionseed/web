/**
 * Component custom IDs: "sq|<action>|<arg>|<arg>". Discord caps them at 100
 * characters, enough for an action and two UUIDs. They carry IDs only, never
 * student text, and every action re-checks rights in the database: a forged
 * ID gets the same answer as a stale one.
 */
const PREFIX = "sq";
const SEP = "|";

export function cid(action: string, ...args: (string | number | null | undefined)[]): string {
  const parts = args.map((a) => String(a ?? ""));
  const id = [PREFIX, action, ...parts].join(SEP);
  if (id.length > 100) throw new Error(`custom id too long for ${action}`);
  if (parts.some((part) => part.includes(SEP))) throw new Error(`custom id arg contains a separator (${action})`);
  return id;
}

export interface ParsedId {
  action: string;
  args: string[];
}

export function parseCid(id: string): ParsedId | null {
  const parts = id.split(SEP);
  if (parts[0] !== PREFIX || parts.length < 2 || !parts[1]) return null;
  return { action: parts[1], args: parts.slice(2) };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | undefined): value is string {
  return typeof value === "string" && UUID.test(value);
}
