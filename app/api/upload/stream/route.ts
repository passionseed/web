import { NextRequest, NextResponse } from "next/server";
import { b2 } from "@/lib/backblaze";
import {
  validateFile,
  ALLOWED_GENERAL_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  MAX_FILE_SIZE,
} from "@/lib/constants/upload";
import { requireUploadAccess } from "@/lib/security/upload-access";
import { safeServerError } from "@/lib/security/route-guards";

export async function POST(request: NextRequest) {
  try {
    const nodeId = request.headers.get("x-node-id");
    const fileName = request.headers.get("x-file-name");
    const fileType = request.headers.get("x-file-type");
    const fileSizeStr = request.headers.get("x-file-size");
    const uploadType = request.headers.get("x-upload-type") || "submission";

    if (!nodeId || !fileName || !fileType || !fileSizeStr) {
      return NextResponse.json({ error: "Missing required metadata in headers" }, { status: 400 });
    }

    const access = await requireUploadAccess(nodeId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const fileSize = parseInt(fileSizeStr, 10);
    if (isNaN(fileSize) || fileSize <= 0) {
      return NextResponse.json({ error: "Invalid file size" }, { status: 400 });
    }

    const allowedTypes = uploadType === "map-content" ? ALLOWED_DOCUMENT_TYPES : ALLOWED_GENERAL_TYPES;
    const validation = validateFile(fileName, fileSize, fileType, allowedTypes, MAX_FILE_SIZE);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const body = request.body;
    if (!body) {
      return NextResponse.json({ error: "No file data received" }, { status: 400 });
    }

    const chunks: Uint8Array[] = [];
    const reader = body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // ignore
      }
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    if (totalLength !== fileSize) {
      return NextResponse.json({ error: "Upload incomplete" }, { status: 400 });
    }

    const fileBuffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      fileBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    const file = new File([fileBuffer], fileName, { type: fileType });

    let customPath: string | undefined;
    if (uploadType === "map-content") {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).slice(2, 15);
      const safeExt = (fileName.split(".").pop() || "bin").replace(/[^a-zA-Z0-9]/g, "");
      customPath = `maps/${nodeId}/content/${timestamp}_${randomString}.${safeExt || "bin"}`;
    }

    const uploadResult = await b2.uploadFile(file, access.userId, nodeId, customPath);

    return NextResponse.json({
      success: true,
      fileUrl: uploadResult.fileUrl,
      fileName: uploadResult.fileName,
      fileId: uploadResult.fileId,
      originalName: fileName,
      size: fileSize,
      type: fileType,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    return safeServerError("Internal server error. Please try again later.", error);
  }
}
