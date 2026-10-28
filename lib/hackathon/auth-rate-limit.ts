import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/expert-interview/rate-limiter";

export type HackathonAuthFlow = "login" | "mentor-login" | "forgot-password";

// Per hour. The IP limits are loose because a whole school or event venue
// often shares one IP; the per-email limit is what stops password guessing
// and reset-email floods.
const LIMITS: Record<HackathonAuthFlow, { ip: number; email: number }> = {
  login: { ip: 200, email: 10 },
  "mentor-login": { ip: 100, email: 10 },
  "forgot-password": { ip: 30, email: 3 },
};

/** The shared limiter persists across instances. Hash identifiers before passing them to its logs. */
export async function checkHackathonAuthRateLimit(
  request: NextRequest,
  email: string,
  flow: HackathonAuthFlow
): Promise<boolean> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip") || "unknown";
  const key = (kind: string, value: string) => createHash("sha256")
    .update(`hackathon-auth:${flow}:${kind}:${value}`).digest("hex");
  try {
    const [ipLimit, emailLimit] = await Promise.all([
      checkRateLimit(key("ip", ip), LIMITS[flow].ip),
      checkRateLimit(key("email", email.trim().toLowerCase()), LIMITS[flow].email),
    ]);
    return ipLimit.allowed && emailLimit.allowed;
  } catch (error) {
    // A limiter outage must not lock every student out mid-event.
    console.error("[hackathon-auth-rate-limit] limiter unavailable", error instanceof Error ? error.message : error);
    return true;
  }
}
