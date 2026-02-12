import {
  getAllModelBuckets,
  selectModelForUser,
  validateModelBuckets,
} from "@/lib/ai/modelSelector";

describe("modelSelector", () => {
  it("validates bucket coverage and percentage total", () => {
    expect(validateModelBuckets()).toBe(true);
  });

  it("uses the stability-biased percentages", () => {
    const percentages = getAllModelBuckets().reduce<Record<string, number>>(
      (acc, bucket) => {
        acc[bucket.model] = (acc[bucket.model] || 0) + bucket.percentage;
        return acc;
      },
      {},
    );

    expect(percentages["gemini-2.5-flash"]).toBe(22);
    expect(percentages["gemini-3-flash"]).toBe(14);
    expect(percentages["gemini-flash-lite-latest"]).toBe(12);
    expect(percentages["claude-haiku-4-5"]).toBe(10);
    expect(percentages["gpt-5-mini-2025-08-07"]).toBe(12);
    expect(percentages["gpt-5.2-chat-latest"]).toBe(10);
    expect(percentages["codex-mini-latest"]).toBe(8);
    expect(percentages["deepseek-chat"]).toBe(8);
    expect(percentages["deepseek-reasoner"]).toBe(4);
  });

  it("is deterministic for the same user id", () => {
    const userId = "9a06f93a-7f96-4d08-b58c-8f6cc15cd122";
    const first = selectModelForUser(userId);
    const second = selectModelForUser(userId);
    expect(first).toBe(second);
  });

  it("always maps users to one of the configured models", () => {
    const configured = new Set(getAllModelBuckets().map((bucket) => bucket.model));

    for (let i = 0; i < 500; i++) {
      const userId = `test-user-${i}`;
      const model = selectModelForUser(userId);
      expect(configured.has(model)).toBe(true);
    }
  });
});

