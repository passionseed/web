"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface LeaveSeedButtonProps {
    roomId: string;
    userId: string;
}

export function LeaveSeedButton({ roomId, userId }: LeaveSeedButtonProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleLeave = async () => {
        setLoading(true);
        try {
            console.log("Leaving seed room:", roomId, "User:", userId);

            const { error } = await supabase
                .from("seed_room_members")
                .delete()
                .eq("room_id", roomId)
                .eq("user_id", userId);

            if (error) {
                console.error("Error leaving seed:", error);
                throw error;
            }

            console.log("Successfully left seed");
            toast.success("Left the seed");
            router.refresh();
        } catch (error: any) {
            console.error("Error leaving seed:", error);
            toast.error(error.message || "Failed to leave seed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            onClick={handleLeave}
            disabled={loading}
            variant="destructive"
            className="gap-2"
        >
            {loading ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Leaving...
                </>
            ) : (
                <>
                    <LogOut className="w-4 h-4" />
                    Leave Seed
                </>
            )}
        </Button>
    );
}
