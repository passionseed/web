import { NextRequest, NextResponse } from "next/server";
import {
  getMentorBySessionToken,
  updateMentorProfile,
  MENTOR_SESSION_COOKIE,
} from "@/lib/hackathon/mentor-db";
import type { MentorProfile } from "@/types/mentor";

async function getAuthenticatedMentor(req: NextRequest): Promise<MentorProfile | null> {
  const token = req.cookies.get(MENTOR_SESSION_COOKIE)?.value;
  if (!token) return null;
  return getMentorBySessionToken(token);
}

export async function GET(req: NextRequest) {
  const mentor = await getAuthenticatedMentor(req);
  if (!mentor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ mentor });
}

export async function PATCH(req: NextRequest) {
  const mentor = await getAuthenticatedMentor(req);
  if (!mentor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const allowed = [
      "full_name",
      "profession",
      "institution",
      "bio",
      "photo_url",
      "session_type",
      "instagram_url",
      "linkedin_url",
      "website_url",
    ] as const;
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    const updated = await updateMentorProfile(mentor.id, updates);
    return NextResponse.json({ mentor: updated });
  } catch (err) {
    console.error("Mentor profile update error:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
