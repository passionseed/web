import { getProjectsWithStats, createProject, getUserTasks } from "@/actions/ps";
import { getPendingRequestCounts } from "@/actions/ps-requests";
import { CassetteTape } from "@/components/ps/CassetteTape";
import { redirect } from "next/navigation";
import { getUserRolesClient } from "@/lib/supabase/auth-client";
import { createClient } from "@/utils/supabase/server";
import { DynamicCreateProjectModal } from "@/components/ps/DynamicCreateProjectModal";
import { FocusButtonDialog } from "@/components/ps/focus-button-dialog";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verify role server-side (simple check before action check)
  // Ideally middleware handles this, but we'll do a quick check or let the action fail
  // We can fetch projects - if it fails, it throws authorized error which we can catch or let bubble
  let projects = [];
  let userTasks = [];
  let pendingCounts: Record<string, number> = {};
  let memberProjectIds = new Set<string>();

  try {
    projects = await getProjectsWithStats('project');
    userTasks = await getUserTasks();
    // Get pending request counts for all projects
    const projectIds = projects.map((p: any) => p.id);
    pendingCounts = await getPendingRequestCounts(projectIds);

    // Get user memberships to filter notifications
    const { data: memberships } = await supabase
      .from("ps_project_members")
      .select("project_id")
      .eq("user_id", user.id);

    if (memberships) {
      memberships.forEach(m => memberProjectIds.add(m.project_id));
    }

  } catch (e) {
    // If unauthorized, redirect or show error
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Link href="/build" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Builds
        </Link>
      </div>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-2">
            Manage your passion projects and track progress.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <FocusButtonDialog tasks={userTasks} />
          <DynamicCreateProjectModal />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project: any) => (
          <div key={project.id} className="min-h-[400px]">
            <CassetteTape
              project={project}
              stats={project.stats}
              pendingRequestCount={memberProjectIds.has(project.id) ? (pendingCounts[project.id] || 0) : 0}
            />
          </div>
        ))}
        {projects.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            No projects found. Create one to get started!
          </div>
        )}
      </div>

    </div>
  );
}
