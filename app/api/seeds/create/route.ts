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
        const { title, slogan, description, categoryId, sourceMapId, seedType, totalDays } = body;

        if (!title) {
            return NextResponse.json(
                { error: "Title is required" },
                { status: 400 }
            );
        }

        // 1. Create/Clone the map first
        // We create it as 'private' initially because 'seed' type requires parent_seed_id
        // which we don't have yet.
        let newMap;

        if (sourceMapId) {
            // Clone existing map
            newMap = await cloneMap(
                sourceMapId,
                'private', // Temporary type
                user.id,
                null, // No parent yet
                { title: `${title} Map` }
            );
        } else {
            // Create blank map
            const { data: blankMap, error: mapError } = await supabase
                .from("learning_maps")
                .insert({
                    title: `${title} Map`,
                    description: "Seed map",
                    creator_id: user.id,
                    map_type: 'private', // Temporary type
                    visibility: 'private'
                })
                .select()
                .single();

            if (mapError || !blankMap) {
                throw new Error(`Failed to create blank map: ${mapError?.message}`);
            }
            newMap = blankMap;
        }

        // 2. Create the seed
        const { data: seed, error: seedError } = await supabase
            .from("seeds")
            .insert({
                title,
                slogan,
                description,
                map_id: newMap.id,
                created_by: user.id,
                category_id: categoryId || null,
                seed_type: seedType === "pathlab" ? "pathlab" : "collaborative",
                // We can add min/max students if the table supports it, 
                // but currently they seem to be in seed_rooms or not in seeds table based on migration?
                // Checking migration: seeds table has title, description, cover_image_url, map_id, created_by.
                // seed_rooms has min/max_students.
                // So we just create seed here.
            })
            .select()
            .single();

        if (seedError || !seed) {
            // Rollback: delete the map we just created
            await supabase.from("learning_maps").delete().eq("id", newMap.id);
            throw new Error(`Failed to create seed: ${seedError?.message}`);
        }

        // 3. Update the map to be a seed map
        const { error: updateMapError } = await supabase
            .from("learning_maps")
            .update({
                map_type: 'seed',
                parent_seed_id: seed.id,
                visibility: 'public'
            })
            .eq("id", newMap.id);

        if (updateMapError) {
            console.error("Failed to update map to seed type", updateMapError);
            // We don't rollback here as the seed is created and usable, just the map type is wrong.
            // We can try to fix it or log it.
        }

        // 4. Create path configuration for PathLab seeds
        if ((seedType === "pathlab") && seed?.id) {
            const parsedTotalDays = Math.max(1, Number(totalDays) || 5);
            const { error: pathError } = await supabase.from("paths").insert({
                seed_id: seed.id,
                total_days: parsedTotalDays,
                created_by: user.id,
            });

            if (pathError) {
                console.error("Failed to create path row", pathError);
                // Keep seed creation successful even if path setup failed.
            }
        }

        return NextResponse.json({ success: true, seed });
    } catch (error: any) {
        console.error("Create seed error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
