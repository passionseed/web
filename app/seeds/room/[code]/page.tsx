import { createClient } from "@/utils/supabase/server";
import { LobbyView } from "@/components/seeds/LobbyView";
import { redirect, notFound } from "next/navigation";
import { MapViewerWithProvider as MapViewer } from "@/components/map/MapViewer";
import { SeedSettings } from "@/components/seeds/SeedSettings";
import { getMapWithNodesServer } from "@/lib/supabase/maps-server";
import { SeedRoomDashboardWrapper } from "@/components/seeds/SeedRoomDashboardWrapper";
import { clearProgressForSeedRoom } from "@/lib/supabase/seed-progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play } from "lucide-react";
import Link from "next/link";

interface RoomPageProps {
    params: Promise<{
        code: string;
    }>;
    searchParams: Promise<{
        view?: string;
    }>;
}

export default async function RoomPage({ params, searchParams }: RoomPageProps) {
    const supabase = await createClient();
    const { code } = await params;
    const { view } = await searchParams;

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/login?next=/seeds/room/${code}`);
    }

    // Fetch room details
    console.log("Fetching room with code:", code);
    console.log("User ID:", user.id);

    // First try without the join to see if that's the issue
    const { data: room, error } = await supabase
        .from("seed_rooms")
        .select("*")
        .eq("join_code", code)
        .single();

    if (error) {
        console.error("Error fetching room - full object:", JSON.stringify(error, null, 2));
        console.error("Error details:", {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
        });

        // If there's an error, show a proper error page instead of continuing
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-8">
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 max-w-md">
                    <h1 className="text-2xl font-bold text-white mb-4">Error Loading Room</h1>
                    <p className="text-neutral-400 mb-4">
                        {error.message || "Could not load the room. The code might be invalid or you may not have permission to view it."}
                    </p>
                    <p className="text-sm text-neutral-500">Error code: {error.code || "Unknown"}</p>
                </div>
            </div>
        );
    }

    console.log("Room fetch result:", room);

    if (!room) {
        console.log("Room not found, returning 404");
        notFound();
    }

    // Fetch the seed separately with category
    const { data: seed } = await supabase
        .from("seeds")
        .select("*, category:seed_categories(*)")
        .eq("id", room.seed_id)
        .single();

    if (!seed) {
        console.log("Seed not found for room");
        notFound();
    }

    // Check if user is a member, if not join them
    const { data: membership } = await supabase
        .from("seed_room_members")
        .select("*")
        .eq("room_id", room.id)
        .eq("user_id", user.id)
        .single();

    if (!membership) {
        console.log("User not a member, checking for existing rooms...");

        // Check if user is already in another room
        const { data: existingMembership } = await supabase
            .from("seed_room_members")
            .select(`
                *,
                room:seed_rooms(*)
            `)
            .eq("user_id", user.id)
            .limit(1)
            .single();

        if (existingMembership && (existingMembership as any).room) {
            const existingRoom = (existingMembership as any).room;
            if (existingRoom.status === "waiting" || existingRoom.status === "active") {
                // User is already in another room, redirect them there
                redirect(`/seeds/room/${existingRoom.join_code}`);
            }
        }

        console.log("User not in any room, auto-joining...");

        // Check if room is full
        const { count } = await supabase
            .from("seed_room_members")
            .select("*", { count: "exact", head: true })
            .eq("room_id", room.id);

        if (count !== null && count >= room.max_students) {
            return (
                <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-8">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 max-w-md">
                        <h1 className="text-2xl font-bold text-white mb-4">Room Full</h1>
                        <p className="text-neutral-400">This room has reached its maximum capacity.</p>
                    </div>
                </div>
            );
        }

        // Try to join
        const { error: joinError } = await supabase
            .from("seed_room_members")
            .insert({
                room_id: room.id,
                user_id: user.id,
            });

        if (joinError) {
            console.error("Error joining room:", joinError);
            return (
                <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-8">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 max-w-md">
                        <h1 className="text-2xl font-bold text-white mb-4">Failed to Join</h1>
                        <p className="text-neutral-400">{joinError.message || "Could not join the room."}</p>
                    </div>
                </div>
            );
        }

        console.log("Successfully joined room");

        // Clear any existing progress for this user on the seed map
        // This ensures each seed room session starts fresh
        await clearProgressForSeedRoom(user.id, room.id);
        console.log("Cleared previous progress for fresh start");
    } else {
        // User is already a member - check if we should clear progress
        // Clear progress when the room status changes to active (session starts)
        const { data: existingRoomStatus } = await supabase
            .from("seed_room_members")
            .select("last_progress_reset")
            .eq("room_id", room.id)
            .eq("user_id", user.id)
            .single();

        // If room is active and user hasn't had progress reset for this session
        if (room.status === "active") {
            const shouldResetProgress = !existingRoomStatus?.last_progress_reset ||
                new Date(existingRoomStatus.last_progress_reset) < new Date(room.created_at);

            if (shouldResetProgress) {
                await clearProgressForSeedRoom(user.id, room.id);

                // Mark that we've reset progress for this session
                await supabase
                    .from("seed_room_members")
                    .update({ last_progress_reset: new Date().toISOString() })
                    .eq("room_id", room.id)
                    .eq("user_id", user.id);

                console.log("Reset progress for active session");
            }
        }
    }

    // Check if user is admin or instructor
    const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "instructor"]);

    const isAdmin = roleData?.some(r => r.role === "admin") ?? false;
    const isInstructor = roleData?.some(r => r.role === "instructor") ?? false;

    // Check if user is the mentor of this room
    const isMentor = room.mentor_id === user.id;

    // If user is mentor and not explicitly requesting map view, show dashboard
    if (isMentor && view !== "map") {
        // Fetch room members for the dashboard using the same approach as AdminLobbies
        // First get all member IDs (excluding the mentor)
        const { data: memberIds } = await supabase
            .from("seed_room_members")
            .select("user_id, joined_at")
            .eq("room_id", room.id)
            .neq("user_id", room.mentor_id) // Exclude the mentor
            .order("joined_at", { ascending: false });

        console.log("Fetching members for room:", room.id);
        console.log("Mentor ID:", room.mentor_id);
        console.log("Member IDs (excluding mentor):", memberIds);

        // Then fetch profile data for each member
        let roomMembers: any[] = [];
        if (memberIds && memberIds.length > 0) {
            const userIds = memberIds.map(m => m.user_id);
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, full_name, email, avatar_url")
                .in("id", userIds);

            // Combine member data with profile data
            roomMembers = memberIds.map((member, index) => {
                const profile = profiles?.find(p => p.id === member.user_id);
                return {
                    id: `${member.user_id}-${index}`, // Create a unique ID for React key
                    user_id: member.user_id,
                    joined_at: member.joined_at,
                    profiles: profile
                };
            });
        }

        console.log("Room members with profiles:", roomMembers);
        console.log("Number of members:", roomMembers?.length || 0);

        return <SeedRoomDashboardWrapper
            room={room}
            seed={seed}
            currentUser={user}
            isAdmin={isAdmin}
            isInstructor={isInstructor}
            initialMembers={roomMembers || []}
        />;
    }

    if (room.status === "waiting") {
        return <LobbyView room={room} seed={seed} currentUser={user} isAdmin={isAdmin} isInstructor={isInstructor} />;
    }

    // Allow viewing map for both active and completed rooms
    if (room.status === "active" || (room.status === "completed" && view === "map")) {
        const map = await getMapWithNodesServer(seed.map_id);

        if (!map) return <div>Map not found</div>;

        return (
            <div className="w-full h-screen bg-neutral-950 relative">
                <MapViewer
                    map={map}
                    seedRoomId={room.id}
                    seedTitle={seed.title}
                    seedId={seed.id}
                    roomSettingsComponent={
                        <SeedSettings
                            room={room}
                            seed={seed}
                            currentUser={user}
                            isAdmin={isAdmin}
                            isInstructor={isInstructor}
                        />
                    }
                />
            </div>
        );
    }

    // Room is completed and no view parameter - show completion page
    if (room.status === "completed") {
        return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-8">
            <div className="bg-neutral-900 border-2 border-green-700/50 rounded-lg p-8 max-w-2xl w-full">
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
                        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Seed Completed!</h1>
                    <p className="text-green-400 text-lg mb-2">{seed.title}</p>
                    {seed.category && (
                        <p className="text-neutral-400">
                            {seed.category.name} Series
                        </p>
                    )}
                </div>

                <div className="bg-neutral-800/50 rounded-lg p-6 mb-6">
                    <h2 className="text-white font-semibold mb-3">What's Next?</h2>
                    <ul className="space-y-2 text-neutral-300 text-sm">
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            <span>Your progress has been saved and your badge has been earned!</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5">→</span>
                            <span>You can continue exploring the map or try the seed again</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-purple-500 mt-0.5">⟲</span>
                            <span>Use "Reset Progress" in settings to start fresh (keeps your badge!)</span>
                        </li>
                    </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <Link href={`/seeds/${seed.id}`} className="flex-1">
                        <Button
                            variant="outline"
                            className="w-full bg-neutral-800 border-neutral-600 hover:bg-neutral-700"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Seed Info
                        </Button>
                    </Link>
                    <Button
                        onClick={() => {
                            window.location.href = `/seeds/room/${code}?view=map`;
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                        <Play className="w-4 h-4 mr-2" />
                        Continue Exploring
                    </Button>
                </div>
            </div>
        </div>
        );
    }

    // Default fallback
    return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">Unknown room status</div>;
}
