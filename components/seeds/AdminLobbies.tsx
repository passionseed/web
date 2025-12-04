"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Trash2, Eye, RefreshCw } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";

interface AdminLobbiesProps {
    isAdmin: boolean;
}

export function AdminLobbies({ isAdmin }: AdminLobbiesProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [lobbies, setLobbies] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{ roomId: string; joinCode: string } | null>(null);
    const supabase = createClient();

    const fetchLobbies = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("seed_rooms")
            .select(`
                *,
                seed:seeds(title),
                members:seed_room_members(count)
            `)
            .in("status", ["waiting", "active"])
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching lobbies:", error);
            toast.error("Failed to load lobbies");
        } else {
            // Count members for each room
            const lobbiesWithCounts = await Promise.all(
                (data || []).map(async (room) => {
                    const { count } = await supabase
                        .from("seed_room_members")
                        .select("*", { count: "exact", head: true })
                        .eq("room_id", room.id);

                    return { ...room, memberCount: count || 0 };
                })
            );
            setLobbies(lobbiesWithCounts);
        }
        setLoading(false);
    };

    const handleDeleteClick = (roomId: string, joinCode: string) => {
        setDeleteConfirm({ roomId, joinCode });
    };

    const handleDeleteConfirm = async () => {
        if (!deleteConfirm) return;

        const { roomId, joinCode } = deleteConfirm;
        console.log("Attempting to delete room:", roomId, joinCode);

        const { error } = await supabase
            .from("seed_rooms")
            .delete()
            .eq("id", roomId);

        if (error) {
            console.error("Delete error:", error);
            console.error("Error details:", {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
            toast.error(`Failed to delete lobby: ${error.message}`);
        } else {
            console.log("Successfully deleted room");
            toast.success("Lobby deleted");
            fetchLobbies();
        }

        setDeleteConfirm(null);
    };

    useEffect(() => {
        if (isOpen) {
            fetchLobbies();
        }
    }, [isOpen]);

    if (!isAdmin) return null;

    return (
        <>
            <Button
                onClick={() => setIsOpen(true)}
                variant="outline"
                className="gap-2 border-neutral-700"
            >
                <Eye className="w-4 h-4" />
                View All Lobbies
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-4xl bg-neutral-900 border-neutral-800 text-white max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">Manage Lobbies</DialogTitle>
                        <DialogDescription className="text-neutral-400">
                            View and manage all active seed lobbies
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex justify-between items-center mb-4">
                        <p className="text-sm text-neutral-400">
                            {lobbies.length} active {lobbies.length === 1 ? "lobby" : "lobbies"}
                        </p>
                        <Button
                            onClick={fetchLobbies}
                            variant="ghost"
                            size="sm"
                            disabled={loading}
                            className="gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {lobbies.map((lobby) => (
                            <Card key={lobby.id} className="bg-neutral-800 border-neutral-700 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="font-mono font-bold text-blue-400 text-lg">
                                                {lobby.join_code}
                                            </span>
                                            <span className={`px-2 py-1 rounded-full text-xs ${lobby.status === "waiting"
                                                    ? "bg-yellow-600 text-white"
                                                    : "bg-green-600 text-white"
                                                }`}>
                                                {lobby.status}
                                            </span>
                                        </div>
                                        <p className="text-white font-medium mb-1">
                                            {(lobby as any).seed?.title || "Unknown Seed"}
                                        </p>
                                        <div className="flex items-center gap-4 text-sm text-neutral-400">
                                            <span className="flex items-center gap-1">
                                                <Users className="w-4 h-4" />
                                                {lobby.memberCount} / {lobby.max_students}
                                            </span>
                                            <span>
                                                Created: {new Date(lobby.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => handleDeleteClick(lobby.id, lobby.join_code)}
                                        variant="destructive"
                                        size="sm"
                                        className="gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </Button>
                                </div>
                            </Card>
                        ))}

                        {lobbies.length === 0 && !loading && (
                            <div className="text-center py-12 text-neutral-400">
                                <p>No active lobbies</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent className="bg-neutral-900 border-neutral-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Delete Lobby</DialogTitle>
                        <DialogDescription className="text-neutral-400">
                            Are you sure you want to delete room <span className="font-mono font-bold text-blue-400">{deleteConfirm?.joinCode}</span>?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setDeleteConfirm(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteConfirm}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
