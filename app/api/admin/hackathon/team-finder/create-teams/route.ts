import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { listTeamFinderParticipants } from "@/lib/hackathon/team-finder";
import { matchTeams } from "@/components/admin/team-matching/matchTeams";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");
  if (!roles?.length) throw new Error("Not authorized");
}

function getServiceClient() {
  return createServiceClient(
    process.env.HACKATHON_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function generateLobbyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST() {
  try {
    await requireAdmin();

    const participants = await listTeamFinderParticipants();
    if (participants.length === 0) {
      return NextResponse.json({ error: "No participants opted in" }, { status: 400 });
    }

    const simUsers = participants.map((p) => ({
      id: p.id,
      name: p.name,
      preferences: p.preferences,
    }));
    const teams = matchTeams(simUsers);

    const supabase = getServiceClient();
    const created: { id: string; name: string; memberIds: string[] }[] = [];

    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      const teamName = `Team Finder ${i + 1}`;

      let teamRow: { id: string } | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const lobby_code = generateLobbyCode();
        const { data, error } = await supabase
          .from("hackathon_teams")
          .insert({ name: teamName, lobby_code, owner_id: team.members[0].id })
          .select("id")
          .single();
        if (!error && data) { teamRow = data; break; }
        if (error?.code !== "23505") throw error;
      }
      if (!teamRow) throw new Error("Failed to generate unique lobby code");

      await supabase.from("hackathon_team_members").insert(
        team.members.map((m) => ({ team_id: teamRow!.id, participant_id: m.id }))
      );

      created.push({ id: teamRow.id, name: teamName, memberIds: team.members.map((m) => m.id) });
    }

    return NextResponse.json({ teamsCreated: created.length, teams: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create teams";
    const status = message === "Not authenticated" ? 401 : message === "Not authorized" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
