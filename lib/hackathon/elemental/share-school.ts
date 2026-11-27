import "server-only";

import { z } from "zod";

import { findSchool } from "./schools";
import { customSchoolKey, foldSchoolName } from "./share";
import { isRudeTeamName } from "./team-name";

/**
 * The school a student or teacher picked: a key from the open-data list, or
 * a name typed because it isn't on it. Shared by the student and teacher routes.
 */
export const schoolBody = z.union([
  z.object({ schoolKey: z.string().regex(/^(obec|bma|opec|satit|dla):[0-9a-z]{1,20}$/) }),
  z.object({ customName: z.string().trim().min(2).max(120), province: z.string().trim().max(60).optional() }),
]);
export type SchoolBody = z.infer<typeof schoolBody>;

export const stripSchoolPrefix = (name: string) => name.replace(/^(โรงเรียน|รร\.?)\s*/, "").trim();

/** The school to store, or null when the key isn't on the list or a typed name is too short or rude. */
export async function resolveSchool(body: SchoolBody): Promise<{ key: string; name: string; province: string | null } | null> {
  if ("schoolKey" in body) {
    const row = await findSchool(body.schoolKey);
    return row ? { key: row[0], name: row[1], province: row[2] || null } : null;
  }
  const name = stripSchoolPrefix(body.customName);
  const province = body.province?.trim() || null;
  if (foldSchoolName(name).length < 2 || isRudeTeamName(name) || (province && isRudeTeamName(province))) return null;
  return { key: customSchoolKey(name), name, province };
}
