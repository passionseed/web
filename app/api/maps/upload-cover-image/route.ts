import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { StorageManager } from "@/lib/storage/storage-manager";

const storageManager = new StorageManager();

// Rate limiting map to track uploads per user
const uploadRateLimit = new Map<string, { count: number; resetTime: number }>();
const MAX_UPLOADS_PER_HOUR = 10;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

function checkRateLimit(userId: string): {
  allowed: boolean;
  retryAfter?: number;
} {
  const now = Date.now();
  const userLimit = uploadRateLimit.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize rate limit
    uploadRateLimit.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return { allowed: true };
  }

  if (userLimit.count >= MAX_UPLOADS_PER_HOUR) {
    const retryAfter = Math.ceil((userLimit.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  userLimit.count++;
  return { allowed: true };
}

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

    // Rate limiting
    const rateLimitResult = checkRateLimit(user.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Too many uploads in the past hour.",
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: rateLimitResult.retryAfter
            ? { "Retry-After": rateLimitResult.retryAfter.toString() }
            : {},
        }
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
    const mapId = formData.get("mapId") as string;

    // Optional parameters
    const maxWidth = parseInt(formData.get("maxWidth") as string) || 1200;
    const maxHeight = parseInt(formData.get("maxHeight") as string) || 800;
    const quality = parseInt(formData.get("quality") as string) || 85;

    // Validate inputs
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Valid image file is required" },
        { status: 400 }
      );
    }

    if (!mapId || typeof mapId !== "string" || mapId.trim().length === 0) {
      return NextResponse.json(
        { error: "Valid mapId is required" },
        { status: 400 }
      );
    }

    // Validate file using storage manager
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const validation = StorageManager.validateUploadConstraints(
      fileBuffer.length,
      file.type,
      file.name
    );

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors.join(", ") },
        { status: 400 }
      );
    }

    // Check if user has permission to edit this map
    let mapData;
    try {
      console.log("Checking map access for mapId:", mapId, "user:", user.id);

      const { data: map, error: mapError } = await supabase
        .from("learning_maps")
        .select(
          "id, title, creator_id, cover_image_key, cover_image_url, metadata"
        )
        .eq("id", mapId)
        .single();

      console.log("Map query result:", { map, mapError });

      if (mapError || !map) {
        console.error("Map not found:", mapError);
        return NextResponse.json(
          {
            error: "Map not found or access denied",
            details:
              process.env.NODE_ENV === "development"
                ? mapError?.message
                : undefined,
          },
          { status: 404 }
        );
      }

      // Simple ownership check - for now just check if user created the map
      if (map.creator_id !== user.id) {
        console.error("User does not own map:", {
          mapCreatedBy: map.creator_id,
          userId: user.id,
        });
        return NextResponse.json(
          { error: "You don't have permission to edit this map" },
          { status: 403 }
        );
      }

      mapData = map;
      console.log("Map access validated successfully for:", map.title);
    } catch (error) {
      console.error("Map validation error:", error);
      return NextResponse.json(
        {
          error: "Unable to validate map access",
          details:
            process.env.NODE_ENV === "development" ? String(error) : undefined,
        },
        { status: 500 }
      );
    }

    // Upload and process image
    let uploadResult;
    try {
      console.log(
        "Starting cover image upload for map:",
        mapId,
        "by user:",
        user.id
      );

      uploadResult = await storageManager.uploadImage(
        fileBuffer,
        file.name,
        file.type,
        {
          maxWidth,
          maxHeight,
          quality,
          format: "webp", // Force WebP for better compression
          metadata: {
            userId: user.id,
            mapId: mapId,
            uploadType: "cover-image",
          },
        }
      );

      console.log("Cover image upload successful:", uploadResult.fileName);
    } catch (uploadError) {
      console.error("Cover image upload failed:", uploadError);

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

    // Update the learning_maps table with new cover image data
    try {
      const { error: updateError } = await supabase
        .from("learning_maps")
        .update({
          cover_image_url: uploadResult.url,
          cover_image_blurhash: uploadResult.blurhash,
          cover_image_key: uploadResult.key,
          cover_image_updated_at: new Date().toISOString(),
          // Clear old metadata.coverImage if it exists
          metadata: mapData.metadata
            ? { ...mapData.metadata, coverImage: undefined }
            : null,
        })
        .eq("id", mapId);

      if (updateError) {
        console.error("Failed to update map with cover image:", updateError);

        // Try to clean up uploaded file
        try {
          await storageManager.deleteImage(uploadResult.key);
        } catch (cleanupError) {
          console.error(
            "Failed to cleanup uploaded file after DB error:",
            cleanupError
          );
        }

        return NextResponse.json(
          { error: "Failed to save cover image to map" },
          { status: 500 }
        );
      }

      // Clean up old cover image if it exists
      if (
        mapData.cover_image_key &&
        mapData.cover_image_key !== uploadResult.key
      ) {
        try {
          await storageManager.deleteImage(mapData.cover_image_key);
          console.log("Cleaned up old cover image:", mapData.cover_image_key);
        } catch (cleanupError) {
          console.error("Failed to cleanup old cover image:", cleanupError);
          // Don't fail the request for cleanup errors
        }
      }
    } catch (error) {
      console.error("Database update error:", error);
      return NextResponse.json(
        { error: "Failed to update map record" },
        { status: 500 }
      );
    }

    // Log successful upload
    console.log(
      `Cover image uploaded successfully for map ${mapId}: ${uploadResult.fileName} by user ${user.id}`
    );

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      blurhash: uploadResult.blurhash,
      fileName: uploadResult.fileName,
      width: uploadResult.width,
      height: uploadResult.height,
      size: uploadResult.size,
      format: uploadResult.format,
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cover image upload API error:", error);

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

// Health check and capabilities endpoint
export async function GET() {
  try {
    const supportedTypes = StorageManager.getSupportedImageTypes();

    return NextResponse.json({
      status: "healthy",
      service: "cover-image-upload",
      maxSize: "10MB",
      supportedTypes,
      features: {
        imageProcessing: true,
        blurhashGeneration: true,
        automaticOptimization: true,
        webpConversion: true,
        oldImageCleanup: true,
      },
      rateLimit: {
        maxUploadsPerHour: MAX_UPLOADS_PER_HOUR,
        windowMs: RATE_LIMIT_WINDOW,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        service: "cover-image-upload",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
