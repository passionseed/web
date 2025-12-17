import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    console.log("=== API: MENTOR SESSION CANCEL START ===");
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

        const { id: sessionId } = await params;
        console.log("Session ID to cancel:", sessionId);

        // Get session details (basic info only)
        const { data: session, error: sessionError } = await supabase
            .from("mentor_sessions")
            .select("*")
            .eq("id", sessionId)
            .single();

        if (sessionError || !session) {
            console.error("❌ Session not found:", sessionError);
            console.error("Error details:", JSON.stringify(sessionError, null, 2));
            return NextResponse.json(
                { error: "Session not found" },
                { status: 404 }
            );
        }

        console.log("✅ Session found:", session.id);

        // Verify user is the student who created the session
        if (session.student_id !== user.id) {
            console.error("❌ User not authorized to cancel this session");
            return NextResponse.json(
                { error: "Not authorized to cancel this session" },
                { status: 403 }
            );
        }

        // Get additional details for notification
        console.log("Fetching room details for room_id:", session.room_id);
        const { data: room, error: roomError } = await supabase
            .from("seed_rooms")
            .select("id, join_code, seed:seeds(id, title)")
            .eq("id", session.room_id)
            .single();
        console.log("Room data:", room, "Error:", roomError);

        console.log("Fetching student details for student_id:", session.student_id);
        const { data: student, error: studentError } = await supabase
            .from("profiles")
            .select("full_name, username, email")
            .eq("id", session.student_id)
            .single();
        console.log("Student data:", student, "Error:", studentError);

        console.log("Fetching mentor details for mentor_id:", session.mentor_id);
        const { data: mentor, error: mentorError } = await supabase
            .from("profiles")
            .select("discord_uid, full_name")
            .eq("id", session.mentor_id)
            .single();
        console.log("Mentor data:", mentor, "Error:", mentorError);
        console.log("Mentor Discord UID:", mentor?.discord_uid);

        console.log("✅ Updating session status to cancelled...");

        // Update session status
        const { error: updateError } = await supabase
            .from("mentor_sessions")
            .update({
                status: "cancelled",
                updated_at: new Date().toISOString()
            })
            .eq("id", sessionId);

        if (updateError) {
            console.error("❌ Error updating session:", updateError);
            return NextResponse.json(
                { error: "Failed to cancel session" },
                { status: 500 }
            );
        }

        console.log("✅ Session cancelled successfully");

        // Send Discord notification to mentor
        let discordNotificationSent = false;

        if (mentor?.discord_uid) {
            console.log("📨 Sending Discord notification to mentor...");

            try {
                const discordResponse = await fetch(
                    'https://discord.com/api/v10/users/@me/channels',
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            recipient_id: mentor.discord_uid,
                        }),
                    }
                );

                if (!discordResponse.ok) {
                    throw new Error(`Discord API error: ${discordResponse.statusText}`);
                }

                const dmChannel = await discordResponse.json();

                const message = `🚫 **Mentor Session Cancelled**\n\n` +
                    `**Student:** ${student?.full_name || student?.username || "Unknown"}\n` +
                    `**Email:** ${student?.email || "No email"}\n` +
                    `**Seed:** ${(room as any)?.seed?.title || "Unknown"}\n` +
                    `**Room Code:** ${room?.join_code || "N/A"}\n` +
                    `**Originally Scheduled:** ${new Date(session.scheduled_date).toLocaleDateString()} at ${session.scheduled_time}\n\n` +
                    `The student has cancelled this session.`;

                const messageResponse = await fetch(
                    `https://discord.com/api/v10/channels/${dmChannel.id}/messages`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ content: message }),
                    }
                );

                if (messageResponse.ok) {
                    console.log("✅ Discord notification sent successfully");
                    discordNotificationSent = true;
                } else {
                    console.error("❌ Failed to send Discord message:", await messageResponse.text());
                }
            } catch (discordError) {
                console.error("❌ Discord notification error:", discordError);
            }
        } else {
            console.log("⚠️ Mentor has no Discord UID, skipping notification");
        }

        console.log("✅ Returning success response");
        console.log("=== API: MENTOR SESSION CANCEL END ===");

        return NextResponse.json({
            success: true,
            discordNotificationSent
        });

    } catch (error) {
        console.error("❌ Error in mentor session cancellation:", error);
        console.error("Error details:", error);
        console.log("=== API: MENTOR SESSION CANCEL END (ERROR) ===");
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
