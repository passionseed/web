import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { b2 } from "@/lib/backblaze";

// Image file type validation
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  if (file.size === 0) {
    return { valid: false, error: "File is empty" };
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: `Image too large. Maximum size is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`,
    };
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { valid: false, error: `Image type '${file.type}' is not allowed. Please use JPG, PNG, GIF, or WebP` };
  }

  // Check file name
  if (file.name.length > 255) {
    return { valid: false, error: "File name too long" };
  }

  // Check for valid image extensions
  const fileName = file.name.toLowerCase();
  const validExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  if (!validExtensions.some(ext => fileName.endsWith(ext))) {
    return {
      valid: false,
      error: "Invalid image file extension. Please use .jpg, .jpeg, .png, .gif, or .webp",
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

    const fileValidation = validateImageFile(file);
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

    // Upload to Backblaze B2 with image-specific path
    let uploadResult;
    try {
      console.log("Starting B2 image upload for user:", user.id, "node:", nodeId);
      uploadResult = await b2.uploadFile(file, user.id, nodeId);
      console.log("B2 image upload successful:", uploadResult.fileName);
    } catch (uploadError) {
      console.error("B2 image upload failed:", uploadError);

      const errorMessage =
        uploadError instanceof Error
          ? uploadError.message
          : "Image upload service unavailable";
      return NextResponse.json(
        {
          error: `Image upload failed: ${errorMessage}`,
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
      `Image uploaded successfully: ${uploadResult.fileName} by user ${user.id}`
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
      category: "image",
    });
  } catch (error) {
    console.error("Image upload API error:", error);

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
        service: "image-upload",
        maxSize: `${MAX_IMAGE_SIZE / (1024 * 1024)}MB`,
        allowedTypes: Array.from(ALLOWED_IMAGE_TYPES),
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json(
        { 
          status: "unhealthy", 
          service: "image-upload",
          timestamp: new Date().toISOString() 
        },
        { status: 503 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { 
        status: "error", 
        service: "image-upload",
        timestamp: new Date().toISOString() 
      },
      { status: 503 }
    );
  }
}