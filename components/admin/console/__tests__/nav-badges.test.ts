import type { AdminQueueSnapshot } from "@/lib/admin/console";
import {
  badgeLabel,
  formatBadgeCount,
  hasUrgentAttention,
  navBadges,
} from "../nav-badges";

const snapshot = (
  queues: AdminQueueSnapshot["queues"],
): AdminQueueSnapshot => ({
  generatedAt: "2026-10-26T00:00:00.000Z",
  queues,
});

describe("navBadges", () => {
  it("sums badge queues per nav item and flags now-urgent work", () => {
    const badges = navBadges(
      snapshot([
        { key: "dm_awaiting_reply", count: 3, href: "/admin/dm-leads" },
        { key: "dm_followup_due", count: 9, href: "/admin/dm-leads" },
        {
          key: "shift_new_applications",
          count: 2,
          href: "/admin/shift/applications",
        },
        { key: "experts_pending", count: null, href: "/admin/experts" },
      ]),
    );
    expect(badges).toEqual({
      "/admin/dm-leads": { count: 3, urgent: true },
      "/admin/shift/applications": { count: 2, urgent: false },
    });
  });

  it("is empty without a snapshot", () => {
    expect(navBadges(null)).toEqual({});
    expect(hasUrgentAttention(null)).toBe(false);
  });

  it("reports urgent attention only for now queues with work", () => {
    expect(
      hasUrgentAttention(
        snapshot([{ key: "trials_pending", count: 0, href: "/admin/trials" }]),
      ),
    ).toBe(false);
    expect(
      hasUrgentAttention(
        snapshot([{ key: "trials_pending", count: 1, href: "/admin/trials" }]),
      ),
    ).toBe(true);
  });
});

describe("badge text", () => {
  it("caps at 99+", () => {
    expect(formatBadgeCount(4)).toBe("4");
    expect(formatBadgeCount(99)).toBe("99");
    expect(formatBadgeCount(100)).toBe("99+");
    expect(badgeLabel(4)).toBe("4 waiting");
    expect(badgeLabel(250)).toBe("99+ waiting");
  });
});
