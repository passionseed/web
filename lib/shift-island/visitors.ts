/**
 * The plaza's visitors (schema 18, 20261118110000_shift_quest_island_visitors),
 * shared by the browser and the server: one small figure in the plaza for each
 * person who checked in today (the Bangkok day). The database returns two
 * integers only, the island's count and how many of the viewer's own team
 * came; the viewer's own figure comes from their own check-in, which the page
 * already has. Nobody else's name, picture or team ever reaches the page.
 *
 * Plan: docs/designs/shift-island-plaza-visitors.md.
 */

/** The quest schema with shift_quest_island_visitors. */
export const VISITORS_SCHEMA = 18;

/** shift_quest_island_visitors, checked: never negative, never fractional. */
export interface IslandVisitors {
  /** Everyone with a check-in today, the viewer included. */
  count: number;
  /** The viewer's active teammates among them, the viewer left out (0 without a project). */
  team: number;
}

const whole = (v: unknown): number | null => {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.max(0, Math.floor(v));
};

/**
 * The function's answer as the page carries it, or null when it is not two
 * whole numbers. A team larger than the island (it cannot be) is cut to the
 * count less one, so the figures never outnumber the people.
 */
export function visitorsFrom(raw: unknown): IslandVisitors | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const count = whole(row.count);
  const team = whole(row.team);
  if (count == null || team == null) return null;
  return { count, team: Math.min(team, Math.max(0, count - 1)) };
}

/**
 * The plaza's numbers for this viewer: the server's count, plus one when the
 * viewer's own figure is drawn (`me`) but the server's count does not hold
 * their check-in yet (`counted` false: it landed after the page loaded).
 * null without a server count: no figures, not even the viewer's own.
 */
export function visitorsNow(
  server: IslandVisitors | null | undefined,
  viewer: { me: boolean; counted: boolean },
): (IslandVisitors & { me: boolean }) | null {
  if (!server) return null;
  const { me } = viewer;
  const count = Math.max(server.count + (me && !viewer.counted ? 1 : 0), me ? 1 : 0);
  return { count, team: Math.min(server.team, Math.max(0, count - (me ? 1 : 0))), me };
}
