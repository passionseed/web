import { isClosedLeadStatus } from "@/lib/dm-leads/playbook";
import { openStatusCount, parseDmLeadView } from "@/lib/admin/queue-tools/dm-leads";

describe("parseDmLeadView", () => {
  it("keeps every sort the select offers, so the select never snaps back", () => {
    for (const sort of ["newest", "waiting", "propensity", "engagement"] as const) {
      const view = parseDmLeadView({ sort });
      expect(view.filters.sort).toBe(sort);
      expect(view.bar.sort).toBe(sort);
    }
    expect(parseDmLeadView({ sort: "random" }).bar.sort).toBe("newest");
  });

  it("maps the awaiting-reply link to: lead wrote last, open status, longest wait first", () => {
    const view = parseDmLeadView(new URLSearchParams("turn=mine&status=open&sort=waiting"));
    expect(view.filters).toMatchObject({
      myTurnOnly: true,
      openOnly: true,
      sort: "waiting",
      leadStatus: undefined,
    });
    expect(view.bar).toMatchObject({ turn: "mine", status: "open", sort: "waiting" });
  });

  it("maps the follow-up link to due follow-ups only", () => {
    const view = parseDmLeadView({ followup: "due" });
    expect(view.filters.followUpDue).toBe(true);
    expect(view.filters.openOnly).toBe(false);
    expect(view.bar.followup).toBe("due");
  });

  it("drops values the loader cannot use instead of passing them to SQL", () => {
    const view = parseDmLeadView({ intent: "bogus", stage: "nope", platform: "tiktok", status: "maybe" });
    expect(view.filters).toMatchObject({
      intent: undefined,
      stage: undefined,
      platform: undefined,
      leadStatus: undefined,
    });
    expect(view.bar).toMatchObject({ intent: "all", stage: "all", platform: "all", status: "all" });
  });

  it("passes real lead statuses straight through", () => {
    const view = parseDmLeadView({ status: "qualified", grade: "ม.5", tag: "vip", search: "  ploy " });
    expect(view.filters).toMatchObject({ leadStatus: "qualified", grade: "ม.5", tag: "vip", search: "ploy" });
    expect(view.filters.openOnly).toBe(false);
  });
});

describe("open leads", () => {
  it("treats converted, lost, and spam as closed", () => {
    const statuses = ["new", "contacted", "qualified", "converted", "lost", "spam"] as const;
    expect(statuses.filter((s) => !isClosedLeadStatus(s))).toEqual(["new", "contacted", "qualified"]);
  });

  it("sums the open statuses for the select", () => {
    expect(openStatusCount({ new: 3, contacted: 2, qualified: 1, converted: 9, spam: 4 })).toBe(6);
    expect(openStatusCount(undefined)).toBe(0);
  });
});
