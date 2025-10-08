import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { b2 } from "@/lib/backblaze";
import {
  validateFile,
  ALLOWED_DOCUMENT_TYPES,
  MAX_DOCUMENT_SIZE,
} from "@/lib/constants/upload";

function validateDocumentFile(file: File): { valid: boolean; error?: string } {
  return validateFile(
    file.name,
    file.size,
    file.type,
    ALLOWED_DOCUMENT_TYPES,
    MAX_DOCUMENT_SIZE
  );
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

    const fileValidation = validateDocumentFile(file);
    if (!fileValidation.valid) {
      return NextResponse.json(
        { error: fileValidation.error },
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
    } else {
      console.log("Skipping node validation for temporary node ID:", nodeId);
    }

    // Upload to Backblaze B2
    let uploadResult;
    try {
      console.log("Starting B2 document upload for user:", user.id, "node:", nodeId);
      uploadResult = await b2.uploadFile(file, user.id, nodeId);
      console.log("B2 document upload successful:", uploadResult.fileName);
    } catch (uploadError) {
      console.error("B2 document upload failed:", uploadError);

      const errorMessage =
        uploadError instanceof Error
          ? uploadError.message
          : "Document upload service unavailable";
      return NextResponse.json(
        {
          error: `Document upload failed: ${errorMessage}`,
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
      `Document uploaded successfully: ${uploadResult.fileName} by user ${user.id}`
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
      category: "document",
    });
  } catch (error) {
    console.error("Document upload API error:", error);

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
          timestamp: new Date().toISOString() 
        },
        { status: 503 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { 
        status: "error", 
        service: "document-upload",
        timestamp: new Date().toISOString() 
      },
      { status: 503 }
    );
  }
}