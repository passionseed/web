import { SHIFT_COHORT_3 } from "../shift-cohort";
import { getHomeLead, leadCta, resolveHomeLead } from "../home-lead";

describe("resolveHomeLead", () => {
  it("sells an open SHIFT round first", () => {
    expect(resolveHomeLead(SHIFT_COHORT_3, true)).toEqual({ kind: "shift", cohort: SHIFT_COHORT_3 });
  });

  it("leads with the hackathon when no round is open", () => {
    expect(resolveHomeLead(undefined, true)).toEqual({ kind: "hackathon" });
  });

  it("falls back to the next round's free sign-up when nothing is open", () => {
    expect(resolveHomeLead(undefined, false)).toEqual({ kind: "shift-next" });
  });
});

describe("getHomeLead", () => {
  it("sells SHIFT[3] before its deadline", () => {
    const lead = getHomeLead(new Date("2026-11-05T12:00:00+07:00"));
    expect(lead.kind).toBe("shift");
    expect(lead.kind === "shift" && lead.cohort.round).toBe(3);
  });

  it("never sells SHIFT[3] after its deadline: the hackathon leads", () => {
    expect(getHomeLead(new Date("2026-11-26T12:00:00+07:00"))).toEqual({ kind: "hackathon" });
  });

  it("points at the next round once hackathon sign-up has closed", () => {
    expect(getHomeLead(new Date("2026-12-06T12:00:00+07:00"))).toEqual({ kind: "shift-next" });
  });
});

describe("leadCta", () => {
  it("tags hackathon links with where the click came from", () => {
    expect(leadCta({ kind: "hackathon" }, "home").href).toBe("/hackathon/elemental?src=home");
  });

  it("books the open round's own form", () => {
    const cta = leadCta({ kind: "shift", cohort: SHIFT_COHORT_3 }, "home");
    expect(cta.href).toBe("/shift/apply?round=3");
    expect(cta.label).toBe("จองที่นั่ง SHIFT[3]");
  });

  it("sends the free sign-up to /shift/next, which takes no payment", () => {
    expect(leadCta({ kind: "shift-next" }, "home").href).toBe("/shift/next");
  });
});
