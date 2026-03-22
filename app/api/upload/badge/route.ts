import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // Verify user is authenticated and is admin
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is admin
        const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .single();

        if (!roleData) {
            return NextResponse.json({ error: "Only admins can upload badge images" }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File;
        const seedId = formData.get("seedId") as string;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (!seedId) {
            return NextResponse.json({ error: "No seed ID provided" }, { status: 400 });
        }

        // Validate file type
        if (!file.type.startsWith("image/")) {
            return NextResponse.json({ error: "File must be an image" }, { status: 400 });
        }

        // Validate file size (max 5MB for badges)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 });
        }

        // Sanitize inputs to prevent path traversal
        const safeSeedId = seedId.replace(/[^a-zA-Z0-9_-]/g, "");
        const rawExt = file.name.split(".").pop() || "";
        const safeExt = rawExt.replace(/[^a-zA-Z0-9]/g, "");

        // Generate unique filename
        const fileName = `badge-${safeSeedId}-${Date.now()}.${safeExt}`;
        const filePath = `badges/${fileName}`;

        // Upload to Supabase Storage
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from("seed-assets")
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: true,
            });

        if (uploadError) {
            console.error("Upload error:", uploadError);
            return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
        }

        // Get public URL
        const {
            data: { publicUrl },
        } = supabase.storage.from("seed-assets").getPublicUrl(filePath);

        return NextResponse.json({
            fileUrl: publicUrl,
            fileKey: filePath,
            fileName: fileName,
        });
    } catch (error: any) {
        console.error("Error in badge upload:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
