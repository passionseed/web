import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { id: projectId } = await props.params;

    console.log("[Members API] Fetching members for project:", projectId);

    // First get the member user IDs
    const { data: members, error: membersError } = await supabase
        .from("ps_project_members")
        .select("user_id")
        .eq("project_id", projectId);

    console.log("[Members API] Found members:", members?.length || 0, members);

    if (membersError) {
        console.error("[Members API] Error fetching members:", membersError);
        return NextResponse.json(
            { error: membersError.message },
            { status: 500 }
        );
    }

    if (!members || members.length === 0) {
        console.log("[Members API] No members found, returning empty array");
        return NextResponse.json([]);
    }

    // Get user profiles
    const userIds = members.map((m) => m.user_id).filter(Boolean);

    if (userIds.length === 0) {
        console.log("[Members API] No valid user IDs, returning empty array");
        return NextResponse.json([]);
    }

    console.log("[Members API] Fetching profiles for users:", userIds);

    const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, username")
        .in("id", userIds);

    console.log("[Members API] Found profiles:", profiles?.length || 0, profiles);

    if (profilesError) {
        console.error("[Members API] Error fetching profiles:", profilesError);
        return NextResponse.json(
            { error: profilesError.message },
            { status: 500 }
        );
    }

    // Combine the data
    const result = members.map((member) => ({
        user_id: member.user_id,
        profiles: profiles?.find((p) => p.id === member.user_id),
    }));

    console.log("[Members API] Returning result:", result);
    return NextResponse.json(result);
}
