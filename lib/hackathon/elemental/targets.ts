/**
 * Every target and date the Elemental progress page measures against.
 *
 * Source: passionseed/company-brain (numbers.md and the hackathon canvas),
 * as of 2026-11-21. Change a target here and nowhere else.
 */

export type SeatCheckpoint = {
  /** Bangkok calendar date, inclusive: the count should be reached by the end of this day. */
  by: string;
  seats: number;
};

/** The people who own pipeline items and tasks. A fixed list, so filters and totals line up. */
export const OWNERS = ["Big", "Angpao", "Kirt"] as const;
export type Owner = (typeof OWNERS)[number];

export const ELEMENTAL_TARGETS = {
  event: { start: "2026-12-05", end: "2026-12-07" },
  /** Last day to sign up, Bangkok time (inclusive). */
  registrationClosesOn: "2026-12-04",

  seats: {
    target: 350,
    /**
     * Promotion started on this Bangkok day. The per-day strip, the run rate
     * and the forecast count from here.
     */
    paceStart: "2026-11-21",
    /**
     * The pace line is 0 at the end of the day before paceStart, so it
     * starts climbing on paceStart itself.
     */
    start: { by: "2026-11-20", seats: 0 } satisfies SeatCheckpoint,
    checkpoints: [
      { by: "2026-11-26", seats: 50 },
      { by: "2026-11-30", seats: 150 },
      { by: "2026-12-01", seats: 250 },
      { by: "2026-12-04", seats: 350 },
    ] satisfies SeatCheckpoint[],
  },

  sponsors: { signed: 3, by: "2026-11-30" },
  prizePoolBaht: 20000,
  /** One voice (speaker) with a yes for each of the five elements. */
  voices: { perElement: 1, elements: 5, by: "2026-11-30" },
} as const;
