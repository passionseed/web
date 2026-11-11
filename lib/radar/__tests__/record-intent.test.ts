jest.mock("@/lib/supabase/radar", () => ({
  recordRadarPathIntent: jest.fn(),
  recordRadarMyPathIntent: jest.fn(),
  routeRadarCardIntent: jest.fn(),
}));

import { routeRadarCardIntent } from "@/lib/my-path/radar-sync";
import { recordFieldIntent, type FieldIntentDeps } from "../record-intent";

function deps(): FieldIntentDeps & { recordPathIntent: jest.Mock; recordMyPathIntent: jest.Mock } {
  return {
    recordPathIntent: jest.fn(async () => undefined),
    recordMyPathIntent: jest.fn(),
    route: routeRadarCardIntent,
  } as never;
}

describe("recordFieldIntent", () => {
  it("records the path intent with the visit id, and the My Path intent for field scope", () => {
    const d = deps();
    expect(
      recordFieldIntent(
        { fieldSlug: "cybersecurity", fieldId: null, pathSlug: "interested", scope: "field", buttonLabel: "interested", visitId: "v1" },
        d
      )
    ).toBe(true);
    expect(d.recordPathIntent).toHaveBeenCalledWith({
      fieldSlug: "cybersecurity",
      fieldId: undefined,
      pathSlug: "interested",
      buttonLabel: "interested",
      visitId: "v1",
    });
    expect(d.recordMyPathIntent).toHaveBeenCalledWith({ careerSlug: "cybersecurity", intent: "interested" });
  });

  it("uses the fallback label when the button has none, and skips My Path outside field scope", () => {
    const d = deps();
    recordFieldIntent(
      { fieldSlug: "cybersecurity", fieldId: "f-1", pathSlug: "p", fallbackLabel: "สนใจสายนี้", visitId: null },
      d
    );
    expect(d.recordPathIntent).toHaveBeenCalledWith(
      expect.objectContaining({ fieldId: "f-1", buttonLabel: "สนใจสายนี้", visitId: null })
    );
    expect(d.recordMyPathIntent).not.toHaveBeenCalled();
  });

  it("swallows a failed write and records nothing without a slug", async () => {
    const d = deps();
    d.recordPathIntent.mockRejectedValueOnce(new Error("offline"));
    expect(recordFieldIntent({ fieldSlug: "x", pathSlug: "p", visitId: null }, d)).toBe(true);
    await Promise.resolve();
    expect(recordFieldIntent({ fieldSlug: "", pathSlug: "p", visitId: null }, d)).toBe(false);
    expect(d.recordPathIntent).toHaveBeenCalledTimes(1);
  });
});
