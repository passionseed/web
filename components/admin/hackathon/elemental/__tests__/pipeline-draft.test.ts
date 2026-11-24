import type { PipelineItem } from "@/lib/hackathon/elemental/pipeline";

import { diff, planKey, toDraft, withPlanFrom } from "../pipeline-draft";

function item(p: Partial<PipelineItem>): PipelineItem {
  return {
    id: "a",
    event_slug: "elemental-2026",
    kind: "sponsor",
    name: "Acme",
    organisation: null,
    element: null,
    stage: "to_contact",
    owner: null,
    amount_thb: null,
    why_fit: null,
    reach: null,
    next_step: null,
    next_step_due: null,
    notes: null,
    position: null,
    in_kind: false,
    stage_changed_at: null,
    last_touched_at: null,
    updated_by: null,
    created_at: "2026-11-21T00:00:00Z",
    updated_at: "2026-11-21T00:00:00Z",
    ...p,
  };
}

describe("edit sheet draft after a move made from the sheet", () => {
  it("takes the new next step, so Save is not blocked", () => {
    const before = item({});
    const draft = toDraft(before);
    const moved = item({ stage: "contacted", next_step: "Send deck", next_step_due: "2026-11-24" });
    expect(planKey(moved)).not.toBe(planKey(before));
    // Without the re-sync the stale draft blocks every save.
    expect(diff(moved, draft)).toEqual({ error: "Contacted needs a next step and a date" });
    const synced = withPlanFrom({ ...draft, notes: "typed" }, moved);
    expect(diff(moved, synced)).toEqual({ notes: "typed" });
  });

  it("does not write the old next step back after Touched today", () => {
    const before = item({ stage: "talking", next_step: "Send deck", next_step_due: "2026-11-22" });
    const draft = { ...toDraft(before), amount_choice: "5000" as const };
    const touched = { ...before, next_step: "Call back", next_step_due: "2026-11-25" };
    expect(diff(touched, draft)).toMatchObject({ next_step: "Send deck", next_step_due: "2026-11-22" });
    expect(diff(touched, withPlanFrom(draft, touched))).toEqual({ amount_thb: 5000 });
  });
});
