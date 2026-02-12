/**
 * @jest-environment node
 */
import {
  AIExecutionError,
  isRateLimitError,
  isRetryableAIError,
  isTimeoutError,
  runWithRetry,
} from "@/lib/ai/reliability";

describe("ai reliability", () => {
  it("detects timeout/rate-limit errors", () => {
    expect(isTimeoutError(new Error("504 gateway timeout"))).toBe(true);
    expect(isRateLimitError(new Error("429 rate limit exceeded"))).toBe(true);
    expect(isRetryableAIError(new Error("503 upstream unavailable"))).toBe(true);
  });

  it("retries on transient errors and eventually succeeds", async () => {
    let calls = 0;

    const result = await runWithRetry(
      async () => {
        calls += 1;
        if (calls < 3) {
          throw new Error("429 rate limit");
        }
        return "ok";
      },
      { stage: "chat", maxRetries: 3, baseDelayMs: 1, timeoutMs: 1000 },
    );

    expect(result.value).toBe("ok");
    expect(result.retryCount).toBe(2);
    expect(result.hadRateLimit).toBe(true);
  });

  it("throws AIExecutionError with classified flags when retries are exhausted", async () => {
    await expect(
      runWithRetry(
        async () => {
          throw new Error("timeout after 15000ms");
        },
        { stage: "core", maxRetries: 1, baseDelayMs: 1, timeoutMs: 20 },
      ),
    ).rejects.toMatchObject<Partial<AIExecutionError>>({
      name: "AIExecutionError",
      hadTimeout: true,
      retryCount: 1,
      stage: "core",
    });
  });
});
