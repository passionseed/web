import { maxDuration } from "@/lib/ai/modelRegistry";

type GenerationStage = "chat" | "core" | "details" | "summary";

interface RetryOptions {
  stage: GenerationStage;
  timeoutMs?: number;
  maxRetries?: number;
  baseDelayMs?: number;
}

export interface RetryResult<T> {
  value: T;
  retryCount: number;
  hadTimeout: boolean;
  hadRateLimit: boolean;
}

export class AIExecutionError extends Error {
  readonly stage: GenerationStage;
  readonly retryCount: number;
  readonly hadTimeout: boolean;
  readonly hadRateLimit: boolean;
  readonly causeError: unknown;

  constructor(params: {
    stage: GenerationStage;
    retryCount: number;
    hadTimeout: boolean;
    hadRateLimit: boolean;
    causeError: unknown;
  }) {
    const message =
      params.causeError instanceof Error
        ? params.causeError.message
        : String(params.causeError || "Unknown AI execution error");
    super(message);
    this.name = "AIExecutionError";
    this.stage = params.stage;
    this.retryCount = params.retryCount;
    this.hadTimeout = params.hadTimeout;
    this.hadRateLimit = params.hadRateLimit;
    this.causeError = params.causeError;
  }
}

const DEFAULT_TIMEOUTS_MS: Record<GenerationStage, number> = {
  chat: 15_000,
  core: 45_000,
  details: 25_000,
  summary: 12_000,
};

function capTimeout(timeoutMs: number): number {
  // Keep stage timeouts under platform max duration.
  return Math.min(timeoutMs, maxDuration * 1000 - 1_000);
}

export function getStageTimeoutMs(stage: GenerationStage): number {
  const envKey =
    stage === "chat"
      ? process.env.DIRECTION_FINDER_CHAT_TIMEOUT_MS
      : stage === "core"
        ? process.env.DIRECTION_FINDER_CORE_TIMEOUT_MS
        : stage === "details"
          ? process.env.DIRECTION_FINDER_DETAILS_TIMEOUT_MS
          : process.env.DIRECTION_FINDER_SUMMARY_TIMEOUT_MS;

  const parsed = envKey ? Number(envKey) : NaN;
  const baseTimeout = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUTS_MS[stage];
  return capTimeout(baseTimeout);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, stage: GenerationStage): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`[${stage}] timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error || "");
}

export function isTimeoutError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("504") ||
    message.includes("unexpected response")
  );
}

export function isRateLimitError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("429") ||
    message.includes("rate limit") ||
    message.includes("quota")
  );
}

export function isRetryableAIError(error: unknown): boolean {
  if (isTimeoutError(error) || isRateLimitError(error)) return true;

  const message = getErrorMessage(error).toLowerCase();
  return message.includes("503") || message.includes("502") || message.includes("500");
}

export async function runWithRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions,
): Promise<RetryResult<T>> {
  const timeoutMs = options.timeoutMs ?? getStageTimeoutMs(options.stage);
  const maxRetries = options.maxRetries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 300;

  let retryCount = 0;
  let hadTimeout = false;
  let hadRateLimit = false;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const value = await withTimeout(operation(), timeoutMs, options.stage);
      return { value, retryCount, hadTimeout, hadRateLimit };
    } catch (error) {
      lastError = error;
      hadTimeout = hadTimeout || isTimeoutError(error);
      hadRateLimit = hadRateLimit || isRateLimitError(error);

      if (attempt === maxRetries || !isRetryableAIError(error)) {
        break;
      }

      retryCount += 1;
      const backoffMs = baseDelayMs * Math.pow(2, attempt);
      const jitterMs = Math.floor(Math.random() * 200);
      await sleep(backoffMs + jitterMs);
    }
  }

  throw new AIExecutionError({
    stage: options.stage,
    retryCount,
    hadTimeout,
    hadRateLimit,
    causeError: lastError,
  });
}

