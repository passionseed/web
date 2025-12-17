import { createClient } from "@/utils/supabase/server";
import { SeedGallery } from "@/components/seeds/SeedGallery";
import { redirect } from "next/navigation";

export default async function SeedsPage({ searchParams }: { searchParams: Promise<{ admin?: string; gallery?: string }> }) {
    const supabase = await createClient();
    const params = await searchParams;

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Check if user is admin or instructor
    let isAdmin = false;
    let isInstructor = false;
    let isMentor = false;
    if (user) {
        const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .in("role", ["admin", "instructor"]);

        isAdmin = roleData?.some(r => r.role === "admin") || false;
        isInstructor = roleData?.some(r => r.role === "instructor") || false;

        // Check if user is a mentor of any active room
        const { data: mentorCheck } = await supabase
            .from("seed_rooms")
            .select("id")
            .eq("mentor_id", user.id)
            .in("status", ["waiting", "active"])
            .limit(1)
            .single();

        isMentor = !!mentorCheck;
    }

    // Fetch all seeds
    const { data: seeds } = await supabase
        .from("seeds")
        .select("*, category:seed_categories(*)")
        .order("created_at", { ascending: false });

    // Fetch rooms where user is a mentor (for instructors and admins)
    let mentoredRooms: any[] = [];
    if (user && (isInstructor || isAdmin)) {
        const { data: rooms } = await supabase
            .from("seed_rooms")
            .select(`
                *,
                seeds(*, category:seed_categories(*)),
                seed_room_members(user_id)
            `)
            .eq("mentor_id", user.id)
            .in("status", ["waiting", "active"])
            .order("created_at", { ascending: false });

        mentoredRooms = rooms || [];
    }

    // Fetch user's current room if logged in
    // Skip redirect if:
    // - User is admin with ?admin flag
    // - User explicitly requested gallery view with ?gallery flag
    // - User is a mentor (they should use the mentored rooms tab instead)
    const shouldBypassRedirect = (isAdmin && params.admin) || params.gallery || isMentor;

    if (user && !shouldBypassRedirect) {
        const { data: membershipData } = await supabase
            .from("seed_room_members")
            .select(`
                *,
                room:seed_rooms(*, seed:seeds(*))
            `)
            .eq("user_id", user.id)
            .order("joined_at", { ascending: false })
            .limit(1)
            .single();

        if (membershipData && (membershipData as any).room) {
            const room = (membershipData as any).room;
            // If user has an active or waiting room, redirect them to it
            // BUT only if they haven't completed the seed yet
            if (room.status === "waiting" || room.status === "active") {
                // Check if user has completed this room
                const { data: completionData } = await supabase
                    .from("seed_room_completions")
                    .select("*")
                    .eq("room_id", room.id)
                    .eq("user_id", user.id)
                    .maybeSingle();

                // Only redirect if they haven't completed the seed
                if (!completionData) {
                    redirect(`/seeds/room/${room.join_code}`);
                }
            }
        }
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <SeedGallery
                seeds={seeds || []}
                mentoredRooms={mentoredRooms}
                isAdmin={isAdmin}
                isInstructor={isInstructor}
                currentRoom={null}
            />
        </div>
    );
}
