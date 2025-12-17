import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { clearProgressForSeedRoom } from "@/lib/supabase/seed-progress";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { roomId, userId } = await request.json();

        console.log("=== RESET PROGRESS API START ===");
        console.log("Room ID:", roomId);
        console.log("User ID:", userId);

        // Verify user is authenticated
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user || user.id !== userId) {
            console.error("❌ Unauthorized");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify user is a member of the room
        const { data: membership, error: membershipError } = await supabase
            .from("seed_room_members")
            .select("*")
            .eq("room_id", roomId)
            .eq("user_id", userId)
            .single();

        if (membershipError || !membership) {
            console.error("❌ Not a member of this room:", membershipError);
            return NextResponse.json(
                { error: "You are not a member of this room" },
                { status: 403 }
            );
        }

        // Clear progress for this seed room
        const result = await clearProgressForSeedRoom(userId, roomId);

        if (!result.success) {
            console.error("❌ Failed to clear progress:", result.error);
            return NextResponse.json(
                { error: "Failed to reset progress" },
                { status: 500 }
            );
        }

        // Update the last_progress_reset timestamp
        await supabase
            .from("seed_room_members")
            .update({ last_progress_reset: new Date().toISOString() })
            .eq("room_id", roomId)
            .eq("user_id", userId);

        console.log("✅ Progress reset successfully");
        console.log("=== RESET PROGRESS API END ===");

        return NextResponse.json({
            success: true,
            message: "Progress reset successfully",
        });
    } catch (error: any) {
        console.error("❌ Error in reset progress API:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
