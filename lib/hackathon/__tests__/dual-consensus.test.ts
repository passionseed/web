/** @jest-environment node */

import { z } from "zod";
import { parseModelGrade, runDualGrade, type ModelGradeResult, type DualGradeOutcome } from "../dual-grade";
import { persistDraft, type AiDraft } from "../ai-grader";

const aiGradeSchema = z.object({
  review_status: z.enum(["pending_review", "passed", "revision_required"]),
  score_awarded: z.number().nullable(),
  feedback: z.string().min(1).max(4000),
  reasoning: z.string().max(2000),
});

describe("parseModelGrade", () => {
  const validGrade = {
    review_status: "passed" as const,
    score_awarded: 85,
    feedback: "Great work!",
    reasoning: "Shows clear understanding.",
  };

  it("extracts JSON from markdown-fenced block", () => {
    const raw = "```json\n" + JSON.stringify(validGrade) + "\n```";
    const result = parseModelGrade(raw);
    expect(result).not.toBeNull();
    expect(result!.status).toBe("passed");
    expect(result!.score_awarded).toBe(85);
    expect(result!.feedback).toBe("Great work!");
    expect(result!.reasoning).toBe("Shows clear understanding.");
  });

  it("extracts JSON from raw unfenced text", () => {
    const raw = JSON.stringify(validGrade);
    const result = parseModelGrade(raw);
    expect(result).not.toBeNull();
    expect(result!.status).toBe("passed");
    expect(result!.score_awarded).toBe(85);
  });

  it("extracts JSON from text with prose before and after", () => {
    const raw = `Here is my grade:\n\`\`\`json\n${JSON.stringify(validGrade)}\n\`\`\`\nHope that helps!`;
    const result = parseModelGrade(raw);
    expect(result).not.toBeNull();
    expect(result!.status).toBe("passed");
    expect(result!.score_awarded).toBe(85);
  });

  it("returns null for truly unparseable input", () => {
    expect(parseModelGrade("I cannot grade this submission")).toBeNull();
    expect(parseModelGrade("")).toBeNull();
    expect(parseModelGrade("no braces here")).toBeNull();
  });

  it("returns null for JSON that fails schema validation", () => {
    const bad = JSON.stringify({ review_status: "passed", score_awarded: 85, feedback: "", reasoning: "x" });
    expect(parseModelGrade(bad)).toBeNull();
  });

  it("returns null for invalid review_status", () => {
    const bad = JSON.stringify({ review_status: "failed", score_awarded: 85, feedback: "ok", reasoning: "x" });
    expect(parseModelGrade(bad)).toBeNull();
  });
});

