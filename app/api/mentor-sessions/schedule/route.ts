import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { notifyMentorOnDiscord, formatDate, formatTime } from "@/lib/discord-notify";

export async function POST(request: Request) {
    console.log("=== API: MENTOR SESSION SCHEDULE START ===");
    try {
        const supabase = await createClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        console.log("User authenticated:", user?.id);

        if (authError || !user) {
            console.error("❌ Authentication failed:", authError);
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Parse request body
        const body = await request.json();
        console.log("Request body received:", body);
        const { roomId, scheduledDate, scheduledTime, notes } = body;

        if (!roomId || !scheduledDate || !scheduledTime) {
            console.error("❌ Missing required fields");
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        console.log("✅ Fetching room details...");
        // Get room details and mentor info
        const { data: room, error: roomError } = await supabase
            .from("seed_rooms")
            .select(`
                id,
                join_code,
                mentor_id,
                seed:seeds(
                    id,
                    title
                )
            `)
            .eq("id", roomId)
            .single();

        if (roomError || !room) {
            console.error("❌ Room not found:", roomError);
            return NextResponse.json(
                { error: "Room not found" },
                { status: 404 }
            );
        }

        console.log("✅ Room found:", room.id);
        console.log("Mentor ID:", room.mentor_id);

        // Get student profile
        const { data: studentProfile } = await supabase
            .from("profiles")
            .select("full_name, username")
            .eq("id", user.id)
            .single();

        console.log("Student profile:", studentProfile);
        console.log("✅ Creating session record...");

        // Create mentor session record
        const { data: session, error: sessionError } = await supabase
            .from("mentor_sessions")
            .insert({
                room_id: roomId,
                student_id: user.id,
                mentor_id: room.mentor_id,
                scheduled_date: scheduledDate,
                scheduled_time: scheduledTime,
                notes: notes || null,
                status: "pending",
            })
            .select()
            .single();

        if (sessionError) {
            console.error("Error creating session:", sessionError);
            return NextResponse.json(
                { error: "Failed to create session" },
                { status: 500 }
            );
        }

        // Send Discord notification if mentor has Discord UID
        let discordNotificationSent = false;
        if (room.mentor_id) {
            const { data: mentorProfile } = await supabase
                .from("profiles")
                .select("discord_uid, full_name")
                .eq("id", room.mentor_id)
                .single();

            if (mentorProfile?.discord_uid) {
                const notificationResult = await notifyMentorOnDiscord(
                    mentorProfile.discord_uid,
                    {
                        studentName: studentProfile?.full_name || studentProfile?.username || "Unknown Student",
                        studentEmail: user.email || "No email",
                        seedTitle: (room.seed as any)?.title || "Unknown Seed",
                        roomCode: room.join_code,
                        scheduledDate: formatDate(scheduledDate),
                        scheduledTime: formatTime(scheduledTime),
                    }
                );

                discordNotificationSent = notificationResult.success;

                if (!notificationResult.success) {
                    console.error("Discord notification failed:", notificationResult.error);
                }
            }
        }

        console.log("✅ Returning success response");
        console.log("=== API: MENTOR SESSION SCHEDULE END ===");

        return NextResponse.json({
            success: true,
            session,
            discordNotificationSent,
        });

    } catch (error) {
        console.error("❌ Error in mentor session scheduling:", error);
        console.error("Error details:", error);
        console.log("=== API: MENTOR SESSION SCHEDULE END (ERROR) ===");
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
