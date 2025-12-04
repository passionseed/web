"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { SeedRoom, Seed } from "@/types/seeds";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, Users, Play, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface LobbyViewProps {
    room: SeedRoom;
    seed: Seed;
    currentUser: any;
    isAdmin?: boolean;
}

interface Member {
    id: string;
    user_id: string;
    joined_at: string;
    user?: {
        email?: string;
        user_metadata?: {
            avatar_url?: string;
            full_name?: string;
        };
    };
}

export function LobbyView({ room, seed, currentUser, isAdmin }: LobbyViewProps) {
    const [members, setMembers] = useState<Member[]>([]);
    const [currentRoom, setCurrentRoom] = useState(room);
    const supabase = createClient();
    const router = useRouter();
    const isHost = currentUser.id === room.host_id;

    const handleAdminReturn = () => {
        // For admins, navigate to seeds with a special flag to bypass redirect
        router.push("/seeds?admin=true");
    };

    useEffect(() => {
        fetchMembers();

        // Subscribe to member changes
        const memberChannel = supabase
            .channel(`room-members-${room.id}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "seed_room_members",
                    filter: `room_id=eq.${room.id}`,
                },
                () => {
                    fetchMembers();
                }
            )
            .subscribe();

        // Subscribe to room status changes
        const roomChannel = supabase
            .channel(`room-status-${room.id}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "seed_rooms",
                    filter: `id=eq.${room.id}`,
                },
                (payload) => {
                    setCurrentRoom(payload.new as SeedRoom);
                    if (payload.new.status === "active") {
                        router.refresh();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(memberChannel);
            supabase.removeChannel(roomChannel);
        };
    }, [room.id]);

    const fetchMembers = async () => {
        console.log("Fetching members for room:", room.id);
        const { data, error } = await supabase
            .from("seed_room_members")
            .select("*")
            .eq("room_id", room.id)
            .order("joined_at", { ascending: true });

        if (error) {
            console.error("Error fetching members:", error);
        }

        console.log("Members data:", data);
        console.log("Members count:", data?.length || 0);

        if (data) {
            setMembers(data as any);
        }
    };

    const handleStart = async () => {
        if (members.length < currentRoom.min_students) {
            toast.error(`Need at least ${currentRoom.min_students} student(s) to start`);
            return;
        }

        const { error } = await supabase
            .from("seed_rooms")
            .update({ status: "active" })
            .eq("id", room.id);

        if (error) {
            toast.error("Failed to start journey");
        } else {
            toast.success("Journey started!");
        }
    };

    const handleLeave = async () => {
        console.log("Attempting to leave room:", room.id, "User:", currentUser.id);

        const { error } = await supabase
            .from("seed_room_members")
            .delete()
            .eq("room_id", room.id)
            .eq("user_id", currentUser.id);

        if (error) {
            console.error("Error leaving room:", error);
            console.error("Error details:", {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
            toast.error(`Failed to leave room: ${error.message}`);
        } else {
            console.log("Successfully left room");
            toast.success("Left the lobby");
            router.push("/seeds");
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(room.join_code);
        toast.success("Room code copied!");
    };

    const getInitials = (userId: string) => {
        // Use first 2 characters of user ID
        return userId.slice(0, 2).toUpperCase();
    };

    const getDisplayName = (member: Member) => {
        // Check if this is the current user
        if (member.user_id === currentUser.id) {
            return "You";
        }
        // Check if this is the host
        if (member.user_id === room.host_id) {
            return "Host";
        }
        // Otherwise show a generic name with index
        const index = members.findIndex(m => m.id === member.id);
        return `Student ${index + 1}`;
    };

    return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-8">
            <Card className="w-full max-w-2xl bg-neutral-900 border-neutral-800 p-8">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">{seed.title}</h1>
                    <p className="text-neutral-400">Waiting for students to join...</p>
                </div>

                <div className="mb-6">
                    <div className="bg-neutral-800 rounded-lg p-6 text-center">
                        <p className="text-sm text-neutral-400 mb-2">ROOM CODE</p>
                        <div className="flex items-center justify-center gap-3">
                            <p className="text-4xl font-bold text-blue-400 font-mono tracking-wider">
                                {currentRoom.join_code}
                            </p>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(currentRoom.join_code);
                                    toast.success("Room code copied!");
                                }}
                                className="p-2 hover:bg-neutral-700 rounded-md transition-colors"
                            >
                                <Copy className="w-5 h-5 text-neutral-400" />
                            </button>
                        </div>
                        <div className="mt-4 pt-4 border-t border-neutral-700">
                            <div className="flex items-center justify-center gap-6 text-sm">
                                <div>
                                    <span className="text-neutral-400">Min: </span>
                                    <span className="text-white font-semibold">{currentRoom.min_students}</span>
                                </div>
                                <div className="w-px h-4 bg-neutral-600"></div>
                                <div>
                                    <span className="text-neutral-400">Max: </span>
                                    <span className="text-white font-semibold">{currentRoom.max_students}</span>
                                </div>
                                <div className="w-px h-4 bg-neutral-600"></div>
                                <div>
                                    <span className="text-neutral-400">Current: </span>
                                    <span className="text-blue-400 font-semibold">{members.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {isAdmin && (
                    <div className="mb-6">
                        <Button
                            onClick={handleAdminReturn}
                            variant="outline"
                            className="w-full border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                        >
                            Return to Seeds Menu (Admin)
                        </Button>
                    </div>
                )}

                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Participants ({members.length}/{currentRoom.max_students})
                        </h3>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {members.map((member, index) => (
                            <div
                                key={member.id}
                                className="flex items-center gap-3 bg-neutral-800 rounded-lg p-3 hover:bg-neutral-750 transition-colors"
                            >
                                <Avatar className="w-10 h-10">
                                    <AvatarFallback className="bg-blue-600 text-white">
                                        {getInitials(member.user_id)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="text-white font-medium">{getDisplayName(member)}</p>
                                    <p className="text-xs text-neutral-400">
                                        {member.user_id === room.host_id ? "Host" : `Joined ${index + 1}${index === 0 ? "st" : index === 1 ? "nd" : index === 2 ? "rd" : "th"}`}
                                    </p>
                                </div>
                                {member.user_id === room.host_id && (
                                    <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                                        Host
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={handleLeave}
                            className="flex-1 border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Leave Lobby
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/seeds/${seed.id}`)}
                            className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
                        >
                            View Seed Details
                        </Button>
                        {isHost && (
                            <Button
                                onClick={handleStart}
                                disabled={members.length < currentRoom.min_students}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 disabled:text-neutral-500 disabled:cursor-not-allowed"
                            >
                                <Play className="w-4 h-4 mr-2" />
                                Start Journey
                            </Button>
                        )}
                    </div>

                    {isHost && members.length < currentRoom.min_students && (
                        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
                            <p className="text-center text-sm text-yellow-200">
                                Need {currentRoom.min_students - members.length} more {currentRoom.min_students - members.length === 1 ? "student" : "students"} to start
                                <span className="block text-xs text-yellow-300 mt-1">
                                    ({members.length}/{currentRoom.min_students} minimum required)
                                </span>
                            </p>
                        </div>
                    )}

                    {!isHost && (
                        <div className="text-center text-neutral-400 py-2">
                            <p className="text-sm">Waiting for host to start...</p>
                            {members.length < currentRoom.min_students && (
                                <p className="text-xs text-yellow-300 mt-1">
                                    Need {currentRoom.min_students - members.length} more to meet minimum
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
