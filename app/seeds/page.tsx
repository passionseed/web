import { createClient } from "@/utils/supabase/server";
import { SeedGallery } from "@/components/seeds/SeedGallery";
import { redirect } from "next/navigation";

export default async function SeedsPage({ searchParams }: { searchParams: Promise<{ admin?: string }> }) {
    const supabase = await createClient();
    const params = await searchParams;

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Check if user is admin
    let isAdmin = false;
    if (user) {
        const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .single();
        isAdmin = !!roleData;
    }

    // Fetch all seeds
    const { data: seeds } = await supabase
        .from("seeds")
        .select("*, category:seed_categories(*)")
        .order("created_at", { ascending: false });

    // Fetch user's current room if logged in
    // Only redirect non-admins or admins without the bypass flag
    if (user && (!isAdmin || !params.admin)) {
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
            if (room.status === "waiting" || room.status === "active") {
                redirect(`/seeds/room/${room.join_code}`);
            }
        }
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <SeedGallery seeds={seeds || []} isAdmin={isAdmin} currentRoom={null} />
        </div>
    );
}
