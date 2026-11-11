import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { DIGEST_OUTPUT_SCHEMA, DIGEST_SYSTEM_PROMPT, factsMessage, type DigestAnswer, type DigestFacts } from "./prompt";

/**
 * Claude for the AI island news (ข่าวเกาะ). Server only: it reads
 * ANTHROPIC_API_KEY when a request is made, never at import, so the build
 * (placeholder env, no key) and every other island feature work without it.
 */

/** A short, simple summary per team per day: the small model at low effort. */
export const DIGEST_MODEL = "claude-haiku-5-5";

/** The env var the island news needs; named in the cron's error line. */
export const DIGEST_KEY_ENV = "ANTHROPIC_API_KEY";

/** Room for low-effort thinking plus a 220-character answer. */
const MAX_TOKENS = 4000;

/** True when the key is set. Without it the cron writes nothing and says why. */
export function hasDigestKey(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env[DIGEST_KEY_ENV]?.trim());
}

/**
 * A model call that failed for a reason worth a log line: the code only
 * (auth, rate_limit, overloaded, http_<status>, network), never a message
 * that could echo student text back.
 */
export class DigestModelError extends Error {
  constructor(public readonly code: string) {
    super(`digest model call failed: ${code}`);
    this.name = "DigestModelError";
  }
}

function modelErrorCode(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) return "auth";
  if (error instanceof Anthropic.RateLimitError) return "rate_limit";
  if (error instanceof Anthropic.APIConnectionError) return "network";
  if (error instanceof Anthropic.APIError) return error.status === 529 ? "overloaded" : `http_${error.status ?? "unknown"}`;
  return error instanceof Error ? error.name : "unknown";
}

const Answer = z.object({ no_update: z.boolean(), summary: z.string() });

/** The model's JSON answer, or null when it is not the agreed shape. */
export function parseAnswer(text: string): DigestAnswer | null {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  const parsed = Answer.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/**
 * One team's summary from Claude Haiku. Null when the model declined (a
 * refusal) or the answer was cut off or not the agreed JSON: the caller
 * stores "no update". Throws DigestModelError for API failures (no key, a
 * refused key, rate limits, outages): the caller stores nothing for the team.
 */
export async function describeTeam(facts: DigestFacts, note: string | null): Promise<DigestAnswer | null> {
  let response: Anthropic.Message;
  try {
    const client = new Anthropic();
    response = await client.messages.create({
      model: DIGEST_MODEL,
      max_tokens: MAX_TOKENS,
      output_config: { effort: "low", format: { type: "json_schema", schema: DIGEST_OUTPUT_SCHEMA } },
      system: DIGEST_SYSTEM_PROMPT,
      messages: [{ role: "user", content: factsMessage(facts, note) }],
    });
  } catch (error) {
    throw new DigestModelError(modelErrorCode(error));
  }
  if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return null;
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return parseAnswer(text);
}
