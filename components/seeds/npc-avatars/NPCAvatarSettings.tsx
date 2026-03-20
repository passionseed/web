"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, UserCircle, Plus, Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import type { NPCAvatarData } from "@/types/npc-avatars";

interface NPCAvatarSettingsProps {
    seedId: string;
}

export function NPCAvatarSettings({ seedId }: NPCAvatarSettingsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [avatars, setAvatars] = useState<NPCAvatarData[]>([]);
    const [loading, setLoading] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        if (isOpen) {
            loadAvatars();
        }
    }, [isOpen]);

    const loadAvatars = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("seed_npc_avatars")
                .select("*")
                .eq("seed_id", seedId)
                .order("created_at", { ascending: true });

            if (error) throw error;
            setAvatars(data || []);
        } catch (error: unknown) {
            console.error("Error loading NPC avatars:", error);
            toast.error("Failed to load NPC avatars");
        } finally {
            setLoading(false);
        }
    };

    const handleAddAvatar = () => {
        const newAvatar: Partial<NPCAvatarData> = {
            id: `temp-${Date.now()}`,
            seed_id: seedId,
            name: "New NPC",
            svg_data: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="#3b82f6"/><circle cx="35" cy="40" r="5" fill="white"/><circle cx="65" cy="40" r="5" fill="white"/><path d="M 35 65 Q 50 75 65 65" stroke="white" stroke-width="3" fill="none"/></svg>',
            description: "",
        };
        setAvatars([...avatars, newAvatar as NPCAvatarData]);
    };

    const handleUpdateAvatar = (id: string, field: keyof NPCAvatarData, value: string) => {
        setAvatars(
            avatars.map((avatar) =>
                avatar.id === id ? { ...avatar, [field]: value } : avatar
            )
        );
    };

    const handleSaveAvatar = async (avatar: NPCAvatarData) => {
        setSavingId(avatar.id);
        try {
            if (avatar.id.startsWith("temp-")) {
                // Create new avatar
                const { data, error } = await supabase
                    .from("seed_npc_avatars")
                    .insert({
                        seed_id: seedId,
                        name: avatar.name,
                        svg_data: avatar.svg_data,
                        description: avatar.description,
                    })
                    .select()
                    .single();

                if (error) throw error;

                // Replace temp avatar with real one
                setAvatars(
                    avatars.map((a) => (a.id === avatar.id ? data : a))
                );
                toast.success("NPC avatar created!");
            } else {
                // Update existing avatar
                const { error } = await supabase
                    .from("seed_npc_avatars")
                    .update({
                        name: avatar.name,
                        svg_data: avatar.svg_data,
                        description: avatar.description,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", avatar.id);

                if (error) throw error;
                toast.success("NPC avatar updated!");
            }
        } catch (error: unknown) {
            console.error("Error saving NPC avatar:", error);
            toast.error("Failed to save NPC avatar");
        } finally {
            setSavingId(null);
        }
    };

    const handleDeleteAvatar = async (id: string) => {
        if (!confirm("Are you sure you want to delete this NPC avatar?")) return;

        try {
            if (!id.startsWith("temp-")) {
                const { error } = await supabase
                    .from("seed_npc_avatars")
                    .delete()
                    .eq("id", id);

                if (error) throw error;
            }

            setAvatars(avatars.filter((a) => a.id !== id));
            toast.success("NPC avatar deleted!");
        } catch (error: unknown) {
            console.error("Error deleting NPC avatar:", error);
            toast.error("Failed to delete NPC avatar");
        }
    };

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
                <div className="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700 cursor-pointer hover:bg-neutral-800/70 transition-colors">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <UserCircle className="w-5 h-5 text-purple-400" />
                            <div>
                                <Label className="text-base font-semibold cursor-pointer">
                                    NPC Avatars
                                </Label>
                                <p className="text-sm text-neutral-400">
                                    Manage SVG avatars for NPCs in this seed
                                </p>
                            </div>
                        </div>
                        <ChevronDown
                            className={`w-5 h-5 text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""
                                }`}
                        />
                    </div>
                </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
                <div className="mt-4 p-4 rounded-lg bg-neutral-800/30 border border-neutral-700 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
                        </div>
                    ) : avatars.length === 0 ? (
                        <div className="text-center py-8 text-neutral-400">
                            <UserCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No NPC avatars yet</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {avatars.map((avatar) => (
                                <div
                                    key={avatar.id}
                                    className="p-4 rounded-lg bg-neutral-900 border border-neutral-700 space-y-3"
                                >
                                    <div className="flex items-start gap-4">
                                        {/* SVG Preview */}
                                        <div className="w-20 h-20 rounded-lg border border-neutral-600 bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {avatar.svg_data ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(avatar.svg_data)}`}
                                                    alt="NPC Avatar Preview"
                                                    className="w-full h-full object-contain"
                                                />
                                            ) : (
                                                <UserCircle className="w-10 h-10 text-neutral-400" />
                                            )}
                                        </div>

                                        {/* Form Fields */}
                                        <div className="flex-1 space-y-3">
                                            <div>
                                                <Label className="text-sm">Name</Label>
                                                <Input
                                                    value={avatar.name}
                                                    onChange={(e) =>
                                                        handleUpdateAvatar(
                                                            avatar.id,
                                                            "name",
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="NPC name"
                                                    className="bg-neutral-800 border-neutral-600 mt-1"
                                                />
                                            </div>

                                            <div>
                                                <Label className="text-sm">Description</Label>
                                                <Input
                                                    value={avatar.description || ""}
                                                    onChange={(e) =>
                                                        handleUpdateAvatar(
                                                            avatar.id,
                                                            "description",
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Role or description"
                                                    className="bg-neutral-800 border-neutral-600 mt-1"
                                                />
                                            </div>

                                            <div>
                                                <Label className="text-sm">SVG Code</Label>
                                                <Textarea
                                                    value={avatar.svg_data}
                                                    onChange={(e) =>
                                                        handleUpdateAvatar(
                                                            avatar.id,
                                                            "svg_data",
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="<svg>...</svg>"
                                                    className="bg-neutral-800 border-neutral-600 mt-1 font-mono text-xs min-h-[100px]"
                                                />
                                            </div>

                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    onClick={() => handleSaveAvatar(avatar)}
                                                    disabled={savingId === avatar.id}
                                                    className="bg-purple-600 hover:bg-purple-700"
                                                >
                                                    {savingId === avatar.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        "Save"
                                                    )}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    onClick={() => handleDeleteAvatar(avatar.id)}
                                                    className="bg-red-600 hover:bg-red-700"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <Button
                        type="button"
                        onClick={handleAddAvatar}
                        className="w-full bg-neutral-700 hover:bg-neutral-600"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add NPC Avatar
                    </Button>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
