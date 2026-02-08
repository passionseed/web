import { Suspense } from "react";
import { getWeeklyLeaderboard, getUserTasks, getWeeklyFocusStats, getPSAccess } from "@/actions/ps";
import { BuildLeaderboard } from "@/components/ps/build-leaderboard";
import Link from "next/link";
import { FolderKanban, ArrowRight, Trophy } from "lucide-react";
import { FocusGraphPaper } from "@/components/ps/FocusGraphPaper";
import { TaskList } from "@/components/ps/task-list";
import { createClient } from "@/utils/supabase/server";
import { TestButton } from "@/components/ps/test-button";
import { Button } from "@/components/ui/button";

export default async function BuildPage() {
    const access = await getPSAccess();

    if (!access.isAuthenticated || !access.isAuthorized) {
        return (
            <div className="container mx-auto py-12">
                <div className="max-w-2xl mx-auto rounded-lg border border-white/10 bg-[#0b1220]/60 p-8 text-center">
                    <h1 className="text-2xl font-bold text-white">Build Access Required</h1>
                    <p className="mt-3 text-white/70">
                        This area is currently limited to Passion Seed team members.
                    </p>
                    <p className="mt-2 text-sm text-white/60">
                        If you believe this is a mistake, please contact an admin to get access.
                    </p>
                    <div className="mt-6 flex items-center justify-center gap-3">
                        {!access.isAuthenticated && (
                            <Button asChild variant="secondary">
                                <Link href="/login">Sign In</Link>
                            </Button>
                        )}
                        <Button asChild variant="outline">
                            <Link href="/">Go Home</Link>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const userTasks = await getUserTasks();

    return (
        <>
            <div className="container mx-auto py-8 space-y-8">
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Left Column: Projects Button + Focus Graph */}
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 mt-10">
                            <Link href="/ps/projects" className="block group">
                                <div className="w-full bg-blue-950/30 hover:bg-blue-900/50 border-2 border-dashed border-blue-800/50 rounded-sm p-4 flex items-center justify-center gap-3 transition-all hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] cursor-pointer h-[60px]">
                                    <FolderKanban className="h-5 w-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
                                    <span className="font-medium text-blue-400/90 group-hover:text-blue-200">Projects</span>
                                </div>
                            </Link>
                            <Link href="/ps/hackathon" className="block group">
                                <div className="w-full bg-purple-950/30 hover:bg-purple-900/50 border-2 border-dashed border-purple-800/50 rounded-sm p-4 flex items-center justify-center gap-3 transition-all hover:border-purple-500 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] cursor-pointer h-[60px]">
                                    <Trophy className="h-5 w-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
                                    <span className="font-medium text-purple-400/90 group-hover:text-purple-200">Next-Dec Hack</span>
                                </div>
                            </Link>
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
