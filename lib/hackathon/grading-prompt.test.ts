import {
  formatCalibrationExamples,
  type CalibrationExample,
} from "./grading-prompt";

describe("formatCalibrationExamples", () => {
  it("returns empty string when no examples", () => {
    expect(formatCalibrationExamples([])).toBe("");
  });

  it("formats a single example with all fields", () => {
    const examples: CalibrationExample[] = [
      {
        ai_status: "passed",
        ai_score: 8,
        ai_feedback: "Good work overall.",
        final_status: "revision_required",
        final_score: 0,
        final_feedback: "Missing key evidence.",
        overridden_at: "2024-01-01T00:00:00Z",
      },
    ];

    const result = formatCalibrationExamples(examples);
    expect(result).toContain("CALIBRATION EXAMPLES");
    expect(result).toContain("Example 1:");
    expect(result).toContain('AI said:    passed (score=8)');
    expect(result).toContain("Admin said: revision_required (score=0)");
    expect(result).toContain("Missing key evidence.");
  });

  it("truncates long feedback", () => {
    const longFeedback = "a".repeat(300);
    const examples: CalibrationExample[] = [
      {
        ai_status: "passed",
        ai_score: null,
        ai_feedback: longFeedback,
        final_status: "passed",
        final_score: null,
        final_feedback: longFeedback,
        overridden_at: "2024-01-01T00:00:00Z",
      },
    ];

    const result = formatCalibrationExamples(examples);
    expect(result).toContain("…");
    // Result contains wrapper text + 2 truncated feedbacks (200 chars + "…" each)
    expect(result.length).toBeLessThan(800);
  });

  it("formats multiple examples with correct numbering", () => {
    const examples: CalibrationExample[] = [
      {
        ai_status: "passed",
        ai_score: 7,
        ai_feedback: "First example.",
        final_status: "passed",
        final_score: 8,
        final_feedback: "Slightly better.",
        overridden_at: "2024-01-02T00:00:00Z",
      },
      {
        ai_status: "revision_required",
        ai_score: 0,
        ai_feedback: "Second example.",
        final_status: "passed",
        final_score: 6,
        final_feedback: "Actually acceptable.",
        overridden_at: "2024-01-01T00:00:00Z",
      },
    ];

    const result = formatCalibrationExamples(examples);
    expect(result).toContain("Example 1:");
    expect(result).toContain("Example 2:");
    expect(result).toContain("First example.");
    expect(result).toContain("Second example.");
  });

  it("handles null scores correctly", () => {
    const examples: CalibrationExample[] = [
      {
        ai_status: "passed",
        ai_score: null,
        ai_feedback: "Ungraded activity.",
        final_status: "revision_required",
        final_score: null,
        final_feedback: "Needs more detail.",
        overridden_at: "2024-01-01T00:00:00Z",
      },
    ];

    const result = formatCalibrationExamples(examples);
    expect(result).toContain("AI said:    passed (score=null)");
    expect(result).toContain("Admin said: revision_required (score=null)");
  });
});
