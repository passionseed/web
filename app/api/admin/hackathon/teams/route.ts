import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createServiceClient(
    process.env.HACKATHON_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
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

    // Use service client for hackathon data
    const serviceClient = getServiceClient();

    // Fetch all teams with their members and participant details
    const { data: teams, error } = await serviceClient
      .from("hackathon_teams")
      .select(`
        *,
        hackathon_team_members(
          joined_at,
          participant_id,
          hackathon_participants(
            id,
            name,
            email,
            university,
            created_at,
            phone,
            line_id,
            discord_username,
            instagram_handle,
            grade_level,
            track
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching teams:", error);
      return NextResponse.json(
        { error: "Failed to fetch teams" },
        { status: 500 }
      );
    }

    return NextResponse.json({ teams });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Error in hackathon teams API:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
