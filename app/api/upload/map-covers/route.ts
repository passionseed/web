import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { b2 } from "@/lib/backblaze";

// Image file type validation
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png", 
  "image/gif",
  "image/webp",
  "image/avif",
]);

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for map covers

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
  const validExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"];
  if (!validExtensions.some(ext => fileName.endsWith(ext))) {
    return {
      valid: false,
      error: "Invalid image file extension. Please use .jpg, .jpeg, .png, .gif, .webp, or .avif",
    };
  }

  return { valid: true };
}

export async function POST(request: NextRequest) {
  console.log("🖼️ [Map Cover Upload] Starting map cover upload request");

  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.warn("🚫 [Map Cover Upload] Authentication failed:", userError?.message);
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.log("✅ [Map Cover Upload] User authenticated:", user.id);

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const mapId = formData.get("mapId") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!mapId) {
      return NextResponse.json(
        { error: "Map ID is required" },
        { status: 400 }
      );
    }

    console.log("📁 [Map Cover Upload] Processing file:", {
      name: file.name,
      size: file.size,
      type: file.type,
      mapId
    });

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      console.warn("❌ [Map Cover Upload] File validation failed:", validation.error);
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Verify user owns the map or has permission to edit it
    const { data: mapData, error: mapError } = await supabase
      .from("learning_maps")
      .select("id, creator_id")
      .eq("id", mapId)
      .single();

    if (mapError || !mapData) {
      console.warn("❌ [Map Cover Upload] Map not found or access denied:", mapError?.message);
      return NextResponse.json(
        { error: "Map not found or access denied" },
        { status: 404 }
      );
    }

    if (mapData.creator_id !== user.id) {
      console.warn("🚫 [Map Cover Upload] User doesn't own this map");
      return NextResponse.json(
        { error: "You don't have permission to edit this map" },
        { status: 403 }
      );
    }

    console.log("✅ [Map Cover Upload] User has permission to upload cover for map:", mapId);

    try {
      // Upload to Backblaze B2
      console.log("☁️ [Map Cover Upload] Uploading to Backblaze B2...");
      
      const uploadResult = await b2.uploadMapCoverImage(file, user.id, mapId);
      
      console.log("✅ [Map Cover Upload] B2 upload successful:", {
        fileId: uploadResult.fileId,
        fileName: uploadResult.fileName,
        fileUrl: uploadResult.fileUrl
      });

      // Update map metadata with cover image URL
      const { error: updateError } = await supabase
        .from("learning_maps")
        .update({
          metadata: {
            ...mapData.metadata || {},
            coverImage: uploadResult.fileUrl,
            coverImageFileName: uploadResult.fileName,
            coverImageFileId: uploadResult.fileId
          }
        })
        .eq("id", mapId);

      if (updateError) {
        console.error("❌ [Map Cover Upload] Failed to update map metadata:", updateError);
        return NextResponse.json(
          { error: "Failed to update map with cover image" },
          { status: 500 }
        );
      }

      console.log("✅ [Map Cover Upload] Map metadata updated successfully");

      return NextResponse.json({
        success: true,
        message: "Map cover uploaded successfully",
        data: {
          fileId: uploadResult.fileId,
          fileName: uploadResult.fileName,
          fileUrl: uploadResult.fileUrl,
          mapId: mapId
        }
      });

    } catch (uploadError) {
      console.error("❌ [Map Cover Upload] B2 upload failed:", uploadError);
      
      return NextResponse.json(
        { 
          error: "Upload failed", 
          details: uploadError instanceof Error ? uploadError.message : "Unknown upload error"
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("❌ [Map Cover Upload] Unexpected error:", error);
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}