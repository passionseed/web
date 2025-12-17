import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { StorageManager } from "@/lib/storage/storage-manager";

const storageManager = new StorageManager();

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

        // Check if user is admin
        const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .single();

        if (!roles) {
            return NextResponse.json(
                { error: "Admin access required" },
                { status: 403 }
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
        const categoryId = formData.get("categoryId") as string;

        // Validate inputs
        if (!file || !(file instanceof File)) {
            return NextResponse.json(
                { error: "Valid image file is required" },
                { status: 400 }
            );
        }

        if (!categoryId || typeof categoryId !== "string") {
            return NextResponse.json(
                { error: "Valid categoryId is required" },
                { status: 400 }
            );
        }

        // Validate file
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

        // Check if category exists
        const { data: category, error: categoryError } = await supabase
            .from("seed_categories")
            .select("id, name, logo_url")
            .eq("id", categoryId)
            .single();

        if (categoryError || !category) {
            return NextResponse.json(
                { error: "Category not found" },
                { status: 404 }
            );
        }

        // Upload logo (smaller size for icons)
        let uploadResult;
        try {
            uploadResult = await storageManager.uploadImage(
                fileBuffer,
                file.name,
                file.type,
                {
                    maxWidth: 200,
                    maxHeight: 200,
                    quality: 90,
                    format: "webp",
                    metadata: {
                        userId: user.id,
                        categoryId: categoryId,
                        uploadType: "category-logo",
                    },
                }
            );
        } catch (uploadError) {
            console.error("Logo upload failed:", uploadError);
            return NextResponse.json(
                { error: "Logo upload failed" },
                { status: 500 }
            );
        }

        // Update category with logo URL
        const { error: updateError } = await supabase
            .from("seed_categories")
            .update({
                logo_url: uploadResult.url,
            })
            .eq("id", categoryId);

        if (updateError) {
            // Clean up uploaded file
            try {
                await storageManager.deleteImage(uploadResult.key);
            } catch (cleanupError) {
                console.error("Failed to cleanup uploaded file:", cleanupError);
            }

            return NextResponse.json(
                { error: "Failed to save logo to category" },
                { status: 500 }
            );
        }

        // Clean up old logo if it exists
        if (category.logo_url) {
            try {
                // Extract key from old URL if it's from our storage
                const oldKey = category.logo_url.split('/').pop();
                if (oldKey) {
                    await storageManager.deleteImage(oldKey);
                }
            } catch (cleanupError) {
                console.error("Failed to cleanup old logo:", cleanupError);
            }
        }

        return NextResponse.json({
            success: true,
            url: uploadResult.url,
            fileName: uploadResult.fileName,
        });
    } catch (error) {
        console.error("Category logo upload API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
