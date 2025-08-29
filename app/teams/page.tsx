import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { StudentTeamDashboard } from "@/components/teams/StudentTeamDashboard";
import { getClassroomTeams } from "@/lib/supabase/teams";
import { getClassroomTeamMaps } from "@/lib/supabase/teams";
import { getUserClassrooms } from "@/lib/supabase/classroom-memberships";

export default async function TeamsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
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

    // Get user's teams across all student classrooms in parallel
    const classroomDataPromises = studentClassrooms.map(async (classroom) => {
      try {
        // Run both queries in parallel for each classroom
        const [classroomTeams, classroomTeamMaps] = await Promise.all([
          getClassroomTeams(classroom.id, supabase),
          getClassroomTeamMaps(classroom.id)
        ]);

        const userTeamsInClassroom = classroomTeams.filter(
          (team) => team.current_user_membership
        );
        
        const userTeamIds = userTeamsInClassroom.map((team) => team.id);
        const userTeamMaps = classroomTeamMaps.filter((map) =>
          userTeamIds.includes(map.team_id)
        );

        return {
          userTeams: userTeamsInClassroom,
          teamMaps: userTeamMaps
        };
      } catch (error) {
        console.error(
          `Error loading data for classroom ${classroom.id}:`,
          error
        );
        return { userTeams: [], teamMaps: [] };
      }
    });

    // Wait for all classroom data to load in parallel
    const classroomResults = await Promise.all(classroomDataPromises);

    // Flatten results
    const userTeams = classroomResults.flatMap(result => result.userTeams);
    const teamMaps = classroomResults.flatMap(result => result.teamMaps);

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