describe("runDualGrade consensus rules", () => {
  const kimiResult: ModelGradeResult = {
    model: "kimi-for-coding",
    status: "passed",
    score_awarded: 90,
    feedback: "Kimi feedback",
    reasoning: "Kimi reasoning",
    raw: "raw kimi",
  };

  const minimaxResult: ModelGradeResult = {
    model: "minimax-m2-highspeed",
    status: "passed",
    score_awarded: 80,
    feedback: "MiniMax feedback",
    reasoning: "MiniMax reasoning",
    raw: "raw minimax",
  };

  it("both passed → auto-approve with Kimi feedback and averaged score", () => {
    const outcome = runDualGrade(kimiResult, minimaxResult);
    expect(outcome.autoApprove).toBe(true);
    expect(outcome.draft.status).toBe("passed");
    expect(outcome.draft.score_awarded).toBe(85); // average of 90 and 80
    expect(outcome.draft.feedback).toBe("Kimi feedback");
    expect(outcome.draft.consensus?.agreement).toBe("agree");
  });

  it("both revision_required → draft with stricter (min) score, no auto-approve", () => {
    const k = { ...kimiResult, status: "revision_required" as const, score_awarded: 40 };
    const m = { ...minimaxResult, status: "revision_required" as const, score_awarded: 30 };
    const outcome = runDualGrade(k, m);
    expect(outcome.autoApprove).toBe(false);
    expect(outcome.draft.status).toBe("revision_required");
    expect(outcome.draft.score_awarded).toBe(35); // average of 40 and 30
    expect(outcome.draft.consensus?.agreement).toBe("agree");
  });

  it("disagree (passed vs revision_required) → pending_review with both opinions", () => {
    const k = { ...kimiResult, status: "passed" as const };
    const m = { ...minimaxResult, status: "revision_required" as const, score_awarded: 30 };
    const outcome = runDualGrade(k, m);
    expect(outcome.autoApprove).toBe(false);
    expect(outcome.draft.status).toBe("pending_review");
    expect(outcome.draft.consensus?.agreement).toBe("disagree");
    expect(outcome.draft.consensus?.models).toHaveLength(2);
    expect(outcome.draft.consensus?.models[0].model).toBe("kimi-for-coding");
    expect(outcome.draft.consensus?.models[1].model).toBe("minimax-m2-highspeed");
  });

  it("disagree (revision_required vs passed) → pending_review with both opinions", () => {
    const k = { ...kimiResult, status: "revision_required" as const, score_awarded: 30 };
    const m = { ...minimaxResult, status: "passed" as const };
    const outcome = runDualGrade(k, m);
    expect(outcome.autoApprove).toBe(false);
    expect(outcome.draft.status).toBe("pending_review");
    expect(outcome.draft.consensus?.agreement).toBe("disagree");
  });

  it("MiniMax errors, Kimi passed → single-model auto-approve via Kimi", () => {
    const outcome = runDualGrade(kimiResult, null);
    expect(outcome.autoApprove).toBe(true);
    expect(outcome.draft.status).toBe("passed");
    expect(outcome.draft.feedback).toBe("Kimi feedback");
    expect(outcome.draft.consensus?.agreement).toBe("single_model");
  });

  it("Kimi errors, MiniMax passed → single-model auto-approve via MiniMax", () => {
    const outcome = runDualGrade(null, minimaxResult);
    expect(outcome.autoApprove).toBe(true);
    expect(outcome.draft.status).toBe("passed");
    expect(outcome.draft.feedback).toBe("MiniMax feedback");
    expect(outcome.draft.consensus?.agreement).toBe("single_model");
  });

  it("both models error → error outcome, no draft", () => {
    const outcome = runDualGrade(null, null);
    expect(outcome.error).toBe(true);
    expect(outcome.draft).toBeNull();
  });

  it("MiniMax errors, Kimi revision_required → single-model draft no auto-approve", () => {
    const k = { ...kimiResult, status: "revision_required" as const };
    const outcome = runDualGrade(k, null);
    expect(outcome.autoApprove).toBe(false);
    expect(outcome.draft.status).toBe("revision_required");
    expect(outcome.draft.consensus?.agreement).toBe("single_model");
  });

  it("Kimi errors, MiniMax revision_required → single-model draft no auto-approve", () => {
    const m = { ...minimaxResult, status: "revision_required" as const };
    const outcome = runDualGrade(null, m);
    expect(outcome.autoApprove).toBe(false);
    expect(outcome.draft.status).toBe("revision_required");
    expect(outcome.draft.consensus?.agreement).toBe("single_model");
  });

  it("disagree consensus JSON contains all required fields", () => {
    const k = { ...kimiResult, status: "passed" as const };
    const m = { ...minimaxResult, status: "revision_required" as const, score_awarded: 30 };
    const outcome = runDualGrade(k, m);
    const models = outcome.draft.consensus?.models ?? [];
    expect(models).toHaveLength(2);
    for (const entry of models) {
      expect(entry).toHaveProperty("model");
      expect(entry).toHaveProperty("status");
      expect(entry).toHaveProperty("score_awarded");
      expect(entry).toHaveProperty("feedback");
      expect(entry).toHaveProperty("reasoning");
    }
  });
});

describe("persistDraft optimistic lock", () => {
  const mockServiceClient = () => {
    let rows: Array<Record<string, unknown>> = [];
    return {
      from: (table: string) => ({
        select: (...cols: string[]) => ({
          eq: (col: string, val: string) => ({
            maybeSingle: jest.fn().mockResolvedValue({ data: rows[0] ?? null, error: null }),
            single: jest.fn().mockResolvedValue({ data: rows[0] ?? null, error: null }),
          }),
          in: () => ({
            eq: () => ({
              not: () => ({
                gt: () => ({
                  maybeSingle: jest.fn().mockResolvedValue({ data: rows[0] ?? null, error: null }),
                }),
              }),
            }),
          }),
        }),
        update: (payload: Record<string, unknown>) => ({
          eq: jest.fn().mockImplementation((col: string, val: string) => {
            // Simulate optimistic lock: if ai_draft_generated_at in WHERE doesn't match, return 0 rows
            const row = rows[0];
            if (payload.ai_draft_generated_at && row && row.ai_draft_generated_at !== payload.ai_draft_generated_at) {
              return Promise.resolve({ data: null, error: { message: "No rows matched" } });
            }
            rows = [{ ...row, ...payload }];
            return Promise.resolve({ data: { id: "review-1" }, error: null });
          }),
        }),
        insert: (payload: Record<string, unknown>) => ({
          select: () => ({
            single: jest.fn().mockResolvedValue({ data: { id: "review-1" }, error: null }),
          }),
        }),
      }),
    };
  };

  it("rejects concurrent grading when ai_draft_generated_at mismatches", async () => {
    const client = mockServiceClient();
    // Seed an existing review with ai_draft_generated_at set
    (client as any)._rows = [{ id: "review-1", ai_draft_generated_at: "2024-01-01T00:00:00Z" }];

    const draft: AiDraft = {
      status: "passed",
      score_awarded: 80,
      points_possible: 100,
      feedback: "Good",
      reasoning: "Reasoning",
      raw_output: "raw",
      error: null,
    };

    // First call should succeed
    const result1 = await persistDraft(client, {
      scope: "individual",
      submissionId: "sub-1",
      draft,
      source: "manual",
      model: "kimi-for-coding",
      reviewedByUserId: "admin-1",
    });
    expect(result1.promoted).toBe(true);
  });
});
