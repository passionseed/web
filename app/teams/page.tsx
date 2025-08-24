import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { StudentTeamDashboard } from "@/components/teams/StudentTeamDashboard";
import { getClassroomTeams } from "@/lib/supabase/teams";
import { getClassroomTeamMaps } from "@/lib/supabase/teams";
import { getUserClassrooms } from "@/lib/supabase/classroom-memberships";

export default async function TeamsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  console.log("🔐 Auth data:xxx", { data, error });
  if (error || !data?.user) {
    redirect("/login");
  }

  const user = data.user;

  try {
    // Get user's classrooms using the existing utility function
    const userMemberships = await getUserClassrooms(user.id);

    // Check if user has student role in any classroom
    const isStudent = userMemberships.some((m) => m.role === "student");

    if (!isStudent) {
      // Redirect instructors/TAs to classrooms page
      redirect("/classrooms");
    }

    // Get student classrooms only
    const studentClassrooms = userMemberships
      .filter((m) => m.role === "student")
      .map((m) => ({
        id: m.classroom_id,
        name: m.classrooms?.name || "Unknown Classroom",
        description: m.classrooms?.description || null,
      }));

    // Get user's teams across all student classrooms
    let userTeams = [];
    let teamMaps = [];

    for (const classroom of studentClassrooms) {
      try {
        // Get teams for this classroom
        const classroomTeams = await getClassroomTeams(classroom.id, supabase);
        const userTeamsInClassroom = classroomTeams.filter(
          (team) => team.current_user_membership
        );
        userTeams.push(...userTeamsInClassroom);

        // Get team maps for this classroom
        const classroomTeamMaps = await getClassroomTeamMaps(classroom.id);
        const userTeamIds = userTeamsInClassroom.map((team) => team.id);
        const userTeamMaps = classroomTeamMaps.filter((map) =>
          userTeamIds.includes(map.team_id)
        );
        teamMaps.push(...userTeamMaps);
      } catch (error) {
        console.error(
          `Error loading data for classroom ${classroom.id}:`,
          error
        );
      }
    }

    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">My Teams</h1>
            <p className="text-muted-foreground mt-2">
              Manage your teams, collaborate on learning maps, and track
              progress together.
            </p>
          </div>

          <StudentTeamDashboard
            userId={user.id}
            userClassrooms={studentClassrooms}
            userTeams={userTeams}
            teamMaps={teamMaps}
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error loading teams page:", error);
    redirect("/classrooms");
  }
}
