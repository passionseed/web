/**
 * @jest-environment node
 */
import {
  buildDirectionFinderCacheKey,
  buildDirectionSavePayload,
} from "@/app/actions/save-direction";
import { AssessmentAnswers } from "@/types/direction-finder";

const answersA: AssessmentAnswers = {
  q1_flow: { description: "Build tools", activities: ["building"] },
  q2_zone_grid: { items: [{ domain: "AI", interest: 8, capability: 8 }] },
  q3_work_style: {
    indoor_outdoor: "indoor",
    structured_flexible: "flexible",
    solo_team: "team",
    hands_on_theory: "hands_on",
    steady_fast: "fast",
  },
  q4_reputation: ["explains hard concepts"],
  q5_proud: {
    story: "Shipped a prototype fast",
    role_description: "Initiator",
    tags: ["ownership"],
  },
  q6_unique: { description: "Can simplify hard ideas", skipped: false },
};

describe("save-direction helpers", () => {
  it("builds deterministic cache key independent of object key order", () => {
    const reordered = {
      ...answersA,
      q5_proud: {
        tags: ["ownership"],
        role_description: "Initiator",
        story: "Shipped a prototype fast",
      },
    } as AssessmentAnswers;

    const keyA = buildDirectionFinderCacheKey(answersA, "gemini-2.5-flash");
    const keyB = buildDirectionFinderCacheKey(reordered, "gemini-2.5-flash");

    expect(keyA).toBe(keyB);
  });

  it("writes model/cache/session fields into save payload", () => {
    const payload = buildDirectionSavePayload({
      answers: answersA,
      result: null,
      safeHistory: [{ id: "1", role: "user", content: "hello" }],
      chatContext: "summary",
      options: {
        modelName: "gpt-5-mini-2025-08-07",
        isCached: true,
        originalResultId: "abc",
        generationSessionId: "session-1",
      },
    });

    expect(payload.model_name).toBe("gpt-5-mini-2025-08-07");
    expect(typeof payload.cache_key).toBe("string");
    expect(payload.is_cached).toBe(true);
    expect(payload.original_result_id).toBe("abc");
    expect(payload.generation_session_id).toBe("session-1");
  });
});
