import { createAdminClient } from "@/utils/supabase/admin";
import crypto from "crypto";

const MAX_ATTEMPTS_PER_HOUR = 3;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export async function checkRateLimit(ipAddress: string): Promise<RateLimitResult> {
  const supabase = createAdminClient();

  const salt = process.env.RATE_LIMIT_SALT || "default-salt";
  const ipHash = crypto
    .createHash("sha256")
    .update(ipAddress + salt)
    .digest("hex");

  const hourBucket = new Date();
  hourBucket.setMinutes(0, 0, 0);

  const resetAt = new Date(hourBucket);
  resetAt.setHours(resetAt.getHours() + 1);

  const { data: existing } = await supabase
    .from("expert_interview_rate_limits")
    .select("attempt_count")
    .eq("ip_hash", ipHash)
    .eq("hour_bucket", hourBucket.toISOString())
    .single();

  const currentCount = existing?.attempt_count || 0;

  if (currentCount >= MAX_ATTEMPTS_PER_HOUR) {
    return { allowed: false, remaining: 0, resetAt };
  }

  if (existing) {
    await supabase
      .from("expert_interview_rate_limits")
      .update({ attempt_count: currentCount + 1 })
      .eq("ip_hash", ipHash)
      .eq("hour_bucket", hourBucket.toISOString());
  } else {
    await supabase.from("expert_interview_rate_limits").insert({
      ip_hash: ipHash,
      hour_bucket: hourBucket.toISOString(),
      attempt_count: 1,
    });
  }

  return {
    allowed: true,
    remaining: MAX_ATTEMPTS_PER_HOUR - currentCount - 1,
    resetAt,
  };
}
