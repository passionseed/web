import { getProject, getProjectStats } from "@/actions/ps";
import { TaskList } from "@/components/ps/task-list";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { CassetteTape } from "@/components/ps/CassetteTape";
import { ProjectGuide } from "@/components/ps/project-guide";
import { StatsPaper } from "@/components/ps/StatsPaper";

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
  let stats;
  try {
    project = await getProject(id);
    stats = await getProjectStats(id);
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

  // Combine fetched stats with calculated progress
  const completeStats = {
    feedbackCount: stats.feedbackCount,
    totalFocusMinutes: stats.totalFocusMinutes,
    progressPercent,
  };

  const theme = project.theme_color as any;
  const bgStyle = theme
    ? {
      background: `linear-gradient(to bottom, ${theme.bg} 0%, transparent 100%)`,
    }
    : {
      background: "linear-gradient(to bottom, #1f2937 0%, transparent 100%)",
    };
  const accentColor = theme?.labelStyle?.borderColor || "#3b82f6";

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

          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div className="space-y-4 max-w-2xl">
              {project.spotify_track_name && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-sm font-medium border border-white/20">
                  <span className="opacity-70">Theme Song:</span>
                  <span>{project.spotify_track_name}</span>
                  {project.spotify_artist_name && <span className="opacity-70">• {project.spotify_artist_name}</span>}
                </div>
              )}
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight font-handwriting">
                {project.name}
              </h1>
              <p className="text-xl opacity-90 leading-relaxed max-w-xl">
                {project.description}
              </p>
            </div>

            {/* Progress Circle or Indicator in Header */}
            <div className="flex flex-col items-end gap-2 shrink-0 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
              <span className="text-sm font-medium opacity-80">Project Progress</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{progressPercent}%</span>
              </div>
              <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-1000 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs opacity-70 mt-1">{completedTasks} of {totalTasks} tasks done</span>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute top-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
      </div>

      <div className="container mx-auto py-12 px-4 space-y-12">
        {/* Context Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {project.goal && (
            <div
              className="group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-primary" style={{ color: accentColor }}>
                <span>🎯</span> Goal
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {project.goal}
              </p>
            </div>
          )}

              {project.why && (
                <div className="group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <svg
                      className="w-16 h-16"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </div>
                  <h3
                    className="text-lg font-semibold mb-2 flex items-center gap-2 text-primary"
                    style={{ color: accentColor }}
                  >
                    <span>🌱</span> Why
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {project.why}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Stats Paper (Standalone) */ }
  <div className="lg:sticky lg:top-8 order-first lg:order-last">
    <StatsPaper
      stats={completeStats}
      tasks={project.ps_tasks}
      variant="standalone"
      className="transform rotate-1 hover:rotate-0 transition-transform duration-300"
    />
  </div>
        </div >

    {/* Tasks Section */ }
    < div className = "space-y-6 max-w-5xl mx-auto lg:mx-0" >
          <h3 className="text-2xl font-bold font-handwriting opacity-80 pl-2">
            Track List
          </h3>
          <div className="bg-muted/10 rounded-xl p-1">
            <TaskList
              tasks={project.ps_tasks}
              projectId={project.id}
              themeColor={theme}
            />
          </div>
        </div >
      </div >
    </div >
  );
}
