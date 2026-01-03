
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Clock, Medal } from "lucide-react";

interface LeaderboardEntry {
    userId: string;
    name: string;
    avatarUrl: string | null;
    totalMinutes: number;
}

interface BuildLeaderboardProps {
    initialData: LeaderboardEntry[];
}

export function BuildLeaderboard({ initialData }: BuildLeaderboardProps) {
    // Top 3 styling helpers
    const getRankIcon = (index: number) => {
        switch (index) {
            case 0: return <Trophy className="h-6 w-6 text-yellow-500" />;
            case 1: return <Medal className="h-6 w-6 text-gray-400" />;
            case 2: return <Medal className="h-6 w-6 text-amber-600" />;
            default: return <span className="font-bold text-muted-foreground w-6 text-center">{index + 1}</span>;
        }
    };

    const formatTime = (minutes: number) => {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hrs > 0) return `${hrs}h ${mins}m`;
        return `${mins}m`;
    };

    return (
        <div className="grid gap-6">
            <Card className="bg-gradient-to-br from-card to-background border-none shadow-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-6 w-6 text-primary" />
                        Weekly Focus Champions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {initialData.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No focus sessions recorded this week yet. Be the first!
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {initialData.map((user, index) => (
                                <div
                                    key={user.userId}
                                    className={`flex items-center gap-4 p-4 rounded-lg transition-all
                                        ${index === 0 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-card hover:bg-muted/50'}
                                    `}
                                >
                                    <div className="flex-shrink-0 flex items-center justify-center w-8">
                                        {getRankIcon(index)}
                                    </div>

                                    <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                                        <AvatarImage src={user.avatarUrl || ""} />
                                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                    </Avatar>

                                    <div className="flex-grow min-w-0">
                                        <p className="font-semibold truncate">{user.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {user.totalMinutes} minutes focused
                                        </p>
                                    </div>

                                    <div className="flex-shrink-0 font-mono font-bold text-lg">
                                        {formatTime(user.totalMinutes)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
