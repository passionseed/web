"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2, ArrowRight } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface CreateRoomButtonProps {
    seedId: string;
    userId: string;
    existingRoom?: any;
    isCompleted?: boolean;
}

export function CreateRoomButton({ seedId, userId, existingRoom, isCompleted = false }: CreateRoomButtonProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleClick = async () => {
        // If user already has a room (not completed), just navigate to it
        if (existingRoom && !isCompleted) {
            router.push(`/seeds/room/${existingRoom.join_code}`);
            return;
        }

        // If user has a completed room, they can revisit it
        if (existingRoom && isCompleted) {
            router.push(`/seeds/room/${existingRoom.join_code}`);
            return;
        }

        // Otherwise, create a new room
        setLoading(true);
        try {
            // Get seed data to use min/max values
            const { data: seedData } = await supabase
                .from("seeds")
                .select("min_students, max_students")
                .eq("id", seedId)
                .single();

            // Generate a random 6-character code
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();

            console.log("Creating room with code:", code);

            const { data: roomData, error } = await supabase.from("seed_rooms").insert({
                seed_id: seedId,
                host_id: userId,
                join_code: code,
                status: "waiting",
                min_students: seedData?.min_students || 1,
                max_students: seedData?.max_students || 50,
            }).select().single();

            if (error) {
                console.error("Supabase error creating room:", error);
                throw error;
            }

            console.log("Room created successfully:", roomData);

            // Now join the room as the host
            const { error: joinError } = await supabase
                .from("seed_room_members")
                .insert({
                    room_id: roomData.id,
                    user_id: userId,
                });

            if (joinError) {
                console.error("Error joining room:", joinError);
                toast.error("Room created but failed to join. Please refresh the page.");
                return;
            }

            console.log("Successfully joined room, navigating to:", `/seeds/room/${code}`);
            toast.success("Room created!");
            
            // Force a hard navigation to ensure the page loads correctly
            window.location.href = `/seeds/room/${code}`;
        } catch (error) {
            console.error("Error creating room:", error);
            const errorMessage = error?.message || 
                                error?.hint || 
                                JSON.stringify(error) || 
                                "Failed to create room. Please try again.";
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            onClick={handleClick}
            disabled={loading}
            className={`w-full text-lg py-6 text-white ${
                isCompleted
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-blue-600 hover:bg-blue-700"
            }`}
        >
            {loading ? (
                <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating Room...
                </>
            ) : isCompleted ? (
                <>
                    <Play className="w-5 h-5 mr-2" />
                    Continue Completed Seed
                </>
            ) : existingRoom ? (
                <>
                    <ArrowRight className="w-5 h-5 mr-2" />
                    Go to Lobby
                </>
            ) : (
                <>
                    <Play className="w-5 h-5 mr-2" />
                    Create Room
                </>
            )}
        </Button>
    );
}
