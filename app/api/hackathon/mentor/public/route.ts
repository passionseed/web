import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { MentorProfile } from "@/types/mentor";
import { getCorsHeaders } from "@/lib/hackathon/auth";

export const runtime = "edge";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req, "GET, OPTIONS") });
}

export async function GET(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req, "GET, OPTIONS");
  const { searchParams } = new URL(req.url);
  const sessionType = searchParams.get("session_type");

  let query = getClient()
    .from("mentor_profiles")
    .select("id, full_name, profession, institution, bio, photo_url, session_type, is_approved, is_accepting_bookings, instagram_url, linkedin_url, website_url")
    .eq("is_approved", true);

  if (sessionType === "healthcare" || sessionType === "group") {
    query = query.eq("session_type", sessionType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Mentor public list error:", error);
    return NextResponse.json({ error: "Failed to fetch mentors" }, { status: 500, headers: corsHeaders });
  }

  return NextResponse.json({ mentors: data ?? [] }, { headers: corsHeaders });
}
