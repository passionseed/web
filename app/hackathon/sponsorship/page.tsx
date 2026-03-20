import { createAdminClient } from "@/utils/supabase/admin";
import { SponsorshipContent } from "./SponsorshipContent";

export const dynamic = "force-dynamic";

async function getHackathonStats() {
  const admin = createAdminClient();

  // Fetch participant count
  const { count: participantCount, error: participantError } = await admin
    .from("hackathon_participants")
    .select("*", { count: "exact", head: true });

  if (participantError) {
    console.error("Error fetching hackathon participants:", participantError);
  }

  // Fetch team count
  const { count: teamCount, error: teamError } = await admin
    .from("hackathon_teams")
    .select("*", { count: "exact", head: true });

  if (teamError) {
    console.error("Error fetching hackathon teams:", teamError);
  }

  // Fetch educational levels breakdown
  const { data: gradeData, error: gradeError } = await admin
    .from("hackathon_participants")
    .select("grade_level");

  if (gradeError) {
    console.error("Error fetching grade levels:", gradeError);
  }

  // Count by grade level
  const gradeLevels: Record<string, number> = {};
  (gradeData || []).forEach((p) => {
    const level = p.grade_level || "Not specified";
    gradeLevels[level] = (gradeLevels[level] || 0) + 1;
  });

  return {
    participants: participantCount || 0,
    teams: teamCount || 0,
    gradeLevels,
  };
}

export default async function SponsorshipPage() {
  const stats = await getHackathonStats();

  return <SponsorshipContent stats={stats} />;
}
