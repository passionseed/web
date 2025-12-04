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
}

export function CreateRoomButton({ seedId, userId, existingRoom }: CreateRoomButtonProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleClick = async () => {
        // If user already has a room, just navigate to it
        if (existingRoom) {
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

            const { error } = await supabase.from("seed_rooms").insert({
                seed_id: seedId,
                host_id: userId,
                join_code: code,
                status: "waiting",
                min_students: seedData?.min_students || 1,
                max_students: seedData?.max_students || 50,
            });

            if (error) {
                console.error("Supabase error creating room:", error);
                throw error;
            }

            console.log("Room created successfully with code:", code);
            toast.success("Room created!");
            router.push(`/seeds/room/${code}`);
        } catch (error) {
            console.error("Error creating room:", error);
            toast.error("Failed to create room. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            onClick={handleClick}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
        >
            {loading ? (
                <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating Room...
                </>
            ) : existingRoom ? (
                <>
                    <ArrowRight className="w-5 h-5 mr-2" />
                    Go to Lobby
                </>
            ) : (
                <>
                    <Play className="w-5 h-5 mr-2" />
                    Create Room & Start Journey
                </>
            )}
        </Button>
    );
}
