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
    const body = await request.json().catch(() => ({}));
    const language = body.language === "th" ? "th" : "en";

    // Honeypot check
    if (body.website && body.website.trim() !== "") {
      return NextResponse.json({
        sessionId: "hp-" + crypto.randomUUID(),
        firstQuestion: getFirstQuestion(language),
        progress: { current: 1, total: getTotalQuestions() },
      });
    }

    const ip = getClientIp(request);
    const rateLimitResult = await checkRateLimit(ip);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          resetAt: rateLimitResult.resetAt,
        },
        { status: 429 }
      );
    }

    const sessionId = crypto.randomUUID();

    return NextResponse.json({
      sessionId,
      firstQuestion: getFirstQuestion(language),
      progress: { current: 1, total: getTotalQuestions() },
    });
  } catch (error) {
    console.error("[expert-interview/session] failed", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
