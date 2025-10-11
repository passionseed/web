import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { StudentTeamDashboard } from "@/components/teams/StudentTeamDashboard";
import { InstructorTeamDashboard } from "@/components/teams/InstructorTeamDashboard";
import { getClassroomTeams, getClassroomTeamMaps, getClassroomTeamStats } from "@/lib/supabase/teams";
import { getUserClassrooms } from "@/lib/supabase/classroom-memberships";
import { Users } from "lucide-react";

export default async function TeamsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect("/login");
  }

  const user = data.user;

  try {
    // Get user's classrooms using the existing utility function
    // Note: getUserClassrooms handles both instructor and membership classrooms
    const userMemberships = await getUserClassrooms(user.id, supabase);

    console.log("User memberships in teams page:", {
      userId: user.id,
      count: userMemberships.length,
      memberships: userMemberships.map(m => ({
        id: m.classroom_id,
        role: m.role,
        name: m.classrooms?.name
      }))
    });

    if (userMemberships.length === 0) {
      console.log("No classrooms found for user, showing empty state");

      // Show an empty state instead of redirecting
      return (
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
              <p className="text-muted-foreground mt-2">
                Team collaboration and management
              </p>
            </div>

            <div className="text-center py-16">
              <div className="max-w-2xl mx-auto">
                <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">No Classrooms Yet</h2>
                <p className="text-muted-foreground mb-6">
                  You need to create or join a classroom before you can manage teams.
                </p>
                <a
                  href="/classrooms"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                  Go to Classrooms
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Determine primary role (instructor > ta > student)
    const hasInstructorRole = userMemberships.some(
      (m) => m.role === "instructor"
    );
    const hasTARole = userMemberships.some((m) => m.role === "ta");
    const userRole = hasInstructorRole
      ? "instructor"
      : hasTARole
      ? "ta"
      : "student";

    // Get all classrooms user is in
    const allClassrooms = userMemberships
      .filter((m) => m.classrooms) // Filter out any invalid classrooms
      .map((m) => ({
        id: m.classroom_id,
        name: m.classrooms?.name || "Unknown Classroom",
        description: m.classrooms?.description || null,
        role: m.role,
      }));

    console.log("All classrooms after mapping:", allClassrooms);

    if (allClassrooms.length === 0) {
      console.log("No valid classrooms after filtering, redirecting");
      redirect("/classrooms");
    }

    // Fetch teams and stats based on role
    if (userRole === "instructor" || userRole === "ta") {
      // Instructors/TAs see all teams across their classrooms
      const classroomDataPromises = allClassrooms.map(async (classroom) => {
        try {
          const [classroomTeams, classroomTeamMaps, classroomStats] =
            await Promise.all([
              getClassroomTeams(classroom.id, supabase),
              getClassroomTeamMaps(classroom.id, supabase),
              getClassroomTeamStats(classroom.id),
            ]);

          return {
            classroom,
            teams: classroomTeams,
            teamMaps: classroomTeamMaps,
            stats: classroomStats,
          };
        } catch (error) {
          console.error(
            `Error loading data for classroom ${classroom.id}:`,
            error
          );
          return {
            classroom,
            teams: [],
            teamMaps: [],
            stats: {
              total_teams: 0,
              active_teams: 0,
              average_team_size: 0,
              teams_at_capacity: 0,
              students_in_teams: 0,
              students_without_teams: 0,
              team_size_distribution: {},
            },
          };
        }
      });

      const classroomData = await Promise.all(classroomDataPromises);

      return (
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <InstructorTeamDashboard
              userId={user.id}
              userRole={userRole}
              classrooms={allClassrooms}
              classroomData={classroomData}
            />
          </div>
        </div>
      );
    } else {
      // Students see their teams + available teams
      const classroomDataPromises = allClassrooms.map(async (classroom) => {
        try {
          // Run both queries in parallel for each classroom
          const [classroomTeams, classroomTeamMaps] = await Promise.all([
            getClassroomTeams(classroom.id, supabase),
            getClassroomTeamMaps(classroom.id, supabase),
          ]);

          const userTeamsInClassroom = classroomTeams.filter(
            (team) => team.current_user_membership
          );

          const userTeamIds = userTeamsInClassroom.map((team) => team.id);
          const userTeamMaps = classroomTeamMaps.filter((map) =>
            userTeamIds.includes(map.team_id)
          );

          return {
            classroom,
            userTeams: userTeamsInClassroom,
            allTeams: classroomTeams,
            teamMaps: userTeamMaps,
          };
        } catch (error) {
          console.error(
            `Error loading data for classroom ${classroom.id}:`,
            error
          );
          return {
            classroom,
            userTeams: [],
            allTeams: [],
            teamMaps: [],
          };
        }
      });

      // Wait for all classroom data to load in parallel
      const classroomResults = await Promise.all(classroomDataPromises);

      // Flatten results
      const userTeams = classroomResults.flatMap(
        (result) => result.userTeams
      );
      const allTeams = classroomResults.flatMap((result) => result.allTeams);
      const teamMaps = classroomResults.flatMap((result) => result.teamMaps);

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
              userClassrooms={allClassrooms}
              userTeams={userTeams}
              allTeams={allTeams}
              teamMaps={teamMaps}
            />
          </div>
        </div>
      );
    }
  } catch (error: any) {
    console.error("Error loading teams page:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });

    // If it's a redirect error, let it through
    if (error.message && error.message.includes("NEXT_REDIRECT")) {
      throw error;
    }

    redirect("/classrooms");
  }
}
