import type { ShiftFeedbackRow } from "@/lib/supabase/shift-feedback";

import { summarizeFeedback } from "./feedbackSummary";

const row = (patch: Partial<ShiftFeedbackRow>): ShiftFeedbackRow => ({
  id: "1",
  cohort: "SHIFT[1]",
  created_at: "2026-10-15T05:00:00Z",
  nickname: "มิว",
  satisfaction: 4,
  confidence: 3,
  ownership: 5,
  recommend: 9,
  can_do_now: "",
  own_decision: "",
  motivation: "wanted_to",
  most_valuable: "",
  change_next: "",
  price_fit: "about_right",
  payer: "self",
  next_steps: ["help_run"],
  continue_project: "own",
  continue_project_note: null,
  available_days: ["sat"],
  community_signup: "join",
  hardest_moment: null,
  quote_mode: "anonymous",
  quote_name: null,
  ...patch,
});

describe("summarizeFeedback", () => {
  it("averages scores and counts choices", () => {
    const summary = summarizeFeedback([
      row({ satisfaction: 5, recommend: 6, available_days: ["mon", "sat"] }),
      row({ satisfaction: 4, recommend: 9, next_steps: ["help_run", "co_host"] }),
      row({ satisfaction: 3, recommend: 6, payer: "parents" }),
    ]);
    expect(summary.responses).toBe(3);
    expect(summary.averages.satisfaction).toBe(4);
    expect(summary.recommendScores).toEqual([6, 6, 9]);
    expect(summary.availableDays).toEqual({ mon: 1, sat: 3 });
    expect(summary.nextSteps).toEqual({ help_run: 3, co_host: 1 });
    expect(summary.payer).toEqual({ self: 2, parents: 1 });
  });

  it("keeps rows from before the alumni ask out of its totals", () => {
    const summary = summarizeFeedback([
      row({}),
      row({ continue_project: null, available_days: null, next_steps: ["project_club"] }),
    ]);
    expect(summary.alumniAnswered).toBe(1);
    expect(summary.continueProject).toEqual({ own: 1 });
    expect(summary.availableDays).toEqual({ sat: 1 });
    expect(summary.nextSteps).toEqual({ help_run: 1, project_club: 1 });
  });

  it("counts community sign-ups only from rows that were offered it", () => {
    const summary = summarizeFeedback([
      row({}),
      row({ community_signup: "ask_parents" }),
      row({ community_signup: null }),
    ]);
    expect(summary.communityAnswered).toBe(2);
    expect(summary.communitySignup).toEqual({ join: 1, ask_parents: 1 });
  });

  it("has no averages without responses", () => {
    const summary = summarizeFeedback([]);
    expect(summary.responses).toBe(0);
    expect(summary.averages.recommend).toBeNull();
  });
});
