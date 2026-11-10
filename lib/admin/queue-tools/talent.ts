import {
  pickOption,
  readParam,
  readUuidParam,
  withQuery,
  type ParamSource,
} from "@/lib/admin/queue-tools/url";

/**
 * URL state for /admin/talent. Client-safe.
 *   ?filter=unverified  signups still hidden from hirers
 *   ?id=<uuid>          signup to scroll to and highlight
 */

export const TALENT_PATH = "/admin/talent";

export const TALENT_FILTERS = ["all", "unverified"] as const;
export type TalentFilter = (typeof TALENT_FILTERS)[number];

export interface TalentView {
  filter: TalentFilter;
  id: string | null;
}

export function parseTalentView(source: ParamSource): TalentView {
  return {
    filter: pickOption(readParam(source, "filter"), TALENT_FILTERS, "all"),
    id: readUuidParam(source, "id"),
  };
}

export function talentHref(view: Partial<TalentView>): string {
  return withQuery(TALENT_PATH, {
    filter: view.filter === "all" ? null : view.filter,
    id: view.id,
  });
}

/** `verified` is nullable in the table, so anything but true is unverified. */
export function isUnverifiedTalent(signup: { verified: boolean | null }): boolean {
  return signup.verified !== true;
}

/**
 * Signups a view shows. A highlighted signup stays visible even when the
 * filter would hide it, so a deep link always lands on its row.
 */
export function visibleTalentSignups<T extends { id: string; verified: boolean | null }>(
  signups: readonly T[],
  view: TalentView,
): T[] {
  if (view.filter === "all") return [...signups];
  return signups.filter((s) => isUnverifiedTalent(s) || s.id === view.id);
}

/** DOM id for a signup row, the scroll target for ?id=. */
export function talentRowId(id: string): string {
  return `talent-signup-${id}`;
}
