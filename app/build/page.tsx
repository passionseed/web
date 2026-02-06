import { Suspense } from "react";
import { getWeeklyLeaderboard, getUserTasks, getWeeklyFocusStats, getProjectsWithStats } from "@/actions/ps";
import { getPendingRequestCounts, getUserAssignedRequests } from "@/actions/ps-requests";
import { BuildLeaderboard } from "@/components/ps/build-leaderboard";
import Link from "next/link";
import { FolderKanban, ArrowRight, Trophy } from "lucide-react";
import { FocusGraphPaper } from "@/components/ps/FocusGraphPaper";
import { TaskList } from "@/components/ps/task-list";
import { createClient } from "@/utils/supabase/server";
import { TestButton } from "@/components/ps/test-button";

export const dynamic = "force-dynamic";

export default async function BuildPage() {
    const userTasks = await getUserTasks();

    return (
        <>
            <div className="container mx-auto py-8 space-y-8">
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Left Column: Projects Button + Focus Graph */}
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 mt-10">
                            <Suspense fallback={
                                <div className="w-full bg-blue-950/30 border-2 border-dashed border-blue-800/50 rounded-sm p-4 h-[60px]" />
                            }>
                                <ProjectButtonsFetcher />
                            </Suspense>
                        </div>

                        <Suspense fallback={<div>Loading focus stats...</div>}>
                            <FocusStatsFetcher />
                        </Suspense>
                    </div>

                    {/* Right Column: Leaderboard */}
                    <div className="md:col-span-1">
                        <Suspense fallback={<div>Loading leaderboard...</div>}>
                            <LeaderboardFetcher />
                        </Suspense>
                    </div>
                </div>

                {/* Weekly User Tasks */}
                <div className="w-full">
                    <h3 className="text-xl font-bold font-sans mb-4 text-white/90 px-1">
                        Your Weekly Schedule
                    </h3>
                    <Suspense fallback={<div className="h-96 bg-white/5 rounded-lg animate-pulse" />}>
                        <UserTasksFetcher />
                    </Suspense>
                </div>
            </div>

            {/* Fixed floating test button - outside container for proper viewport positioning */}
            <TestButton fixed tasks={userTasks} />
        </>
    );
}

async function UserTasksFetcher() {
    const tasks = await getUserTasks();
    const requests = await getUserAssignedRequests();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div className="bg-[#111827]/50 border border-white/10 rounded-sm p-4">
            <TaskList
                tasks={tasks}
                requests={requests}
                // No projectId passed -> Global View
                currentUserId={user?.id}
                isMember={true} // User is member of their own view
            />
        </div>
    );
}

async function LeaderboardFetcher() {
    const data = await getWeeklyLeaderboard();
    return <BuildLeaderboard initialData={data} />;
}

async function FocusStatsFetcher() {
    const data = await getWeeklyFocusStats();
    return <FocusGraphPaper data={data} />;
}

async function ProjectButtonsFetcher() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch all projects and departments
    const projects = await getProjectsWithStats('project');
    const departments = await getProjectsWithStats('hackathon');

    // Get pending counts for both
    const projectIds = projects.map((p: any) => p.id);
    const departmentIds = departments.map((d: any) => d.id);

    const projectCounts = await getPendingRequestCounts(projectIds);
    const departmentCounts = await getPendingRequestCounts(departmentIds);

    // Get user memberships to filter notifications
    let memberProjectIds = new Set<string>();
    if (user) {
        const { data: memberships } = await supabase
            .from("ps_project_members")
            .select("project_id")
            .eq("user_id", user.id);

        if (memberships) {
            memberships.forEach(m => memberProjectIds.add(m.project_id));
        }
    }

    console.log("[ProjectButtonsFetcher] User ID:", user?.id);
    console.log("[ProjectButtonsFetcher] Member Projects:", Array.from(memberProjectIds));

    // Sum up pending requests ONLY for projects the user is a member of
    const totalProjectPending = Object.entries(projectCounts).reduce((sum, [pid, count]) => {
        return memberProjectIds.has(pid) ? sum + count : sum;
    }, 0);

    const totalDepartmentPending = Object.entries(departmentCounts).reduce((sum, [pid, count]) => {
        return memberProjectIds.has(pid) ? sum + count : sum;
    }, 0);

    return (
        <>
            <Link href="/ps/projects" className="block group relative">
                {totalProjectPending > 0 && (
                    <div className="absolute -top-2 -right-2 z-10 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-lg border-2 border-background">
                        {totalProjectPending}
                    </div>
                )}
                <div className="w-full bg-blue-950/30 hover:bg-blue-900/50 border-2 border-dashed border-blue-800/50 rounded-sm p-4 flex items-center justify-center gap-3 transition-all hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] cursor-pointer h-[60px]">
                    <FolderKanban className="h-5 w-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
                    <span className="font-medium text-blue-400/90 group-hover:text-blue-200">Projects</span>
                </div>
            </Link>
            <Link href="/ps/hackathon" className="block group relative">
                {totalDepartmentPending > 0 && (
                    <div className="absolute -top-2 -right-2 z-10 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-lg border-2 border-background">
                        {totalDepartmentPending}
                    </div>
                )}
                <div className="w-full bg-purple-950/30 hover:bg-purple-900/50 border-2 border-dashed border-purple-800/50 rounded-sm p-4 flex items-center justify-center gap-3 transition-all hover:border-purple-500 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] cursor-pointer h-[60px]">
                    <Trophy className="h-5 w-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
                    <span className="font-medium text-purple-400/90 group-hover:text-purple-200">Next-Dec Hack</span>
                </div>
            </Link>
        </>
    );
}
