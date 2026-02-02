"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Trash2, Eye, RefreshCw, GraduationCap, UserCheck } from "lucide-react";
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

interface SeedRoom {
    id: string;
    join_code: string;
    status: "waiting" | "active" | "completed";
    created_at: string;
    max_students: number;
    mentor_id: string | null;
    seed?: { title: string };
    members?: { id: string }[];
    memberCount?: number;
}

export function AdminLobbies({ isAdmin }: AdminLobbiesProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [lobbies, setLobbies] = useState<SeedRoom[]>([]);
    const [loading, setLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{ roomId: string; joinCode: string } | null>(null);
    const [mentorLoading, setMentorLoading] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [supabase] = useState(() => createClient());

    // Get current user on mount
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUserId(user?.id || null);
        };
        getUser();
    }, [supabase.auth]);

    const fetchLobbies = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("seed_rooms")
            .select(`
                *,
                seed:seeds(title),
                members:seed_room_members(id)
            `)
            .in("status", ["waiting", "active"])
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching lobbies:", error);
            toast.error("Failed to load lobbies");
        } else {
            // Calculate member counts from the joined data
            // We cast data to any[] because supabase types might not infer the join correctly without generated types
            const lobbiesWithCounts: SeedRoom[] = (data as unknown as SeedRoom[] || []).map((room) => ({
                ...room,
                memberCount: room.members?.length || 0,
            }));
            setLobbies(lobbiesWithCounts);
        }
        setLoading(false);
    }, [supabase]);

    const handleDeleteClick = (roomId: string, joinCode: string) => {
        setDeleteConfirm({ roomId, joinCode });
    };

    const handleDeleteConfirm = async () => {
        if (!deleteConfirm) return;

        const { roomId, joinCode } = deleteConfirm;
        console.log("Attempting to delete room:", roomId, joinCode);

        // First check if room exists
        const { data: beforeDelete } = await supabase
            .from("seed_rooms")
            .select("id, join_code, status")
            .eq("id", roomId)
            .single();
        console.log("Room before delete:", beforeDelete);

        const { error, data: deleteResult } = await supabase
            .from("seed_rooms")
            .delete()
            .eq("id", roomId)
            .select();

        console.log("Delete result:", deleteResult);

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
            console.log("Successfully deleted room, rows affected:", deleteResult?.length);

            // Verify it's actually deleted
            const { data: afterDelete } = await supabase
                .from("seed_rooms")
                .select("id")
                .eq("id", roomId)
                .single();
            console.log("Room after delete (should be null):", afterDelete);

            toast.success("Lobby deleted");
            await fetchLobbies();
        }

        setDeleteConfirm(null);
    };

    const handleAssignMentor = async (roomId: string) => {
        if (!currentUserId) return;
        setMentorLoading(roomId);
        try {
            // Update mentor_id only if it's currently null (atomic operation)
            const { data, error } = await supabase
                .from("seed_rooms")
                .update({ mentor_id: currentUserId })
                .eq("id", roomId)
                .is("mentor_id", null) // Use .is() for NULL checks, not .eq()
                .select();

            if (error) throw error;

            // Check if any rows were affected
            if (!data || data.length === 0) {
                toast.error("This room already has a mentor assigned");
                setMentorLoading(null);
                return;
            }

            toast.success("You are now the mentor for this room!");
            fetchLobbies();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error";
            console.error("Error assigning mentor:", error);
            toast.error(message || "Failed to assign as mentor");
        } finally {
            setMentorLoading(null);
        }
    };

    const handleUnassignMentor = async (roomId: string) => {
        setMentorLoading(roomId);
        try {
            const { error } = await supabase
                .from("seed_rooms")
                .update({ mentor_id: null })
                .eq("id", roomId);

            if (error) throw error;
            toast.success("Mentor unassigned");
            fetchLobbies();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error";
            console.error("Error unassigning mentor:", error);
            toast.error(message || "Failed to unassign mentor");
        } finally {
            setMentorLoading(null);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchLobbies();
        }
    }, [isOpen, fetchLobbies]);

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
                                            {lobby.seed?.title || "Unknown Seed"}
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

                                    {/* Mentor Section */}
                                    <div className="flex items-center gap-2 mr-4">
                                        {lobby.mentor_id ? (
                                            lobby.mentor_id === currentUserId ? (
                                                <Button
                                                    onClick={() => handleUnassignMentor(lobby.id)}
                                                    disabled={mentorLoading === lobby.id}
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-2 border-emerald-600 text-emerald-400"
                                                >
                                                    <UserCheck className="w-4 h-4" />
                                                    {mentorLoading === lobby.id ? "..." : "You (Mentor)"}
                                                </Button>
                                            ) : (
                                                <span className="flex items-center gap-1 text-sm text-emerald-400">
                                                    <UserCheck className="w-4 h-4" />
                                                    Mentor Assigned
                                                </span>
                                            )
                                        ) : (
                                            <Button
                                                onClick={() => handleAssignMentor(lobby.id)}
                                                disabled={mentorLoading === lobby.id}
                                                variant="outline"
                                                size="sm"
                                                className="gap-2 border-neutral-600 text-neutral-400 hover:border-emerald-600 hover:text-emerald-400"
                                            >
                                                <GraduationCap className="w-4 h-4" />
                                                {mentorLoading === lobby.id ? "..." : "Become Mentor"}
                                            </Button>
                                        )}
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
