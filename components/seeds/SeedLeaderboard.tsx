"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { getSeedRoomLeaderboard } from "@/lib/supabase/seed-leaderboard";
import type { LeaderboardEntry } from "@/types/seeds";
import { Trophy, ChevronDown, ChevronUp, Medal, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SeedLeaderboardProps {
    roomId: string;
    userId: string;
}

export function SeedLeaderboard({ roomId, userId }: SeedLeaderboardProps) {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [loading, setLoading] = useState(true);

    // Load initial leaderboard
    useEffect(() => {
        loadLeaderboard();
    }, [roomId]);

    // Subscribe to submission_grades changes for real-time updates
    useEffect(() => {
        const supabase = createClient();

        const channel = supabase
            .channel(`leaderboard-${roomId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "submission_grades",
                },
                () => {
                    // Debounce updates to prevent excessive re-renders
                    const timeoutId = setTimeout(() => {
                        loadLeaderboard();
                    }, 1000);
                    return () => clearTimeout(timeoutId);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId]);

    const loadLeaderboard = async () => {
        setLoading(true);
        try {
            const limit = isExpanded ? 10 : 3;
            const data = await getSeedRoomLeaderboard(roomId, limit);
            setLeaderboard(data);
        } catch (error) {
            console.error("Error loading leaderboard:", error);
        } finally {
            setLoading(false);
        }
    };

    // Reload when expanding/collapsing to get correct limit
    useEffect(() => {
        loadLeaderboard();
    }, [isExpanded]);

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown className="w-4 h-4 text-yellow-400" />;
        if (rank === 2) return <Medal className="w-4 h-4 text-gray-300" />;
        if (rank === 3) return <Medal className="w-4 h-4 text-amber-600" />;
        return <span className="text-xs text-neutral-400">#{rank}</span>;
    };

    const displayedLeaderboard = isExpanded ? leaderboard : leaderboard.slice(0, 3);

    return (
        <div className="absolute top-4 right-4 z-20 hidden md:block pointer-events-auto"
        >
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-yellow-900/20 border-2 border-yellow-500/50 rounded-xl shadow-2xl shadow-yellow-900/20 min-w-[280px] max-w-[320px]"
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between p-3 border-b border-yellow-500/30 cursor-pointer hover:bg-yellow-500/5 transition-colors"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Leaderboard</h3>
                            <p className="text-[10px] text-neutral-400">Top Performers</p>
                        </div>
                    </div>
                    <button className="text-yellow-500 hover:text-yellow-400 transition-colors">
                        {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                        ) : (
                            <ChevronDown className="w-5 h-5" />
                        )}
                    </button>
                </div>

                {/* Leaderboard Content */}
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    <AnimatePresence mode="popLayout">
                        {loading && leaderboard.length === 0 ? (
                            <div className="p-4 text-center text-neutral-400 text-xs">
                                Loading leaderboard...
                            </div>
                        ) : leaderboard.length === 0 ? (
                            <div className="p-4 text-center text-neutral-400 text-xs">
                                No scores yet
                            </div>
                        ) : (
                            <div className="p-2 space-y-1">
                                {displayedLeaderboard.map((entry, index) => {
                                    const isCurrentUser = entry.user_id === userId;
                                    return (
                                        <motion.div
                                            key={entry.user_id}
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ delay: index * 0.05 }}
                                            className={`flex items-center justify-between p-2 rounded-lg transition-colors ${isCurrentUser
                                                ? "bg-yellow-500/20 border border-yellow-500/50"
                                                : "bg-neutral-800/50 hover:bg-neutral-800"
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <div className="w-6 flex items-center justify-center flex-shrink-0">
                                                    {getRankIcon(entry.rank)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p
                                                        className={`text-xs font-semibold truncate ${isCurrentUser
                                                            ? "text-yellow-400"
                                                            : "text-white"
                                                            }`}
                                                        title={entry.full_name || entry.username}
                                                    >
                                                        {entry.full_name || entry.username}
                                                        {isCurrentUser && (
                                                            <span className="ml-1 text-[10px]">(You)</span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <div
                                                className={`text-xs font-bold flex-shrink-0 ${isCurrentUser
                                                    ? "text-yellow-400"
                                                    : "text-neutral-300"
                                                    }`}
                                            >
                                                {entry.total_points} pts
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Show More Hint */}
                {!isExpanded && leaderboard.length > 3 && (
                    <div className="p-2 border-t border-yellow-500/30 text-center">
                        <p className="text-[10px] text-neutral-400">
                            +{leaderboard.length - 3} more • Click to expand
                        </p>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
