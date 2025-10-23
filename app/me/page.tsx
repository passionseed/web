import { redirect } from "next/navigation";
import { Suspense } from "react";
import { UserPortal } from "@/components/user-portal";
import { JourneyMapCanvas } from "@/components/journey";
import { createClient } from "@/utils/supabase/server";
import { getUserDashboardData } from "@/lib/supabase/reflection";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Map } from "lucide-react";

async function getJourneyProjectsServer(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("journey_projects")
    .select(
      `
      *,
      milestones:project_milestones(*)
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching journey projects:", error);
    return [];
  }

  return (data || []).map((project: any) => ({
    ...project,
    milestones: project.milestones || [],
    milestone_count: project.milestones?.length || 0,
    completed_milestone_count:
      project.milestones?.filter((m: any) => m.status === "completed").length ||
      0,
  }));
}

function JourneyMapLoading() {
  return (
    <div className="w-full h-[600px] md:h-[700px] flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-xl">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
        <p className="text-muted-foreground">Loading your journey map...</p>
      </div>
    </div>
  );
}

async function JourneyMapSection({
  userId,
  userName,
  userAvatar,
}: {
  userId: string;
  userName: string;
  userAvatar?: string;
}) {
  const projects = await getJourneyProjectsServer(userId);

  if (projects.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <Map className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Start Your Journey</h3>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            Create your first project to begin mapping your learning journey and
            tracking your progress.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full h-[600px] md:h-[700px] rounded-xl overflow-hidden border shadow-lg">
      <JourneyMapCanvas
        userId={userId}
        userName={userName}
        userAvatar={userAvatar}
      />
    </div>
  );
}

export default async function PortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dashboardData = await getUserDashboardData(supabase);

  const userName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const userAvatar = user.user_metadata?.avatar_url;

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <div className="container mx-auto px-4 md:px-6 py-6 md:py-10 max-w-7xl">
          {/* Journey Map Hero Section */}
          <div className="mb-8 md:mb-12">
            <div className="mb-4">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
                Your Journey Map
              </h2>
              <p className="text-muted-foreground">
                Visualize your projects, milestones, and progress at a glance
              </p>
            </div>
            <Suspense fallback={<JourneyMapLoading />}>
              <JourneyMapSection
                userId={user.id}
                userName={userName}
                userAvatar={userAvatar}
              />
            </Suspense>
          </div>

          {/* User Portal Content */}
          <UserPortal dashboardData={dashboardData} />
        </div>
      </main>
    </div>
  );
}
