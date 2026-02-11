import { NextRequest, NextResponse } from "next/server";
import { b2 } from "@/lib/backblaze";
import { requireUploadAccess } from "@/lib/security/upload-access";
import { safeServerError } from "@/lib/security/route-guards";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"]);
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) return { valid: false, error: "No file provided" };
  if (file.size === 0) return { valid: false, error: "File is empty" };
  if (file.size > MAX_IMAGE_SIZE) return { valid: false, error: "Image too large" };
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return { valid: false, error: "Image type is not allowed" };
  if (file.name.length > 255) return { valid: false, error: "File name too long" };
  if (![".jpg", ".jpeg", ".png", ".gif", ".webp"].some((ext) => file.name.toLowerCase().endsWith(ext))) {
    return { valid: false, error: "Invalid image file extension" };
  }

  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const nodeId = formData.get("nodeId") as string;

    if (!nodeId || typeof nodeId !== "string" || nodeId.trim().length === 0) {
      return NextResponse.json({ error: "Valid nodeId is required" }, { status: 400 });
    }

    const access = await requireUploadAccess(nodeId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const uploadResult = await b2.uploadFile(file, access.userId, nodeId);

    return NextResponse.json({
      success: true,
      fileUrl: uploadResult.fileUrl,
      fileName: uploadResult.fileName,
      fileId: uploadResult.fileId,
      originalName: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      category: "image",
    });
  } catch (error) {
    return safeServerError("Internal server error. Please try again later.", error);
  }
}

export async function GET() {
  try {
    const isHealthy = await b2.healthCheck();

    if (isHealthy) {
      return NextResponse.json({
        status: "healthy",
        service: "image-upload",
        maxSize: `${MAX_IMAGE_SIZE / (1024 * 1024)}MB`,
        allowedTypes: Array.from(ALLOWED_IMAGE_TYPES),
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { status: "unhealthy", service: "image-upload", timestamp: new Date().toISOString() },
      { status: 503 }
    );
  } catch {
    return NextResponse.json(
      { status: "error", service: "image-upload", timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
