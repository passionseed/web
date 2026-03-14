import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sanitizeExpertInput, sanitizeUrl } from "@/lib/expert-interview/sanitizer";
import { z } from "zod";

const submitSchema = z.object({
  sessionId: z.string().min(1),
  interviewData: z.record(z.unknown()),
  interviewTranscript: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
      timestamp: z.string().optional(),
    })
  ),
  profile: z.object({
    name: z.string().min(1).max(200),
    title: z.string().min(1).max(200),
    company: z.string().min(1).max(200),
    linkedinUrl: z.string().url().optional().or(z.literal("")),
    fieldCategory: z.string().min(1).max(100),
  }),
  mentoring: z.object({
    preference: z.enum(["none", "free", "paid"]),
    bookingUrl: z.string().url().optional().or(z.literal("")),
  }),
});

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = submitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { sessionId, interviewData, interviewTranscript, profile, mentoring } = parsed.data;

    const supabase = createAdminClient();

    // Check if session already submitted
    const { data: existing } = await supabase
      .from("expert_profiles")
      .select("id")
      .eq("interview_session_id", sessionId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Session already submitted" },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("expert_profiles")
      .insert({
        interview_session_id: sessionId,
        name: sanitizeExpertInput(profile.name),
        title: sanitizeExpertInput(profile.title),
        company: sanitizeExpertInput(profile.company),
        field_category: sanitizeExpertInput(profile.fieldCategory),
        linkedin_url: sanitizeUrl(profile.linkedinUrl) ?? null,
        interview_data: interviewData,
        interview_transcript: interviewTranscript,
        mentoring_preference: mentoring.preference,
        booking_url: sanitizeUrl(mentoring.bookingUrl) ?? null,
        ip_address: getClientIp(request),
        user_agent: request.headers.get("user-agent") ?? null,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      console.error("[expert-interview/submit] db error", error);
      return NextResponse.json({ error: "Failed to save submission" }, { status: 500 });
    }

    return NextResponse.json({ success: true, expertProfileId: data.id });
  } catch (error) {
    console.error("[expert-interview/submit] failed", error);
    return NextResponse.json({ error: "Failed to submit interview" }, { status: 500 });
  }
}
