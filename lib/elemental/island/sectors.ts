/**
 * The Elemental island's element sectors: 200 plot slots cut into 5 wedges
 * around the plaza, one per element, clockwise from north in the fixed
 * element order. The split lives in slot-pool.json, written by
 * scripts/elemental/gen-slot-pool.ts from SHIFT's fixed slot spots; a jest
 * test keeps the file equal to the generator's output.
 *
 * A team's slot never moves once given (SQL owns the assignment:
 * elemental_bot_team_accept takes the candidate list from candidateSlots and
 * gives the first free one). Pure TypeScript with no imports outside
 * lib/elemental, so the bot and the web share it.
 */
import pool from "./slot-pool.json";

/** Fixed element order, and the clockwise sector order from north. Equal to core/elements ELEMENT_KEYS (jest parity test). */
export const SECTOR_ORDER = ["water", "earth", "air", "fire", "aether"] as const;
export type SectorElement = (typeof SECTOR_ORDER)[number];

/** Slots on the Elemental island: 1..ELEMENTAL_SLOTS. */
export const ELEMENTAL_SLOTS = 200;

export interface SlotPool {
  v: 1;
  slots: number;
  order: readonly SectorElement[];
  /** Half-width and half-height of the land in tiles (landscape): the scale of the sector angle. */
  axes: { ax: number; ay: number };
  /** Where each sector starts, in degrees clockwise from north; sector k spans [starts[k], starts[k + 1]). */
  starts: readonly number[];
  /** Each sector's slots, nearest the plaza first. */
  sectors: Readonly<Record<SectorElement, readonly number[]>>;
  /** Each element's whole slot preference: its sector, then every other slot by distance to the sector. */
  preference: Readonly<Record<SectorElement, readonly number[]>>;
}

function isElement(value: unknown): value is SectorElement {
  return typeof value === "string" && (SECTOR_ORDER as readonly string[]).includes(value);
}

/** Checks the JSON once at load, so a hand-edited or stale file fails loudly instead of misplacing teams. */
function checkPool(raw: typeof pool): SlotPool {
  const fail = (why: string): never => {
    throw new Error(`slot-pool.json is invalid: ${why}`);
  };
  if (raw.v !== 1 || raw.slots !== ELEMENTAL_SLOTS) fail("version or slot count");
  if (raw.order.length !== SECTOR_ORDER.length || raw.order.some((e, k) => e !== SECTOR_ORDER[k])) fail("element order");
  if (raw.starts.length !== SECTOR_ORDER.length) fail("sector starts");
  const sectors = raw.sectors as Record<string, number[]>;
  const preference = raw.preference as Record<string, number[]>;
  const seen = new Set<number>();
  for (const element of SECTOR_ORDER) {
    for (const slot of sectors[element] ?? fail(`no ${element} sector`)) {
      if (!Number.isInteger(slot) || slot < 1 || slot > ELEMENTAL_SLOTS || seen.has(slot)) fail(`slot ${slot}`);
      seen.add(slot);
    }
    const prefs = preference[element] ?? fail(`no ${element} preference`);
    if (prefs.length !== ELEMENTAL_SLOTS || new Set(prefs).size !== ELEMENTAL_SLOTS) fail(`${element} preference`);
    if (prefs.some((slot) => !Number.isInteger(slot) || slot < 1 || slot > ELEMENTAL_SLOTS)) fail(`${element} preference slot`);
    // A team fills its own sector before it overflows.
    if (sectors[element].some((slot, k) => prefs[k] !== slot)) fail(`${element} preference does not start with its sector`);
  }
  if (seen.size !== ELEMENTAL_SLOTS) fail("sectors do not cover every slot");
  return raw as unknown as SlotPool;
}

export const SLOT_POOL: SlotPool = checkPool(pool);

const SECTOR_BY_SLOT: ReadonlyMap<number, SectorElement> = new Map(
  SECTOR_ORDER.flatMap((element) => SLOT_POOL.sectors[element].map((slot) => [slot, element] as const))
);

/** The sector a slot sits in, or null outside 1..200. */
export function sectorOf(slot: number): SectorElement | null {
  return SECTOR_BY_SLOT.get(slot) ?? null;
}

/** An element's own slots, nearest the plaza first. */
export function sectorSlots(element: SectorElement): readonly number[] {
  if (!isElement(element)) throw new Error("unknown element");
  return SLOT_POOL.sectors[element];
}

/**
 * The free slots a new team of this element should take, best first: its own
 * sector's free slots nearest the plaza first, then the free slots nearest
 * that sector anywhere else. Never a taken slot, never above 200; empty only
 * when the island is full.
 */
export function candidateSlots(element: SectorElement, takenSlots: Iterable<number> = []): number[] {
  if (!isElement(element)) throw new Error("unknown element");
  const taken = new Set(takenSlots);
  return SLOT_POOL.preference[element].filter((slot) => !taken.has(slot));
}

/**
 * The sector a point on the land falls in, by angle from the plaza centre:
 * dx and dy in tiles from the plaza centre on the LANDSCAPE island (y grows
 * down; fractions allowed). For sector masks (healing states); a plot's own
 * sector comes from sectorOf. The plaza centre itself counts as the first.
 */
export function sectorAtOffset(dx: number, dy: number): SectorElement {
  const { ax, ay } = SLOT_POOL.axes;
  let deg = (Math.atan2(dx / ax, -dy / ay) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  let k = 0;
  for (let i = 1; i < SLOT_POOL.starts.length; i++) if (deg >= SLOT_POOL.starts[i]) k = i;
  return SECTOR_ORDER[k];
}
