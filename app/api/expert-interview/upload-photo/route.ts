import { NextRequest, NextResponse } from "next/server";
import { ALLOWED_IMAGE_TYPES } from "@/lib/constants/upload";
import { checkRateLimit } from "@/lib/expert-interview/rate-limiter";
import { hasValidSession } from "@/lib/expert-interview/session-token";
import { storageManager } from "@/lib/storage/storage-manager";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_UPLOADS_PER_SESSION_HOUR = 10;
// Name the stored file from the checked MIME type, never the client's file name.
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const sessionId = formData.get("sessionId");

    if (!sessionId || typeof sessionId !== "string" || !SESSION_ID_PATTERN.test(sessionId)) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    if (!hasValidSession(request, sessionId)) {
      return NextResponse.json({ error: "Interview session expired. Please start again." }, { status: 401 });
    }
    if (!(await checkRateLimit(`photo:${sessionId}`, MAX_UPLOADS_PER_SESSION_HOUR)).allowed) {
      return NextResponse.json({ error: "Too many uploads. Please try again later." }, { status: 429 });
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    if (file.size === 0 || file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File must be under 5MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = IMAGE_EXTENSIONS[file.type];
    const fileName = `expert_avatars/${sessionId}-${Date.now()}.${ext}`;

    const result = await storageManager.uploadImage(buffer, fileName, file.type);

    return NextResponse.json({ photoUrl: result.url });
  } catch (error) {
    console.error("[expert-interview/upload-photo] failed", error);
    return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
  }
}
