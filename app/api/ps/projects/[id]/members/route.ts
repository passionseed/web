import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { getPSAccess } from "@/actions/ps";

export async function GET(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    // Member emails are staff-only: require the passion-seed-team role.
    const access = await getPSAccess();
    if (!access.isAuthenticated) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!access.isAuthorized) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = await createClient();
    const { id: projectId } = await props.params;

    const { data: members, error: membersError } = await supabase
        .from("ps_project_members")
        .select("user_id")
        .eq("project_id", projectId);

    if (membersError) {
        console.error("[Members API] Error fetching members:", membersError.code);
        return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
    }

    const userIds = (members ?? []).map((m) => m.user_id).filter(Boolean);
    if (userIds.length === 0) {
        return NextResponse.json([]);
    }

    const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, username")
        .in("id", userIds);

    if (profilesError) {
        console.error("[Members API] Error fetching profiles:", profilesError.code);
        return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
    }

    const result = (members ?? []).map((member) => ({
        user_id: member.user_id,
        profiles: profiles?.find((p) => p.id === member.user_id),
    }));

    return NextResponse.json(result);
}
