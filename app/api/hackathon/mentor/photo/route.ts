import { NextRequest, NextResponse } from "next/server";
import {
  getMentorBySessionToken,
  updateMentorProfile,
  MENTOR_SESSION_COOKIE,
} from "@/lib/hackathon/mentor-db";
import { b2 } from "@/lib/backblaze";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  const token = req.cookies.get(MENTOR_SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mentor = await getMentorBySessionToken(token);
  if (!mentor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("photo") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Backblaze B2 under mentors/photos/
    const result = await b2.uploadImageBuffer(
      buffer,
      `mentor_${mentor.id}.${ext}`,
      file.type,
      { userId: mentor.id }
    );

    const updated = await updateMentorProfile(mentor.id, { photo_url: result.fileUrl });
    return NextResponse.json({ mentor: updated });
  } catch (err) {
    console.error("Photo upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
