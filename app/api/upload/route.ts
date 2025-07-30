import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { b2 } from "@/lib/backblaze";

// File type validation
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "application/json",
  "text/csv",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function validateFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  if (file.size === 0) {
    return { valid: false, error: "File is empty" };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    };
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { valid: false, error: `File type '${file.type}' is not allowed` };
  }

  // Check file name
  if (file.name.length > 255) {
    return { valid: false, error: "File name too long" };
  }

  // Check for suspicious file extensions
  const fileName = file.name.toLowerCase();
  const dangerousExtensions = [".exe", ".bat", ".cmd", ".scr", ".vbs", ".js"];
  if (dangerousExtensions.some((ext) => fileName.endsWith(ext))) {
    return {
      valid: false,
      error: "File type not allowed for security reasons",
    };
  }

  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check (basic)
    const userAgent = request.headers.get("user-agent") || "";
    if (userAgent.includes("bot") || userAgent.includes("crawler")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

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
        { status: 400 }
      );
    }

    const fileValidation = validateFile(file);
    if (!fileValidation.valid) {
      return NextResponse.json(
        { error: fileValidation.error },
        { status: 400 }
      );
    }

    // Check if user has access to this node (simplified check - just verify node exists)
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

    // Upload to Backblaze B2
    let uploadResult;
    try {
      console.log("Starting B2 upload for user:", user.id, "node:", nodeId);
      uploadResult = await b2.uploadFile(file, user.id, nodeId);
      console.log("B2 upload successful:", uploadResult.fileName);
    } catch (uploadError) {
      console.error("B2 upload failed:", uploadError);

      // Return user-friendly error
      const errorMessage =
        uploadError instanceof Error
          ? uploadError.message
          : "Upload service unavailable";
      return NextResponse.json(
        {
          error: `Upload failed: ${errorMessage}`,
          details:
            process.env.NODE_ENV === "development"
              ? String(uploadError)
              : undefined,
        },
        { status: 500 }
      );
    }

    // Log successful upload
    console.log(
      `File uploaded successfully: ${uploadResult.fileName} by user ${user.id}`
    );

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
    console.error("Upload API error:", error);

    // Generic error response for unexpected issues
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

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("fileName");

    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json(
        { error: "Valid fileName is required" },
        { status: 400 }
      );
    }

    // Security check: ensure user can only delete their own files
    if (!fileName.includes(`submissions/${user.id}/`)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Delete from Backblaze B2
    try {
      await b2.deleteFile(fileName);
    } catch (deleteError) {
      console.error("B2 delete failed:", deleteError);

      const errorMessage =
        deleteError instanceof Error
          ? deleteError.message
          : "Delete service unavailable";
      return NextResponse.json(
        {
          error: `Delete failed: ${errorMessage}`,
        },
        { status: 500 }
      );
    }

    console.log(`File deleted successfully: ${fileName} by user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Delete API error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
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
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json(
        { status: "unhealthy", timestamp: new Date().toISOString() },
        { status: 503 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { status: "error", timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
