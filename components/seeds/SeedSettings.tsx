"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings, LogOut, Users, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

interface SeedSettingsProps {
    room: any;
    seed: any;
    currentUser: any;
}

export function SeedSettings({ room, seed, currentUser }: SeedSettingsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleLeaveClick = () => {
        setShowConfirm(true);
    };

    const handleLeaveConfirm = async () => {
        setLoading(true);
        setShowConfirm(false);

        try {
            console.log("=== LEAVE SEED DEBUG ===");
            console.log("Room ID:", room.id);
            console.log("User ID:", currentUser.id);
            console.log("Attempting to delete from seed_room_members...");

            const { error, data } = await supabase
                .from("seed_room_members")
                .delete()
                .eq("room_id", room.id)
                .eq("user_id", currentUser.id)
                .select();

            console.log("Delete response:", { error, data });

            if (error) {
                console.error("❌ Delete error:", error);
                console.error("Error details:", {
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint
                });
                throw error;
            }

            console.log("✅ Successfully deleted membership");
            toast.success("Left the seed session");

            // Wait a bit before redirecting to ensure the toast shows
            setTimeout(() => {
                router.push("/seeds");
                router.refresh();
            }, 500);
        } catch (error: any) {
            console.error("❌ Error in handleLeaveConfirm:", error);
            toast.error(error.message || "Failed to leave seed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Floating Settings Button */}
            <div className="fixed top-4 right-4 z-50">
                <Button
                    onClick={() => setIsOpen(!isOpen)}
                    variant="outline"
                    className="bg-neutral-900 border-neutral-700 hover:bg-neutral-800"
                    size="icon"
                >
                    <Settings className="w-5 h-5" />
                </Button>
            </div>

            {/* Settings Panel */}
            {isOpen && (
                <div className="fixed top-16 right-4 z-50 w-80">
                    <Card className="bg-neutral-900 border-neutral-700 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white">Seed Session</h3>
                            <Button
                                onClick={() => setIsOpen(false)}
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-neutral-400 mb-1">Seed</p>
                                <p className="text-white font-medium">{seed.title}</p>
                            </div>

                            <div>
                                <p className="text-sm text-neutral-400 mb-1">Room Code</p>
                                <p className="text-white font-mono font-bold">{room.join_code}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-neutral-400 mb-1">Min Students</p>
                                    <p className="text-white font-semibold">{room.min_students}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-neutral-400 mb-1">Max Students</p>
                                    <p className="text-white font-semibold">{room.max_students}</p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-neutral-700">
                                {!showConfirm ? (
                                    <Button
                                        onClick={handleLeaveClick}
                                        disabled={loading}
                                        variant="destructive"
                                        className="w-full gap-2"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Leave Seed
                                    </Button>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-sm text-yellow-300 text-center">
                                            Are you sure you want to leave?
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => setShowConfirm(false)}
                                                variant="outline"
                                                className="flex-1"
                                                disabled={loading}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={handleLeaveConfirm}
                                                variant="destructive"
                                                className="flex-1"
                                                disabled={loading}
                                            >
                                                {loading ? "Leaving..." : "Confirm"}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </>
    );
}
