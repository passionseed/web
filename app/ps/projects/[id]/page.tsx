import { getProject, getProjectStats, joinProject, getProjectMembers } from "@/actions/ps";
import { TaskList } from "@/components/ps/task-list";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { CassetteTape } from "@/components/ps/CassetteTape";
import { ProjectGuide } from "@/components/ps/project-guide";
import { StatsPaper } from "@/components/ps/StatsPaper";
import { EditProjectDialog } from "@/components/ps/EditProjectDialog";

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
  const members = await getProjectMembers(id);
  const isMember = members.some((m) => m.user_id === user.id); // Assuming user.id is available from session or action check

  const handleJoin = async () => {
    "use server";
    await joinProject(id);
  };


  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-hidden">
      {/* Background Ambience */}
      <div
        className="absolute top-0 left-0 right-0 h-[600px] opacity-10 -z-10"
        style={bgStyle}
      />

      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-12">
          <Button
            variant="ghost"
            className="pl-0 hover:pl-2 transition-all"
            asChild
          >
            <Link href="/ps/projects">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            {!isMember && (
              <form action={handleJoin}>
                <Button variant="default" className="shadow-lg bg-green-600 hover:bg-green-700">
                  Join Project
                </Button>
              </form>
            )}
            {isMember && (
              <>
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <Link href={`/ps/projects/${project.id}/feedback`}>
                    <MessageSquare className="h-4 w-4" />
                    Feedback Hub
                  </Link>
                </Button>
                <EditProjectDialog project={project} />
              </>
            )}
            <ProjectGuide />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-12 mb-16 items-start">
          {/* Left: Cassette & Context */}
          <div className="space-y-12">
            <div className="flex justify-center lg:justify-start">
              <CassetteTape
                project={project}
                stats={completeStats}
                hidePaper={true}
                className="max-w-[420px]"
              />
            </div>

            {/* Context Cards */}
            <div className="grid gap-6 md:grid-cols-2">
              {project.goal && (
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
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <h3
                    className="text-lg font-semibold mb-2 flex items-center gap-2 text-primary"
                    style={{ color: accentColor }}
                  >
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

          <div className="lg:sticky lg:top-8 order-first lg:order-last">
            <StatsPaper
              stats={completeStats}
              tasks={project.ps_tasks}
              paperText={project.paper_text}
              projectId={project.id}
              variant="standalone"
              className="transform rotate-1 hover:rotate-0 transition-transform duration-300"
            />
          </div>
        </div>

        {/* Tasks Section */}
        <div className="space-y-6 w-full">
          <h3 className="text-2xl font-bold font-handwriting opacity-80 pl-2">
            Track List
          </h3>
          <div className="bg-muted/10 rounded-xl p-1">
            <TaskList
              tasks={project.ps_tasks}
              projectId={project.id}
              themeColor={theme}
              initialDate={new Date()}
              isMember={isMember}
              members={members}
              currentUserId={user.id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
