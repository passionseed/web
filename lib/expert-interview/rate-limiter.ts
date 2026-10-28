import { createAdminClient } from "@/utils/supabase/admin";
import crypto from "crypto";

const MAX_ATTEMPTS_PER_HOUR = 3;
const TABLE = "expert_interview_rate_limits";
// A request that keeps losing the compare-and-swap is part of a burst on one key.
const MAX_SWAP_ATTEMPTS = 3;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Hourly fixed-window limit shared across instances. Each increment is a
 * compare-and-swap on the stored count, so concurrent requests cannot all read
 * the same count and pass together. Errors propagate: callers fail closed.
 */
export async function checkRateLimit(
  key: string,
  maxAttempts = MAX_ATTEMPTS_PER_HOUR
): Promise<RateLimitResult> {
  const supabase = createAdminClient();

  const salt = process.env.RATE_LIMIT_SALT || "default-salt";
  const keyHash = crypto.createHash("sha256").update(key + salt).digest("hex");

  const hourBucket = new Date();
  hourBucket.setMinutes(0, 0, 0);
  const bucket = hourBucket.toISOString();

  const resetAt = new Date(hourBucket);
  resetAt.setHours(resetAt.getHours() + 1);

  for (let attempt = 0; attempt < MAX_SWAP_ATTEMPTS; attempt++) {
    const { data: existing, error: selectError } = await supabase
      .from(TABLE)
      .select("attempt_count")
      .eq("ip_hash", keyHash)
      .eq("hour_bucket", bucket)
      .maybeSingle();
    if (selectError) throw selectError;

    const currentCount = existing?.attempt_count ?? 0;
    if (currentCount >= maxAttempts) {
      return { allowed: false, remaining: 0, resetAt };
    }

    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from(TABLE)
        .update({ attempt_count: currentCount + 1 })
        .eq("ip_hash", keyHash)
        .eq("hour_bucket", bucket)
        .eq("attempt_count", currentCount)
        .select("attempt_count");
      if (updateError) throw updateError;
      // Another request incremented first: re-read and try again.
      if (!updated?.length) continue;
    } else {
      const { error: insertError } = await supabase
        .from(TABLE)
        .insert({ ip_hash: keyHash, hour_bucket: bucket, attempt_count: 1 });
      // Another request created the row first: re-read and try again.
      if (insertError?.code === "23505") continue;
      if (insertError) throw insertError;
    }

    return { allowed: true, remaining: maxAttempts - currentCount - 1, resetAt };
  }

  return { allowed: false, remaining: 0, resetAt };
}
