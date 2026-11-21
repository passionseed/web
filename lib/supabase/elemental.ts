import "server-only";

import { isElementKey, type ElementKey } from "@/lib/elemental/core/elements";
import { fullHealth, healthFor, type ElementHealth, type HealthSettings } from "@/lib/elemental/island/healing";
import { ELEMENTAL_SLOTS, SECTOR_ORDER } from "@/lib/elemental/island/sectors";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * The Elemental island for the public page (/hackathon/island) and its PNG
 * route. Reads elemental_island_public (service_role only, E09) with the
 * service-role client, like lib/supabase/hackathon-event-registrations.ts.
 *
 * Public by design: each plot is a slot, an element, a project name, a count,
 * a lantern and a badge count. The SQL function returns nothing else, and
 * this file copies its columns field by field, so a column added later never
 * reaches a page until it is named here. No ids, no people.
 */

/** The real hackathon edition (components/hackathon/poster/elemental/facts.ts slug). */
export const ELEMENTAL_EVENT_EDITION = "elemental-2026";

/** Editions the page may show: the event, and the rehearsal guild's dry run. */
export const ELEMENTAL_PUBLIC_EDITIONS = [ELEMENTAL_EVENT_EDITION, "elemental-dryrun"] as const;
export type ElementalPublicEdition = (typeof ELEMENTAL_PUBLIC_EDITIONS)[number];

/** The ?edition value if it is one the page may show, else the event edition. */
export function resolvePublicEdition(value: unknown): ElementalPublicEdition {
  return (ELEMENTAL_PUBLIC_EDITIONS as readonly unknown[]).includes(value)
    ? (value as ElementalPublicEdition)
    : ELEMENTAL_EVENT_EDITION;
}

/** One live team's plot, as the public may see it. */
export interface ElementalPublicPlot {
  slot: number;
  element: ElementKey;
  projectName: string;
  /** Counted tester entries. */
  counted: number;
  lit: boolean;
  /** How many badges the team has earned. */
  badges: number;
}

export interface ElementalPublicIsland {
  edition: ElementalPublicEdition;
  /** Live teams in slot order. Empty before teams form: the island is the plaza alone. */
  plots: ElementalPublicPlot[];
  /** Each sector's health for the picture (healing.ts), all 1 while healing is off. */
  health: ElementHealth;
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/**
 * One row of elemental_island_public, read field by field. A row that could
 * not be drawn (no slot, an unknown element) is dropped rather than breaking
 * the page; the log line names the field, never the row's text.
 */
export function toPublicPlot(row: unknown): ElementalPublicPlot | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const slot = r.slot;
  if (typeof slot !== "number" || !Number.isInteger(slot) || slot < 1 || slot > ELEMENTAL_SLOTS) {
    console.error("[elemental-island] dropped a row: slot");
    return null;
  }
  if (!isElementKey(r.element)) {
    console.error(`[elemental-island] dropped a row: element (slot ${slot})`);
    return null;
  }
  return {
    slot,
    element: r.element,
    projectName: typeof r.project_name === "string" ? r.project_name : "",
    counted: count(r.counted),
    lit: r.lit === true,
    badges: Array.isArray(r.badges) ? r.badges.length : 0,
  };
}

/** Live teams' plots, in slot order with no repeated slot. */
export function toPublicPlots(rows: unknown): ElementalPublicPlot[] {
  const seen = new Set<number>();
  const plots: ElementalPublicPlot[] = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const plot = toPublicPlot(row);
    if (!plot || seen.has(plot.slot)) continue;
    seen.add(plot.slot);
    plots.push(plot);
  }
  return plots.sort((a, b) => a.slot - b.slot);
}

/** Healing input from the plots: counted entries and live teams per element (as elemental_bot_totals counts them). */
export function healthOf(plots: readonly ElementalPublicPlot[], settings: HealthSettings | null): ElementHealth {
  if (!settings) return fullHealth();
  const totals = Object.fromEntries(SECTOR_ORDER.map((e) => [e, { counted: 0, teams: 0 }])) as Record<
    ElementKey,
    { counted: number; teams: number }
  >;
  for (const p of plots) {
    totals[p.element].counted += p.counted;
    totals[p.element].teams += 1;
  }
  return healthFor(totals, settings);
}

/** The guild's healing settings for the edition (one guild per edition), or null when unknown or unreadable. */
async function healingSettings(
  db: ReturnType<typeof createAdminClient>,
  edition: ElementalPublicEdition
): Promise<HealthSettings | null> {
  const { data, error } = await db
    .from("elemental_settings")
    .select("healing_enabled, heal_per_team, heal_steps")
    .eq("edition", edition)
    .maybeSingle();
  if (error || !data) return null;
  return {
    healing_enabled: data.healing_enabled === true,
    heal_per_team: typeof data.heal_per_team === "number" ? data.heal_per_team : null,
    heal_steps: typeof data.heal_steps === "number" ? data.heal_steps : null,
  };
}

/**
 * The island for an edition, or null when it cannot be read (the migration is
 * not applied yet, env vars are missing, the database is down). One log line
 * with a code, never row data.
 */
export async function getElementalPublicIsland(edition: ElementalPublicEdition): Promise<ElementalPublicIsland | null> {
  try {
    const db = createAdminClient();
    const [{ data, error }, settings] = await Promise.all([
      db.rpc("elemental_island_public", { p_edition: edition }),
      healingSettings(db, edition).catch(() => null),
    ]);
    if (error) {
      console.error(`[elemental-island] elemental_island_public failed: ${error.code ?? "unknown"}`);
      return null;
    }
    const plots = toPublicPlots(data);
    return { edition, plots, health: healthOf(plots, settings) };
  } catch (error) {
    console.error(`[elemental-island] read failed: ${error instanceof Error ? error.name : "unknown"}`);
    return null;
  }
}
