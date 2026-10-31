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

/**
 * The shared limiter persists across instances. On Vercel, x-forwarded-for is
 * set by the platform, not the client.
 */
export async function checkHackathonAuthRateLimit(
  request: NextRequest,
  email: string,
  flow: HackathonAuthFlow
): Promise<boolean> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip") || "unknown";
  function key(kind: "ip" | "email", value: string): string {
    return createHash("sha256").update(`hackathon-auth:${flow}:${kind}:${value}`).digest("hex");
  }
  // Limiter errors propagate so the route fails closed; login needs the same
  // database, so an outage here already blocks sign-in.
  const [ipLimit, emailLimit] = await Promise.all([
    checkRateLimit(key("ip", ip), LIMITS[flow].ip),
    checkRateLimit(key("email", email.trim().toLowerCase()), LIMITS[flow].email),
  ]);
  return ipLimit.allowed && emailLimit.allowed;
}
