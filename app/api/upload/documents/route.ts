import { NextRequest, NextResponse } from "next/server";
import { b2 } from "@/lib/backblaze";
import {
  validateFile,
  ALLOWED_DOCUMENT_TYPES,
  MAX_DOCUMENT_SIZE,
} from "@/lib/constants/upload";
import { requireUploadAccess } from "@/lib/security/upload-access";
import { safeServerError } from "@/lib/security/route-guards";

function validateDocumentFile(file: File): { valid: boolean; error?: string } {
  return validateFile(
    file.name,
    file.size,
    file.type,
    ALLOWED_DOCUMENT_TYPES,
    MAX_DOCUMENT_SIZE,
  );
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check (basic)
    const userAgent = request.headers.get("user-agent") || "";
    if (userAgent.includes("bot") || userAgent.includes("crawler")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Parse form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const file = formData.get("file") as File;
    const nodeId = formData.get("nodeId") as string;

    // Validate inputs
    if (!nodeId || typeof nodeId !== "string" || nodeId.trim().length === 0) {
      return NextResponse.json(
        { error: "Valid nodeId is required" },
        { status: 400 },
      );
    }

    // Authenticate and authorize
    const access = await requireUploadAccess(nodeId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    const fileValidation = validateDocumentFile(file);
    if (!fileValidation.valid) {
      return NextResponse.json(
        { error: fileValidation.error },
        { status: 400 },
      );
    }

    // Upload to Backblaze B2
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
      category: "document",
    });
  } catch (error) {
    return safeServerError(
      "Internal server error. Please try again later.",
      error,
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    const isHealthy = await b2.healthCheck();

    if (isHealthy) {
      return NextResponse.json({
        status: "healthy",
        service: "document-upload",
        maxSize: `${MAX_DOCUMENT_SIZE / (1024 * 1024)}MB`,
        allowedTypes: Array.from(ALLOWED_DOCUMENT_TYPES),
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json(
        {
          status: "unhealthy",
          service: "document-upload",
          timestamp: new Date().toISOString(),
        },
        { status: 503 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        service: "document-upload",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
