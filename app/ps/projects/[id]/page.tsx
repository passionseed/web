import { getProject } from "@/actions/ps";
import { TaskList } from "@/components/ps/task-list";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

interface ProjectDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { id } = await params;

  // Re-verify auth just in case, though action checks it too
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let project;
  try {
    project = await getProject(id);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        </div>
      );
    }
    return notFound();
  }

  if (!project) {
    return notFound();
  }

  // Calculate progress
  const totalTasks = project.ps_tasks.length;
  const completedTasks = project.ps_tasks.filter(
    (t) => t.status === "done"
  ).length;
  const progressPercent =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Button
          variant="ghost"
          className="mb-4 pl-0 hover:pl-2 transition-all"
          asChild
        >
          <Link href="/ps/projects">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
          </Link>
        </Button>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">
              {project.name}
            </h1>
            <p className="text-xl text-muted-foreground">
              {project.description}
            </p>
            {project.goal && (
              <div className="bg-muted/30 p-4 rounded-lg border">
                <h3 className="font-semibold mb-1">Goal</h3>
                <p>{project.goal}</p>
              </div>
            )}
            {project.why && (
              <div className="bg-muted/30 p-4 rounded-lg border">
                <h3 className="font-semibold mb-1">Why</h3>
                <p>{project.why}</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-card border rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-lg mb-4">Progress</h3>
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground">Completion</span>
                <span className="font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                {completedTasks} of {totalTasks} tasks completed
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t pt-8">
        <TaskList tasks={project.ps_tasks} projectId={project.id} />
      </div>
    </div>
  );
}
