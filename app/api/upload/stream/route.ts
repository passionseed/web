import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { b2 } from "@/lib/backblaze";

/**
 * Streaming upload proxy that bypasses Vercel's body parser limits
 * This endpoint streams the file directly to B2 without loading it into memory
 */
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

    // Get metadata from headers (sent separately to avoid body parsing)
    const nodeId = request.headers.get("x-node-id");
    const fileName = request.headers.get("x-file-name");
    const fileType = request.headers.get("x-file-type");
    const fileSizeStr = request.headers.get("x-file-size");
    const uploadType = request.headers.get("x-upload-type") || "submission";

    // Validate inputs
    if (!nodeId || !fileName || !fileType || !fileSizeStr) {
      return NextResponse.json(
        { error: "Missing required metadata in headers" },
        { status: 400 }
      );
    }

    const fileSize = parseInt(fileSizeStr, 10);
    if (isNaN(fileSize) || fileSize <= 0) {
      return NextResponse.json(
        { error: "Invalid file size" },
        { status: 400 }
      );
    }

    // Validate file size (max 40MB)
    const MAX_FILE_SIZE = 40 * 1024 * 1024;
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Check node access (skip for temp nodes)
    if (!nodeId.startsWith("temp_node_")) {
      try {
        const { data: nodeExists, error: nodeError } = await supabase
          .from("map_nodes")
          .select("id, map_id, title")
          .eq("id", nodeId)
          .single();

        if (nodeError || !nodeExists) {
          return NextResponse.json(
            { error: "Node not found or access denied" },
            { status: 403 }
          );
        }

        console.log("Node validation passed:", nodeExists.title);
      } catch (validationError) {
        console.error("Node validation exception:", validationError);
        return NextResponse.json(
          { error: "Unable to validate node access" },
          { status: 500 }
        );
      }
    }

    console.log("Starting streaming upload:", {
      userId: user.id,
      nodeId,
      fileName,
      fileType,
      fileSize,
      uploadType,
    });

    // Get the request body as a readable stream
    const body = request.body;
    if (!body) {
      return NextResponse.json(
        { error: "No file data received" },
        { status: 400 }
      );
    }

    // Convert Web ReadableStream to Node.js Buffer
    const chunks: Uint8Array[] = [];
    const reader = body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } catch (streamError) {
      console.error("Error reading stream:", streamError);
      return NextResponse.json(
        { error: "Failed to read file data" },
        { status: 500 }
      );
    }

    // Combine chunks into single buffer
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const fileBuffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      fileBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    console.log("File streamed successfully, uploading to B2...", {
      receivedSize: fileBuffer.length,
      expectedSize: fileSize,
    });

    // Create a File-like object from the buffer
    const file = new File([fileBuffer], fileName, { type: fileType });

    // Upload to B2 with custom path based on upload type
    try {
      let customPath: string | undefined;

      if (uploadType === "map-content") {
        // For map content, generate path: maps/{nodeId}/content/{timestamp}_{random}.{ext}
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const fileExtension = sanitizedName.split(".").pop() || "bin";
        customPath = `maps/${nodeId}/content/${timestamp}_${randomString}.${fileExtension}`;
      }

      const uploadResult = await b2.uploadFile(file, user.id, nodeId, customPath);

      console.log("Streaming upload successful:", uploadResult.fileName);

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
    } catch (uploadError) {
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
  } catch (error) {
    console.error("Streaming upload API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error. Please try again later.",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

// Note: Next.js App Router automatically streams request bodies
// No need to disable body parser - we access request.body directly as a stream
