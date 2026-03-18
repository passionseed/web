import { createAdminClient } from "@/utils/supabase/admin";
import crypto from "crypto";

const MAX_ATTEMPTS_PER_HOUR = 3;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export async function checkRateLimit(ipAddress: string): Promise<RateLimitResult> {
  console.log("[rate-limiter] Checking rate limit for IP:", ipAddress);

  try {
    const supabase = createAdminClient();
    console.log("[rate-limiter] Admin client created");

    const salt = process.env.RATE_LIMIT_SALT || "default-salt";
    const ipHash = crypto
      .createHash("sha256")
      .update(ipAddress + salt)
      .digest("hex");
    console.log("[rate-limiter] IP hash:", ipHash.substring(0, 8) + "...");

    const hourBucket = new Date();
    hourBucket.setMinutes(0, 0, 0);

    const resetAt = new Date(hourBucket);
    resetAt.setHours(resetAt.getHours() + 1);

    console.log("[rate-limiter] Querying rate limit table...");
    const { data: existing, error: selectError } = await supabase
      .from("expert_interview_rate_limits")
      .select("attempt_count")
      .eq("ip_hash", ipHash)
      .eq("hour_bucket", hourBucket.toISOString())
      .single();

    if (selectError && selectError.code !== "PGRST116") {
      console.error("[rate-limiter] Select error:", selectError);
      throw selectError;
    }

    console.log("[rate-limiter] Existing record:", existing);
    const currentCount = existing?.attempt_count || 0;

    if (currentCount >= MAX_ATTEMPTS_PER_HOUR) {
      console.log("[rate-limiter] Rate limit exceeded:", currentCount);
      return { allowed: false, remaining: 0, resetAt };
    }

    if (existing) {
      console.log("[rate-limiter] Updating existing record");
      const { error: updateError } = await supabase
        .from("expert_interview_rate_limits")
        .update({ attempt_count: currentCount + 1 })
        .eq("ip_hash", ipHash)
        .eq("hour_bucket", hourBucket.toISOString());

      if (updateError) {
        console.error("[rate-limiter] Update error:", updateError);
        throw updateError;
      }
    } else {
      console.log("[rate-limiter] Inserting new record");
      const { error: insertError } = await supabase
        .from("expert_interview_rate_limits")
        .insert({
          ip_hash: ipHash,
          hour_bucket: hourBucket.toISOString(),
          attempt_count: 1,
        });

      if (insertError) {
        console.error("[rate-limiter] Insert error:", insertError);
        throw insertError;
      }
    }

    const result = {
      allowed: true,
      remaining: MAX_ATTEMPTS_PER_HOUR - currentCount - 1,
      resetAt,
    };
    console.log("[rate-limiter] Rate limit check passed:", result);
    return result;
  } catch (error) {
    console.error("[rate-limiter] Unexpected error:", error);
    throw error;
  }
}
