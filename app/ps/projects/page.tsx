import { getProjectsWithStats, createProject } from "@/actions/ps";
import { CassetteTape } from "@/components/ps/CassetteTape";
import { CreateProjectModal } from "@/components/ps/CreateProjectModal";
import { redirect } from "next/navigation";
import { getUserRolesClient } from "@/lib/supabase/auth-client";
import { createClient } from "@/utils/supabase/server";

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
  try {
    projects = await getProjectsWithStats();
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-2">
            Manage your passion projects and track progress.
          </p>
        </div>
        <CreateProjectModal />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project: any) => (
          <CassetteTape
            key={project.id}
            project={project}
            stats={project.stats}
          />
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
