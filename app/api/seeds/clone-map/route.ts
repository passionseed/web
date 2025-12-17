import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cloneMap } from "@/lib/maps/clone-map";

export async function POST(request: NextRequest) {
    try {
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

        const body = await request.json();
        const { sourceMapId, seedId, title } = body;

        if (!sourceMapId || !seedId) {
            return NextResponse.json(
                { error: "Missing required fields: sourceMapId, seedId" },
                { status: 400 }
            );
        }

        // Check permissions: User must be admin OR owner of the seed
        const { data: seed, error: seedError } = await supabase
            .from("seeds")
            .select("created_by")
            .eq("id", seedId)
            .single();

        if (seedError || !seed) {
            return NextResponse.json(
                { error: "Seed not found" },
                { status: 404 }
            );
        }

        const isOwner = seed.created_by === user.id;

        // Check if admin
        const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .single();

        const isAdmin = !!roles;

        if (!isOwner && !isAdmin) {
            return NextResponse.json(
                { error: "Permission denied" },
                { status: 403 }
            );
        }

        // Clone the map
        const newMap = await cloneMap(
            sourceMapId,
            'seed',
            user.id,
            seedId,
            { title: title || undefined }
        );

        // Update the seed to point to the new map
        const { error: updateError } = await supabase
            .from("seeds")
            .update({ map_id: newMap.id })
            .eq("id", seedId);

        if (updateError) {
            return NextResponse.json(
                { error: "Failed to update seed with new map" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, map: newMap });
    } catch (error: any) {
        console.error("Clone map error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
