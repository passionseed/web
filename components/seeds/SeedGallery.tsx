"use client";

import { useState } from "react";
import { Seed } from "@/types/seeds";
import { GameBoxCard } from "./GameBoxCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { CreateSeedModal } from "./CreateSeedModal";
import { CurrentLobby } from "./CurrentLobby";
import { AdminLobbies } from "./AdminLobbies";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface SeedGalleryProps {
    seeds: Seed[];
    isAdmin: boolean;
    currentRoom?: any;
}

export function SeedGallery({ seeds, isAdmin, currentRoom }: SeedGalleryProps) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const router = useRouter();

    const handleSeedClick = (seed: Seed) => {
        router.push(`/seeds/${seed.id}`);
    };

    return (
        <div className="space-y-8">
            <CurrentLobby room={currentRoom} />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Available Seeds</h2>
                    <p className="text-neutral-400 mt-1">Start a new learning journey or join an existing one</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <span className="text-neutral-500 font-mono text-xs">#</span>
                        </div>
                        <Input
                            placeholder="Enter Code"
                            className="pl-7 bg-neutral-900/50 border-neutral-800 hover:border-neutral-700 focus:border-blue-500/50 transition-all w-32 focus:w-40 text-sm h-10"
                            maxLength={6}
                            onChange={(e) => {
                                const code = e.target.value.toUpperCase();
                                if (code.length === 6) {
                                    router.push(`/seeds/room/${code}`);
                                }
                            }}
                        />
                    </div>

                    <div className="h-6 w-px bg-neutral-800 mx-1" />

                    <AdminLobbies isAdmin={isAdmin} />

                    {isAdmin && (
                        <Button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="gap-2 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20"
                        >
                            <Plus className="w-4 h-4" />
                            Create Seed
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {seeds.map((seed) => (
                    <GameBoxCard
                        key={seed.id}
                        seed={seed}
                        href={`/seeds/${seed.id}`}
                        className="transform transition-transform duration-300"
                    />
                ))}
            </div>

            {seeds.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center bg-neutral-900/30 rounded-3xl border border-neutral-800 border-dashed">
                    <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                        <div className="w-8 h-8 border-2 border-neutral-600 rounded-full animate-spin-slow" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No Seeds Found</h3>
                    <p className="text-neutral-400 max-w-md mx-auto">
                        There are no active learning journeys available at the moment.
                    </p>
                    {isAdmin && (
                        <Button
                            onClick={() => setIsCreateModalOpen(true)}
                            variant="link"
                            className="mt-4 text-blue-400 hover:text-blue-300"
                        >
                            Create your first seed
                        </Button>
                    )}
                </div>
            )}

            <CreateSeedModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div>
    );
}
