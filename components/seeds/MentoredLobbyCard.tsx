"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Users, Calendar, Clock, ArrowRight, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MentoredLobbyCardProps {
    room: any;
    className?: string;
}

export function MentoredLobbyCard({ room, className }: MentoredLobbyCardProps) {
    const [memberCount, setMemberCount] = useState(0);

    // Calculate member count from room_members if available
    useEffect(() => {
        if (room.seed_room_members) {
            setMemberCount(room.seed_room_members.length);
        }
    }, [room]);

    const statusColors = {
        waiting: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
        active: "bg-green-500/20 text-green-300 border-green-500/30",
        completed: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    };

    const statusColor = statusColors[room.status as keyof typeof statusColors] || statusColors.waiting;

    return (
        <div
            className={cn(
                "group relative w-full rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 transition-all duration-300 hover:shadow-xl hover:shadow-blue-900/10",
                className
            )}
        >
            {/* Background with Seed Cover */}
            <div className="absolute inset-0 opacity-20">
                {room.seeds?.cover_image_url && (
                    <div
                        className="absolute inset-0 bg-cover bg-center blur-sm scale-110"
                        style={{ backgroundImage: `url(${room.seeds.cover_image_url})` }}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/90 to-neutral-900/50" />
            </div>

            {/* Content */}
            <div className="relative z-10 p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-white mb-1 truncate">
                            {room.seeds?.title || "Unknown Seed"}
                        </h3>
                        {room.seeds?.slogan && (
                            <p className="text-sm text-neutral-400 line-clamp-1">
                                {room.seeds.slogan}
                            </p>
                        )}
                    </div>
                    <div className={cn("px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border backdrop-blur-sm", statusColor)}>
                        {room.status}
                    </div>
                </div>

                {/* Room Code - Prominent */}
                <div className="bg-neutral-950/80 border border-neutral-700 rounded-lg p-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1">Room Code</p>
                            <code className="text-2xl font-bold text-white font-mono tracking-widest">
                                {room.join_code}
                            </code>
                        </div>
                        <Button
                            asChild
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                        >
                            <Link href={`/seeds/room/${room.join_code}`}>
                                Enter
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-neutral-400 text-xs mb-1">
                            <Users className="w-3 h-3" />
                            <span className="uppercase tracking-wider font-semibold">Students</span>
                        </div>
                        <p className="text-lg font-bold text-white">
                            {memberCount} / {room.max_students || 50}
                        </p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-neutral-400 text-xs mb-1">
                            <Calendar className="w-3 h-3" />
                            <span className="uppercase tracking-wider font-semibold">Created</span>
                        </div>
                        <p className="text-sm font-semibold text-white">
                            {new Date(room.created_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric'
                            })}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
