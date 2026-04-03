import { NextRequest, NextResponse } from "next/server";
import {
  getMentorBySessionToken,
  updateMentorProfile,
  MENTOR_SESSION_COOKIE,
} from "@/lib/hackathon/mentor-db";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(MENTOR_SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mentor = await getMentorBySessionToken(token);
  if (!mentor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("photo") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `mentors/${mentor.id}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const supabase = getAdminClient();
    const { error: uploadError } = await supabase.storage
      .from("mentor-photos")
      .upload(path, buffer, { upsert: true, contentType: file.type });
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("mentor-photos").getPublicUrl(path);

    const updated = await updateMentorProfile(mentor.id, { photo_url: publicUrl });
    return NextResponse.json({ mentor: updated });
  } catch (err) {
    console.error("Photo upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
