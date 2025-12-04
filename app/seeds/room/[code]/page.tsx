import { createClient } from "@/utils/supabase/server";
import { LobbyView } from "@/components/seeds/LobbyView";
import { redirect, notFound } from "next/navigation";
import { MapViewerWithProvider as MapViewer } from "@/components/map/MapViewer";
import { SeedSettings } from "@/components/seeds/SeedSettings";
import { getMapWithNodesServer } from "@/lib/supabase/maps-server";

interface RoomPageProps {
    params: Promise<{
        code: string;
    }>;
}

export default async function RoomPage({ params }: RoomPageProps) {
    const supabase = await createClient();
    const { code } = await params;

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

    // Fetch the seed separately
    const { data: seed } = await supabase
        .from("seeds")
        .select("*")
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
    }

    if (room.status === "waiting") {
        // Check if user is admin
        const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .single();
        const isAdmin = !!roleData;

        return <LobbyView room={room} seed={seed} currentUser={user} isAdmin={isAdmin} />;
    }

    if (room.status === "active") {
        const map = await getMapWithNodesServer(seed.map_id);

        if (!map) return <div>Map not found</div>;

        return (
            <div className="w-full h-screen bg-neutral-950">
                <MapViewer
                    map={map}
                />
                <SeedSettings room={room} seed={seed} currentUser={user} />
            </div>
        );
    }

    return <div>Room is completed.</div>;
}
