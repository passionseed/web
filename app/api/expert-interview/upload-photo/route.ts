import { NextRequest, NextResponse } from "next/server";
import { storageManager } from "@/lib/storage/storage-manager";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const sessionId = formData.get("sessionId");

    if (!sessionId || typeof sessionId !== "string" || !sessionId.trim()) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File must be under 5MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `expert_avatars/${sessionId}-${Date.now()}.${ext}`;

    const result = await storageManager.uploadImage(buffer, fileName, file.type);

    return NextResponse.json({ photoUrl: result.url });
  } catch (error) {
    console.error("[expert-interview/upload-photo] failed", error);
    return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
  }
}
