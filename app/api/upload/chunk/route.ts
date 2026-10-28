import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { ALLOWED_UPLOAD_TYPES, MAX_FILE_SIZE, validateFile } from "@/lib/constants/upload";
import { b2 } from "@/lib/backblaze";
import { requireUploadAccess } from "@/lib/security/upload-access";
import { safeServerError } from "@/lib/security/route-guards";

const MAX_CHUNK_SIZE = 3 * 1024 * 1024;
const MAX_CHUNKS = Math.ceil(MAX_FILE_SIZE / MAX_CHUNK_SIZE);
const MAX_SESSIONS = 20;
const MAX_USER_SESSIONS = 3;
const busySessions = new Set<string>();

function isValidChunkHeader(sessionId: string, chunkIndex: number, totalChunks: number): boolean {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(sessionId)) return false;
  if (!Number.isSafeInteger(chunkIndex) || !Number.isSafeInteger(totalChunks)) return false;
  if (totalChunks < 1 || totalChunks > MAX_CHUNKS) return false;
  return chunkIndex >= 0 && chunkIndex < totalChunks;
}

const uploadSessions = new Map<
  string,
  {
    chunks: Map<number, Uint8Array>;
    metadata: {
      fileName: string;
      fileType: string;
      totalChunks: number;
      totalSize: number;
      nodeId: string;
      userId: string;
      uploadType: string;
    };
    createdAt: number;
  }
>();

setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [sessionId, session] of uploadSessions.entries()) {
    if (session.createdAt < oneHourAgo) {
      uploadSessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const sessionId = request.headers.get("x-upload-session-id");
    const chunkIndexStr = request.headers.get("x-chunk-index");
    const totalChunksStr = request.headers.get("x-total-chunks");
    const fileName = request.headers.get("x-file-name");
    const fileType = request.headers.get("x-file-type");
    const fileSizeStr = request.headers.get("x-file-size");
    const nodeId = request.headers.get("x-node-id");
    const uploadType = request.headers.get("x-upload-type") || "submission";

    if (!sessionId || !chunkIndexStr || !totalChunksStr) {
      return NextResponse.json({ error: "Missing required headers" }, { status: 400 });
    }

    const chunkIndex = Number(chunkIndexStr);
    const totalChunks = Number(totalChunksStr);
    if (!isValidChunkHeader(sessionId, chunkIndex, totalChunks)) {
      return NextResponse.json({ error: "Invalid chunk metadata" }, { status: 400 });
    }

    let session = uploadSessions.get(sessionId);
    if (!session) {
      if (chunkIndex !== 0 || !fileName || !fileType || !fileSizeStr || !nodeId) {
        return NextResponse.json({ error: "Missing file metadata for first chunk" }, { status: 400 });
      }
      const totalSize = Number(fileSizeStr);
      const validation = validateFile(fileName, totalSize, fileType, ALLOWED_UPLOAD_TYPES, MAX_FILE_SIZE);
      if (!Number.isSafeInteger(totalSize) || totalSize <= 0 || !validation.valid ||
          totalChunks !== Math.ceil(totalSize / MAX_CHUNK_SIZE) ||
          !["submission", "map-content"].includes(uploadType)) {
        return NextResponse.json({ error: validation.error || "Invalid file metadata" }, { status: 400 });
      }
      const access = await requireUploadAccess(nodeId);
      if (!access.ok || access.userId !== user.id) {
        return NextResponse.json({ error: access.ok ? "Access denied" : access.error }, { status: access.ok ? 403 : access.status });
      }
      // Recheck after the asynchronous access check to avoid duplicate sessions.
      session = uploadSessions.get(sessionId);
      if (!session) {
        const userSessions = [...uploadSessions.values()].filter((item) => item.metadata.userId === user.id).length;
        if (uploadSessions.size >= MAX_SESSIONS || userSessions >= MAX_USER_SESSIONS) {
          return NextResponse.json({ error: "Too many uploads in progress" }, { status: 429 });
        }
        session = { chunks: new Map(), metadata: { fileName, fileType, totalChunks, totalSize, nodeId, userId: user.id, uploadType }, createdAt: Date.now() };
        uploadSessions.set(sessionId, session);
      }
    }

    if (session.metadata.userId !== user.id || session.metadata.totalChunks !== totalChunks ||
        session.metadata.nodeId !== nodeId || session.metadata.uploadType !== uploadType) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    if (busySessions.has(sessionId)) {
      return NextResponse.json({ error: "Upload already in progress" }, { status: 409 });
    }
    const body = request.body;
    if (!body) return NextResponse.json({ error: "No chunk data received" }, { status: 400 });
    const expectedSize = Math.min(MAX_CHUNK_SIZE, session.metadata.totalSize - chunkIndex * MAX_CHUNK_SIZE);
    busySessions.add(sessionId);
    const parts: Uint8Array[] = [];
    let totalLength = 0;
    const reader = body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalLength += value.length;
        if (totalLength > expectedSize) {
          await reader.cancel();
          return NextResponse.json({ error: "Chunk too large" }, { status: 400 });
        }
        parts.push(value);
      }
    } finally {
      reader.releaseLock();
      busySessions.delete(sessionId);
    }
    if (totalLength !== expectedSize) return NextResponse.json({ error: "Invalid chunk size" }, { status: 400 });
    const chunkBuffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const part of parts) {
      chunkBuffer.set(part, offset);
      offset += part.length;
    }

    session.chunks.set(chunkIndex, chunkBuffer);

    if (session.chunks.size !== session.metadata.totalChunks) {
      return NextResponse.json({
        success: true,
        complete: false,
        chunksReceived: session.chunks.size,
        totalChunks: session.metadata.totalChunks,
      });
    }

    const sortedChunks = Array.from(session.chunks.entries())
      .sort(([a], [b]) => a - b)
      .map(([, chunk]) => chunk);

    const totalFileLength = sortedChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    if (totalFileLength !== session.metadata.totalSize) {
      uploadSessions.delete(sessionId);
      return NextResponse.json({ error: "Size mismatch" }, { status: 400 });
    }

    const completeFile = new Uint8Array(totalFileLength);
    let fileOffset = 0;
    for (const chunk of sortedChunks) {
      completeFile.set(chunk, fileOffset);
      fileOffset += chunk.length;
    }

    const file = new File([completeFile], session.metadata.fileName, {
      type: session.metadata.fileType,
    });

    let customPath: string | undefined;
    if (session.metadata.uploadType === "map-content") {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).slice(2, 15);
      const safeExt =
        (session.metadata.fileName.split(".").pop() || "bin").replace(/[^a-zA-Z0-9]/g, "") ||
        "bin";
      customPath = `maps/${session.metadata.nodeId}/content/${timestamp}_${randomString}.${safeExt}`;
    }

    const uploadResult = await b2.uploadFile(
      file,
      session.metadata.userId,
      session.metadata.nodeId,
      customPath
    );

    uploadSessions.delete(sessionId);

    return NextResponse.json({
      success: true,
      complete: true,
      fileUrl: uploadResult.fileUrl,
      fileName: uploadResult.fileName,
      fileId: uploadResult.fileId,
      originalName: session.metadata.fileName,
      size: session.metadata.totalSize,
      type: session.metadata.fileType,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    return safeServerError("Internal server error. Please try again later.", error);
  }
}
