import { getHomeOffer } from "../home-offer";
import { SHIFT_COHORT_3 } from "../shift-cohort";
import { NEXT_ROUND_NAME } from "../shift-next";

describe("home offer", () => {
  it("sells the round that is taking applications", () => {
    const offer = getHomeOffer(SHIFT_COHORT_3.applyDeadline);
    expect(offer.cohort).toBe(SHIFT_COHORT_3);
    expect(offer.name).toBe(SHIFT_COHORT_3.name);
    expect(offer.href).toBe("/shift/apply");
    expect(offer.note).toBeNull();
  });

  it("points at the next round once the deadline has passed", () => {
    const offer = getHomeOffer(SHIFT_COHORT_3.endDate);
    expect(offer.cohort).toBeNull();
    expect(offer.name).toBe(NEXT_ROUND_NAME);
    expect(offer.href).toBe("/shift/next");
    expect(offer.cta).toContain(NEXT_ROUND_NAME);
    expect(offer.note).toBeTruthy();
  });
});
