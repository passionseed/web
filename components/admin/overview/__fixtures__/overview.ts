import type {
  AdminQueueCount,
  AdminQueueSnapshot,
  AdminShiftSnapshot,
} from "@/lib/admin/console";

/** Test data for the overview components. */

export function makeSnapshot(
  queues: Array<Pick<AdminQueueCount, "key"> & Partial<AdminQueueCount>>,
  generatedAt = "2026-10-26T05:00:00.000Z",
): AdminQueueSnapshot {
  return {
    generatedAt,
    queues: queues.map((q) => ({ count: 0, href: `/admin/test/${q.key}`, ...q })),
  };
}

export function makeShift(overrides: Partial<AdminShiftSnapshot> = {}): AdminShiftSnapshot {
  return {
    cohort: {
      name: "SHIFT[3]",
      round: 3,
      status: "open",
      applyDeadline: "2026-11-07",
      startDate: "2026-11-08",
      endDate: "2026-11-14",
      seats: 30,
      priceBaht: 3900,
      daysToDeadline: 12,
    },
    funnel: {
      applied: 40,
      newCount: 6,
      accepted: 20,
      waitlist: 3,
      declined: 2,
      paid: 12,
      inDiscord: 9,
    },
    liveRound: {
      id: "round-2",
      title: "SHIFT[2]",
      entrants: 24,
      pendingReview: 5,
      certificatesIssued: 0,
      href: "/admin/shift/rounds/round-2",
    },
    ...overrides,
  };
}
