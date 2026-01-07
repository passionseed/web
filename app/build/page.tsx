import { Suspense } from "react";
import { getWeeklyLeaderboard, getUserTasks, getWeeklyFocusStats } from "@/actions/ps";
import { BuildLeaderboard } from "@/components/ps/build-leaderboard";
import Link from "next/link";
import { FolderKanban, ArrowRight } from "lucide-react";
import { FocusGraphPaper } from "@/components/ps/FocusGraphPaper";
import { TaskList } from "@/components/ps/task-list";
import { createClient } from "@/utils/supabase/server";

export default async function BuildPage() {
    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="grid md:grid-cols-2 gap-6">
                {/* Left Column: Projects Button + Focus Graph */}
                <div className="space-y-6">
                    <Link href="/ps/projects" className="block group mt-10">
                        <div className="w-full bg-blue-950/30 hover:bg-blue-900/50 border-2 border-dashed border-blue-800/50 rounded-sm p-4 flex items-center justify-center gap-3 transition-all hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] cursor-pointer h-[60px]">
                            <FolderKanban className="h-5 w-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
                            <span className="font-medium text-blue-400/90 group-hover:text-blue-200">Go to Projects</span>
                            <ArrowRight className="h-4 w-4 text-blue-400 group-hover:text-blue-300 transition-colors group-hover:translate-x-1" />
                        </div>
                    </Link>

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
    );
}

async function UserTasksFetcher() {
    const tasks = await getUserTasks();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div className="bg-[#111827]/50 border border-white/10 rounded-sm p-4">
            <TaskList
                tasks={tasks}
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
