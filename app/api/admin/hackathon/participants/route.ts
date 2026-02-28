import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Use service client for hackathon data (no RLS on these tables)
    const serviceClient = getServiceClient();

    // Fetch all participants with their team information
    const { data: participants, error } = await serviceClient
      .from("hackathon_participants")
      .select(`
        *,
        hackathon_team_members!hackathon_team_members_participant_id_fkey(
          team_id,
          joined_at,
          hackathon_teams(
            id,
            name,
            lobby_code
          )
        ),
        hackathon_team_matching_waitlist!hackathon_team_matching_waitlist_participant_id_fkey(
          id,
          status,
          created_at
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching participants:", error);
      return NextResponse.json(
        { error: "Failed to fetch participants" },
        { status: 500 }
      );
    }

    // Transform data to include team info and waitlist status
    const transformedData = participants.map((p) => {
      const teamMembership = Array.isArray(p.hackathon_team_members)
        ? p.hackathon_team_members[0]
        : p.hackathon_team_members;

      const teamData = teamMembership?.hackathon_teams;

      // Check if participant is in waitlist
      const waitlistEntries = Array.isArray(p.hackathon_team_matching_waitlist)
        ? p.hackathon_team_matching_waitlist
        : p.hackathon_team_matching_waitlist ? [p.hackathon_team_matching_waitlist] : [];

      const activeWaitlist = waitlistEntries.find((w: any) => w.status === "waiting");
      const isInWaitlist = !!activeWaitlist;

      return {
        ...p,
        team: teamData ? {
          id: teamData.id,
          name: teamData.name,
          join_code: teamData.lobby_code, // Map lobby_code to join_code for frontend
        } : isInWaitlist ? {
          id: "waitlist",
          name: "Finding Team",
          join_code: "WAITLIST",
        } : null,
        joined_team_at: teamMembership?.joined_at || activeWaitlist?.created_at || null,
        is_in_waitlist: isInWaitlist,
        hackathon_team_members: undefined, // Remove the nested object
        hackathon_team_matching_waitlist: undefined, // Remove the nested object
      };
    });

    return NextResponse.json({ participants: transformedData });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Error in hackathon participants API:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Get participant IDs from request body
    const { participantIds } = await request.json();

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json({ error: "No participant IDs provided" }, { status: 400 });
    }

    // Use service client to delete participants
    const serviceClient = getServiceClient();

    const { error: deleteError } = await serviceClient
      .from("hackathon_participants")
      .delete()
      .in("id", participantIds);

    if (deleteError) {
      console.error("Error deleting participants:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete participants" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount: participantIds.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Error in delete participants API:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
