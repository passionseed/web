import { NextRequest, NextResponse } from "next/server";
import { b2 } from "@/lib/backblaze";
import { requireUploadAccess } from "@/lib/security/upload-access";
import { safeServerError } from "@/lib/security/route-guards";
import {
  validateFile,
  ALLOWED_GENERAL_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  MAX_FILE_SIZE,
} from "@/lib/constants/upload";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nodeId, fileName, fileType, fileSize, uploadType } = body;

    if (!nodeId || typeof nodeId !== "string" || nodeId.trim().length === 0) {
      return NextResponse.json({ error: "Valid nodeId is required" }, { status: 400 });
    }

    const access = await requireUploadAccess(nodeId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const validUploadTypes = ["submission", "map-content"];
    const finalUploadType = uploadType && validUploadTypes.includes(uploadType) ? uploadType : "submission";

    const allowedTypes = finalUploadType === "map-content" ? ALLOWED_DOCUMENT_TYPES : ALLOWED_GENERAL_TYPES;

    // Use shared validation logic to enforce secure file types and extensions
    const fileValidation = validateFile(
      fileName || "",
      fileSize || 0,
      fileType || "",
      allowedTypes,
      MAX_FILE_SIZE
    );

    if (!fileValidation.valid) {
      return NextResponse.json({ error: fileValidation.error }, { status: 400 });
    }

    const presignedData = await b2.getPresignedUploadUrl(
      access.userId,
      nodeId,
      fileName,
      fileType,
      fileSize,
      finalUploadType as "submission" | "map-content",
      3600
    );

    const fileUrl = `https://${process.env.B2_BUCKET_NAME}.${process.env.B2_ENDPOINT || "s3.us-west-000.backblazeb2.com"}/${presignedData.fileKey}`;

    return NextResponse.json({
      success: true,
      uploadUrl: presignedData.uploadUrl,
      method: presignedData.method,
      fileKey: presignedData.fileKey,
      fileUrl,
    });
  } catch (error) {
    return safeServerError("Internal server error. Please try again later.", error);
  }
}
