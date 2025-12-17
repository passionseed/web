"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface CurrentLobbyProps {
    room: any;
}

export function CurrentLobby({ room }: CurrentLobbyProps) {
    const router = useRouter();

    if (!room) return null;

    return (
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-900/40 via-purple-900/20 to-neutral-900 border-blue-500/30 p-0 mb-10 group hover:border-blue-500/50 transition-all duration-300">
            <div className="absolute top-0 right-0 p-32 bg-blue-500/10 blur-3xl rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />

            <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 text-blue-400">
                        <div className="p-1.5 bg-blue-500/10 rounded-md">
                            <Users className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium tracking-wide uppercase">Active Session</span>
                    </div>

                    <div>
                        <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
                            {room.seed?.title || "Unknown Seed"}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-neutral-400">
                            <div className="flex items-center gap-2 bg-neutral-900/50 px-3 py-1.5 rounded-md border border-neutral-800">
                                <span className="text-neutral-500">CODE</span>
                                <span className="font-mono font-bold text-blue-400 tracking-wider">{room.join_code}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${room.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                                <span>{room.status === "waiting" ? "Waiting for players" : "Session Active"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <Button
                    onClick={() => router.push(`/seeds/room/${room.join_code}`)}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 h-12 px-8 text-base"
                >
                    Rejoin Lobby
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>
        </Card>
    );
}
