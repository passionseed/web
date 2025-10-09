import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { b2 } from "@/lib/backblaze";

/**
 * Chunked upload endpoint - accepts file chunks under 4MB
 * Bypasses Vercel's payload limit by splitting large files into chunks
 */

// Store upload sessions in memory (in production, use Redis or database)
const uploadSessions = new Map<string, {
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
}>();

// Clean up old sessions (older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [sessionId, session] of uploadSessions.entries()) {
    if (session.createdAt < oneHourAgo) {
      uploadSessions.delete(sessionId);
      console.log(`Cleaned up expired upload session: ${sessionId}`);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get metadata from headers
    const sessionId = request.headers.get("x-upload-session-id");
    const chunkIndexStr = request.headers.get("x-chunk-index");
    const totalChunksStr = request.headers.get("x-total-chunks");
    const fileName = request.headers.get("x-file-name");
    const fileType = request.headers.get("x-file-type");
    const fileSizeStr = request.headers.get("x-file-size");
    const nodeId = request.headers.get("x-node-id");
    const uploadType = request.headers.get("x-upload-type") || "submission";

    if (!sessionId || !chunkIndexStr || !totalChunksStr) {
      return NextResponse.json(
        { error: "Missing required headers" },
        { status: 400 }
      );
    }

    const chunkIndex = parseInt(chunkIndexStr, 10);
    const totalChunks = parseInt(totalChunksStr, 10);

    // Validate chunk data
    if (isNaN(chunkIndex) || isNaN(totalChunks) || chunkIndex >= totalChunks) {
      return NextResponse.json(
        { error: "Invalid chunk metadata" },
        { status: 400 }
      );
    }

    // Read chunk data from request body
    const body = request.body;
    if (!body) {
      return NextResponse.json(
        { error: "No chunk data received" },
        { status: 400 }
      );
    }

    const chunks: Uint8Array[] = [];
    const reader = body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } catch (streamError) {
      console.error("Error reading chunk stream:", streamError);
      return NextResponse.json(
        { error: "Failed to read chunk data" },
        { status: 500 }
      );
    } finally {
      try {
        reader.releaseLock();
      } catch (releaseError) {
        console.warn("Failed to release reader lock:", releaseError);
      }
    }

    // Combine chunk pieces
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const chunkBuffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      chunkBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    console.log(`Received chunk ${chunkIndex + 1}/${totalChunks} (${chunkBuffer.length} bytes) for session ${sessionId}`);

    // Get or create upload session
    let session = uploadSessions.get(sessionId);

    if (!session) {
      // First chunk - create new session
      if (!fileName || !fileType || !fileSizeStr || !nodeId) {
        return NextResponse.json(
          { error: "Missing file metadata for first chunk" },
          { status: 400 }
        );
      }

      const totalSize = parseInt(fileSizeStr, 10);
      if (isNaN(totalSize)) {
        return NextResponse.json(
          { error: "Invalid file size" },
          { status: 400 }
        );
      }

      session = {
        chunks: new Map(),
        metadata: {
          fileName,
          fileType,
          totalChunks,
          totalSize,
          nodeId,
          userId: user.id,
          uploadType,
        },
        createdAt: Date.now(),
      };

      uploadSessions.set(sessionId, session);
      console.log(`Created new upload session: ${sessionId}`);
    }

    // Store chunk
    session.chunks.set(chunkIndex, chunkBuffer);

    // Check if all chunks received
    if (session.chunks.size === session.metadata.totalChunks) {
      console.log(`All chunks received for session ${sessionId}, assembling file...`);

      // Assemble all chunks in order
      const sortedChunks = Array.from(session.chunks.entries())
        .sort(([a], [b]) => a - b)
        .map(([_, chunk]) => chunk);

      const totalFileLength = sortedChunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const completeFile = new Uint8Array(totalFileLength);
      let fileOffset = 0;

      for (const chunk of sortedChunks) {
        completeFile.set(chunk, fileOffset);
        fileOffset += chunk.length;
      }

      console.log(`File assembled: ${completeFile.length} bytes, expected: ${session.metadata.totalSize}`);

      // Validate assembled file size
      if (completeFile.length !== session.metadata.totalSize) {
        uploadSessions.delete(sessionId);
        return NextResponse.json(
          {
            error: `Size mismatch: received ${completeFile.length} bytes, expected ${session.metadata.totalSize} bytes`,
          },
          { status: 400 }
        );
      }

      // Create File object and upload to B2
      const file = new File(
        [completeFile],
        session.metadata.fileName,
        { type: session.metadata.fileType }
      );

      try {
        let customPath: string | undefined;

        if (session.metadata.uploadType === "map-content") {
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(2, 15);
          const sanitizedName = session.metadata.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
          const fileExtension = sanitizedName.split(".").pop() || "bin";
          customPath = `maps/${session.metadata.nodeId}/content/${timestamp}_${randomString}.${fileExtension}`;
        }

        const uploadResult = await b2.uploadFile(
          file,
          session.metadata.userId,
          session.metadata.nodeId,
          customPath
        );

        // Clean up session
        uploadSessions.delete(sessionId);

        console.log(`Upload complete for session ${sessionId}: ${uploadResult.fileName}`);

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
      } catch (uploadError) {
        uploadSessions.delete(sessionId);
        console.error("B2 upload failed:", uploadError);

        const errorMessage =
          uploadError instanceof Error
            ? uploadError.message
            : "Upload service unavailable";

        return NextResponse.json(
          { error: `Upload failed: ${errorMessage}` },
          { status: 500 }
        );
      }
    } else {
      // More chunks expected
      return NextResponse.json({
        success: true,
        complete: false,
        chunksReceived: session.chunks.size,
        totalChunks: session.metadata.totalChunks,
      });
    }
  } catch (error) {
    console.error("Chunk upload API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error. Please try again later.",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
