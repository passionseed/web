import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Users, Calendar, Play, ArrowRight } from "lucide-react";
import Link from "next/link";
import { CreateRoomButton } from "@/components/seeds/CreateRoomButton";
import { LeaveSeedButton } from "@/components/seeds/LeaveSeedButton";

interface SeedDetailPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function SeedDetailPage({ params }: SeedDetailPageProps) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    // Fetch seed details
    const { data: seed } = await supabase
        .from("seeds")
        .select("*, learning_maps(title, description)")
        .eq("id", id)
        .single();

    if (!seed) {
        notFound();
    }

    // Get active room count for this seed
    const { count: activeRooms } = await supabase
        .from("seed_rooms")
        .select("*", { count: "exact", head: true })
        .eq("seed_id", id)
        .in("status", ["waiting", "active"]);

    // Check if user is already in a room for this seed
    let userRoom = null;
    if (user) {
        const { data: membershipData } = await supabase
            .from("seed_room_members")
            .select(`
                *,
                room:seed_rooms(*)
            `)
            .eq("user_id", user.id)
            .limit(1)
            .single();

        if (membershipData && (membershipData as any).room) {
            const room = (membershipData as any).room;
            // Check if the room is for this seed and is active/waiting
            if (room.seed_id === id && (room.status === "waiting" || room.status === "active")) {
                userRoom = room;
            }
        }
    }

    return (
        <div className="min-h-screen bg-neutral-950 p-8">
            <div className="max-w-4xl mx-auto">
                <Link href="/seeds">
                    <Button variant="ghost" className="mb-6 text-neutral-400 hover:text-white">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Seeds
                    </Button>
                </Link>

                <Card className="bg-neutral-900 border-neutral-800 p-8 mb-6">
                    <div className="mb-8">
                        <h1 className="text-5xl font-bold text-white mb-4">{seed.title}</h1>
                        <p className="text-xl text-neutral-400">{seed.description || "No description provided"}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="bg-neutral-800 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-neutral-400 mb-2">
                                <Users className="w-5 h-5" />
                                <span className="text-sm">Active Rooms</span>
                            </div>
                            <p className="text-3xl font-bold text-white">{activeRooms || 0}</p>
                        </div>

                        <div className="bg-neutral-800 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-neutral-400 mb-2">
                                <Calendar className="w-5 h-5" />
                                <span className="text-sm">Created</span>
                            </div>
                            <p className="text-lg font-semibold text-white">
                                {new Date(seed.created_at).toLocaleDateString()}
                            </p>
                        </div>

                        <div className="bg-neutral-800 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-neutral-400 mb-2">
                                <Play className="w-5 h-5" />
                                <span className="text-sm">Learning Map</span>
                            </div>
                            <p className="text-lg font-semibold text-white truncate">
                                {(seed as any).learning_maps?.title || "Unknown"}
                            </p>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">About This Journey</h2>
                        <div className="bg-neutral-800 rounded-lg p-6">
                            <p className="text-neutral-300 leading-relaxed">
                                {(seed as any).learning_maps?.description || "This is a self-paced learning journey. Join a room to start exploring the content with other learners."}
                            </p>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">Settings</h2>
                        <Card className="bg-neutral-800 border-neutral-700 p-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-sm text-neutral-400 mb-1">Minimum Students</p>
                                    <p className="text-2xl font-bold text-white">{seed.min_students || 1}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-neutral-400 mb-1">Maximum Students</p>
                                    <p className="text-2xl font-bold text-white">{seed.max_students || 50}</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {user && !userRoom && <CreateRoomButton seedId={seed.id} userId={user.id} existingRoom={userRoom} />}
                    {user && userRoom && (
                        <Link href={`/seeds/room/${userRoom.join_code}`} className="block">
                            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6">
                                <ArrowRight className="w-5 h-5 mr-2" />
                                Go to Lobby
                            </Button>
                        </Link>
                    )}
                    {!user && (
                        <Link href="/login">
                            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6">
                                Sign in to Start Journey
                            </Button>
                        </Link>
                    )}
                </Card>
            </div>
        </div>
    );
}
