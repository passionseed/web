import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { b2 } from "@/lib/backblaze";

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

    const fileValidation = validateImageFile(file);
    if (!fileValidation.valid) {
      return NextResponse.json(
        { error: fileValidation.error },
        { status: 400 }
      );
    }

    // Upload to Backblaze B2 with profile-specific path
    let uploadResult;
    try {
      console.log("Starting B2 avatar upload for user:", user.id);
      uploadResult = await b2.uploadFile(file, user.id, "profile_avatar");
      console.log("B2 avatar upload successful:", uploadResult.fileName);
    } catch (uploadError) {
      console.error("B2 avatar upload failed:", uploadError);

      const errorMessage =
        uploadError instanceof Error
          ? uploadError.message
          : "Avatar upload service unavailable";
      return NextResponse.json(
        {
          error: `Avatar upload failed: ${errorMessage}`,
        },
        { status: 500 }
      );
    }

    // Update user profile with new avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        avatar_url: uploadResult.fileUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error("Failed to update profile avatar:", updateError);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    console.log(`Avatar uploaded and profile updated for user ${user.id}`);

    return NextResponse.json({
      success: true,
      fileUrl: uploadResult.fileUrl,
      fileName: uploadResult.fileName,
      fileId: uploadResult.fileId,
      originalName: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      category: "avatar",
    });
  } catch (error) {
    console.error("Avatar upload API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error. Please try again later.",
      },
      { status: 500 }
    );
  }
}