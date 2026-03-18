import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/expert-interview/rate-limiter";
import { getFirstQuestion, getTotalQuestions } from "@/lib/expert-interview/chat-service";
import crypto from "crypto";

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  try {
    console.log("[expert-interview/session] Starting session creation");
    const body = await request.json().catch(() => ({}));
    const language = body.language === "th" ? "th" : "en";
    console.log("[expert-interview/session] Language:", language);

    // Honeypot check
    if (body.website && body.website.trim() !== "") {
      console.log("[expert-interview/session] Honeypot triggered");
      return NextResponse.json({
        sessionId: "hp-" + crypto.randomUUID(),
        firstQuestion: getFirstQuestion(language),
        progress: { current: 1, total: getTotalQuestions() },
      });
    }

    const ip = getClientIp(request);
    console.log("[expert-interview/session] Client IP:", ip);

    console.log("[expert-interview/session] Checking rate limit...");
    const rateLimitResult = await checkRateLimit(ip);
    console.log("[expert-interview/session] Rate limit result:", rateLimitResult);

    if (!rateLimitResult.allowed) {
      console.log("[expert-interview/session] Rate limit exceeded");
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          resetAt: rateLimitResult.resetAt,
        },
        { status: 429 }
      );
    }

    const sessionId = crypto.randomUUID();
    console.log("[expert-interview/session] Session created:", sessionId);

    return NextResponse.json({
      sessionId,
      firstQuestion: getFirstQuestion(language),
      progress: { current: 1, total: getTotalQuestions() },
    });
  } catch (error) {
    console.error("[expert-interview/session] failed", error);
    console.error("[expert-interview/session] error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
