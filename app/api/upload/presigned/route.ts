import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { b2 } from "@/lib/backblaze";

/**
 * Generate a presigned POST URL for direct client-to-B2 uploads
 * This bypasses Vercel's 4MB serverless function payload limit
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

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { nodeId, fileName, fileType, fileSize, uploadType } = body;

    // Validate inputs
    if (!nodeId || typeof nodeId !== "string" || nodeId.trim().length === 0) {
      return NextResponse.json(
        { error: "Valid nodeId is required" },
        { status: 400 }
      );
    }

    // Validate upload type
    const validUploadTypes = ["submission", "map-content"];
    const finalUploadType = uploadType && validUploadTypes.includes(uploadType)
      ? uploadType
      : "submission";

    if (!fileName || typeof fileName !== "string" || fileName.trim().length === 0) {
      return NextResponse.json(
        { error: "Valid fileName is required" },
        { status: 400 }
      );
    }

    if (!fileType || typeof fileType !== "string") {
      return NextResponse.json(
        { error: "Valid fileType is required" },
        { status: 400 }
      );
    }

    if (!fileSize || typeof fileSize !== "number" || fileSize <= 0) {
      return NextResponse.json(
        { error: "Valid fileSize is required" },
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

    // Check if user has access to this node (skip validation for temporary node IDs)
    if (!nodeId.startsWith("temp_node_")) {
      try {
        const { data: nodeExists, error: nodeError } = await supabase
          .from("map_nodes")
          .select("id, map_id, title")
          .eq("id", nodeId)
          .single();

        if (nodeError || !nodeExists) {
          console.error("Node validation error:", nodeError);
          return NextResponse.json(
            {
              error: "Node not found or access denied",
              details:
                process.env.NODE_ENV === "development"
                  ? nodeError?.message
                  : undefined,
            },
            { status: 403 }
          );
        }

        console.log("Node validation passed:", nodeExists.title);
      } catch (validationError) {
        console.error("Node validation exception:", validationError);
        return NextResponse.json(
          {
            error: "Unable to validate node access",
            details:
              process.env.NODE_ENV === "development"
                ? String(validationError)
                : undefined,
          },
          { status: 500 }
        );
      }
    }

    // Generate presigned POST URL
    try {
      const presignedData = await b2.getPresignedUploadUrl(
        user.id,
        nodeId,
        fileName,
        fileType,
        fileSize,
        finalUploadType as "submission" | "map-content",
        3600 // 1 hour expiration
      );

      console.log("Presigned PUT URL generated for user:", user.id, "node:", nodeId);

      // Construct the final file URL
      const fileUrl = `https://${process.env.B2_BUCKET_NAME}.${process.env.B2_ENDPOINT || "s3.us-west-000.backblazeb2.com"}/${presignedData.fileKey}`;

      return NextResponse.json({
        success: true,
        uploadUrl: presignedData.uploadUrl,
        method: presignedData.method,
        fileKey: presignedData.fileKey,
        fileUrl: fileUrl,
      });
    } catch (uploadError) {
      console.error("Presigned URL generation failed:", uploadError);

      const errorMessage =
        uploadError instanceof Error
          ? uploadError.message
          : "Presigned URL generation failed";
      return NextResponse.json(
        {
          error: errorMessage,
          details:
            process.env.NODE_ENV === "development"
              ? String(uploadError)
              : undefined,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Presigned upload API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error. Please try again later.",
        details:
          process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
