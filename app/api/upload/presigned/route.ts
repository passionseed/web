import { NextRequest, NextResponse } from "next/server";
import { b2 } from "@/lib/backblaze";
import { requireUploadAccess } from "@/lib/security/upload-access";
import { safeServerError } from "@/lib/security/route-guards";
import {
  validateFile,
  ALLOWED_GENERAL_TYPES,
  MAX_GENERAL_SIZE,
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

    if (!fileName || typeof fileName !== "string" || fileName.trim().length === 0) {
      return NextResponse.json({ error: "Valid fileName is required" }, { status: 400 });
    }

    if (!fileType || typeof fileType !== "string") {
      return NextResponse.json({ error: "Valid fileType is required" }, { status: 400 });
    }

    if (!fileSize || typeof fileSize !== "number" || fileSize <= 0) {
      return NextResponse.json({ error: "Valid fileSize is required" }, { status: 400 });
    }

    const fileValidation = validateFile(
      fileName,
      fileSize,
      fileType,
      ALLOWED_GENERAL_TYPES,
      MAX_GENERAL_SIZE
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
