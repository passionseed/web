/**
 * Shared between the server action and the client card.
 *
 * A "use server" module may only export async functions, so the caps cannot
 * live in actions.ts and still be read by the UI. Keeping them here lets the
 * button state the real batch size instead of repeating a literal that drifts.
 */

/**
 * Replies posted per run, by how much work one recipient costs.
 *
 * The plan caps a serverless function at 60s (`maxDuration` on the page). The
 * cost per recipient is not fixed: each channel is one Graph call plus, unless
 * a custom message is supplied, one Qwen rewrite that is allowed up to 20s
 * before it gives up. "Both" therefore does up to two rewrites and two Graph
 * calls per person, so a cap sized for the one-call public sweep overruns the
 * budget and the whole run 504s part way through — which is what "it sends to
 * fewer than 10 then errors" looks like from the browser.
 *
 * These are deliberately conservative: a truncated pass costs nothing because
 * the card just runs another one, while an overrun loses the whole response
 * and leaves the operator unsure what was sent.
 */
export const BULK_REPLY_BATCH_CAPS = {
  /** One Graph call + one rewrite per person. */
  single: 10,
  /** Two Graph calls + two rewrites per person. */
  both: 5,
  /** No rewrites: a custom message is sent verbatim, so only Graph calls cost. */
  singleVerbatim: 15,
  bothVerbatim: 8,
} as const;

/**
 * Rows attempted in one pass, given the channel and whether copy is custom.
 *
 * Kept as a function so the UI and the action cannot disagree about the number
 * shown on the button versus the number actually sent.
 */
export function getBatchCap(mode: "public" | "private" | "both", verbatim: boolean): number {
  if (mode === "both") {
    return verbatim ? BULK_REPLY_BATCH_CAPS.bothVerbatim : BULK_REPLY_BATCH_CAPS.both;
  }
  return verbatim ? BULK_REPLY_BATCH_CAPS.singleVerbatim : BULK_REPLY_BATCH_CAPS.single;
}

/**
 * Kept for callers that only need a headline number.
 * @deprecated Prefer `getBatchCap`, which accounts for the real per-run cost.
 */
export const BULK_REPLY_BATCH_CAP = BULK_REPLY_BATCH_CAPS.single;
