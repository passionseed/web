
import { Suspense } from "react";
import { getWeeklyLeaderboard } from "@/actions/ps";
import { BuildLeaderboard } from "@/components/ps/build-leaderboard";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, ArrowRight } from "lucide-react";

export default async function BuildPage() {
    return (
        <div className="container mx-auto py-8 space-y-8">
            <h1 className="text-3xl font-bold">Build Dashboard</h1>

            <div className="grid md:grid-cols-2 gap-6">
                <Link href="/ps/projects" className="block group">
                    <Card className="h-full hover:shadow-lg transition-all border-l-4 border-l-primary cursor-pointer hover:scale-[1.02]">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <FolderKanban className="h-6 w-6 text-primary group-hover:text-primary/80 transition-colors" />
                                My Projects
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground mb-4">
                                Manage your passion projects, break them down into tasks, and track your progress.
                            </p>
                            <div className="flex items-center text-primary font-medium group-hover:translate-x-1 transition-transform">
                                Go to Projects <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <div className="md:col-span-1">
                    <Suspense fallback={<div>Loading leaderboard...</div>}>
                        <LeaderboardFetcher />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}

async function LeaderboardFetcher() {
    const data = await getWeeklyLeaderboard();
    return <BuildLeaderboard initialData={data} />;
}
