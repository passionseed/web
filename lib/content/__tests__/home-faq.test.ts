import { homeFaqs } from "@/lib/content/home-faq";
import { SHIFT_COHORT_3 } from "@/lib/content/shift-cohort";

describe("homeFaqs", () => {
  const faqs = homeFaqs(SHIFT_COHORT_3);

  it("takes the team size from the cohort", () => {
    const team = faqs.find((faq) => faq.q.includes("ทีม"));
    expect(team?.a).toContain(`ไม่เกิน ${SHIFT_COHORT_3.teamSize.max} คน`);
  });

  it("has no em dashes and no price", () => {
    const text = JSON.stringify(faqs);
    expect(text).not.toContain("—");
    expect(text).not.toMatch(/฿|บาท/);
  });
});
