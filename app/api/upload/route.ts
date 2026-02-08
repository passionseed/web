import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { b2 } from "@/lib/backblaze";
import {
  validateFile as validateFileShared,
  ALLOWED_GENERAL_TYPES,
  MAX_GENERAL_SIZE,
} from "@/lib/constants/upload";
import { requireUploadAccess } from "@/lib/security/upload-access";
import { safeServerError } from "@/lib/security/route-guards";

function validateFile(file: File): { valid: boolean; error?: string } {
  return validateFileShared(
    file.name,
    file.size,
    file.type,
    ALLOWED_GENERAL_TYPES,
    MAX_GENERAL_SIZE
  );
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

    const fileValidation = validateFile(file);
    if (!fileValidation.valid) {
      return NextResponse.json({ error: fileValidation.error }, { status: 400 });
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
    });
  } catch (error) {
    return safeServerError("Internal server error. Please try again later.", error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("fileName");

    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json({ error: "Valid fileName is required" }, { status: 400 });
    }

    if (!fileName.includes(`submissions/${user.id}/`)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await b2.deleteFile(fileName);

    return NextResponse.json({ success: true, message: "File deleted successfully" });
  } catch (error) {
    return safeServerError("Internal server error. Please try again later.", error);
  }
}

export async function GET() {
  try {
    const isHealthy = await b2.healthCheck();

    if (isHealthy) {
      return NextResponse.json({ status: "healthy", timestamp: new Date().toISOString() });
    }

    return NextResponse.json(
      { status: "unhealthy", timestamp: new Date().toISOString() },
      { status: 503 }
    );
  } catch {
    return NextResponse.json(
      { status: "error", timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
