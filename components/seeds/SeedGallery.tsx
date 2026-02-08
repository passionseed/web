"use client";

import { useState, useEffect } from "react";
import { Seed } from "@/types/seeds";
import { GameBoxCard } from "./GameBoxCard";
import { MentoredLobbyCard } from "./MentoredLobbyCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Users, Building2 } from "lucide-react";
import { CreateSeedModal } from "./CreateSeedModal";
import { CurrentLobby } from "./CurrentLobby";
import { AdminLobbies } from "./AdminLobbies";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface SeedGalleryProps {
    seeds: Seed[];
    mentoredRooms?: any[];
    isAdmin: boolean;
    isInstructor: boolean;
    currentRoom?: any;
    initialSeedType?: "collaborative" | "pathlab";
}

export function SeedGallery({
    seeds,
    mentoredRooms = [],
    isAdmin,
    isInstructor,
    currentRoom,
    initialSeedType = "collaborative",
}: SeedGalleryProps) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"mentored" | "catalog">(
        mentoredRooms.length > 0 && initialSeedType !== "pathlab" ? "mentored" : "catalog"
    );
    const [activeSeedType, setActiveSeedType] = useState<"collaborative" | "pathlab">(initialSeedType);
    const router = useRouter();

    // Clear active room when viewing main seeds gallery
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('activeSeedRoom');
        }
    }, []);

    const filteredSeeds = seeds.filter((seed) => {
        if (activeSeedType === "pathlab") {
            return seed.seed_type === "pathlab";
        }
        return seed.seed_type !== "pathlab";
    });

    return (
        <div className="space-y-8">
            <CurrentLobby room={currentRoom} />

            {/* Tabs for Instructors and Admins */}
            {(isInstructor || isAdmin) && mentoredRooms.length > 0 && (
                <div className="flex items-center gap-2 border-b border-neutral-800">
                    <button
                        onClick={() => setActiveTab("mentored")}
                        className={cn(
                            "px-4 py-2 font-semibold text-sm transition-colors border-b-2 -mb-px flex items-center gap-2",
                            activeTab === "mentored"
                                ? "border-blue-500 text-blue-400"
                                : "border-transparent text-neutral-500 hover:text-neutral-300"
                        )}
                    >
                        <Users className="w-4 h-4" />
                        My Lobbies ({mentoredRooms.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("catalog")}
                        className={cn(
                            "px-4 py-2 font-semibold text-sm transition-colors border-b-2 -mb-px flex items-center gap-2",
                            activeTab === "catalog"
                                ? "border-blue-500 text-blue-400"
                                : "border-transparent text-neutral-500 hover:text-neutral-300"
                        )}
                    >
                        <Building2 className="w-4 h-4" />
                        Browse Catalog
                    </button>
                </div>
            )}

            {activeTab === "mentored" && mentoredRooms.length > 0 ? (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl font-bold text-white tracking-tight">My Mentored Lobbies</h2>
                            <p className="text-neutral-400 mt-1">Manage your active sessions and track student progress</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {mentoredRooms.map((room) => (
                            <MentoredLobbyCard key={room.id} room={room} />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h2 className="text-3xl font-bold text-white tracking-tight">
                                {activeSeedType === "pathlab" ? "PathLab Explorations" : "Workshop Seeds"}
                            </h2>
                            <p className="text-neutral-400 mt-1">
                                {activeSeedType === "pathlab"
                                    ? "Solo, self-paced paths with intentional decision points"
                                    : "Collaborative workshop experiences with lobbies"}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {activeSeedType === "collaborative" && (
                                <>
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
                                </>
                            )}

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

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveSeedType("collaborative")}
                            className={cn(
                                "rounded-full border px-4 py-2 text-sm transition-colors",
                                activeSeedType === "collaborative"
                                    ? "border-white/60 bg-white/10 text-white"
                                    : "border-neutral-700 text-neutral-400 hover:text-white"
                            )}
                        >
                            Workshops
                        </button>
                        <button
                            onClick={() => setActiveSeedType("pathlab")}
                            className={cn(
                                "rounded-full border px-4 py-2 text-sm transition-colors",
                                activeSeedType === "pathlab"
                                    ? "border-white/60 bg-white/10 text-white"
                                    : "border-neutral-700 text-neutral-400 hover:text-white"
                            )}
                        >
                            PathLab
                        </button>
                    </div>

                    {/* Group seeds by category */}
                    {(() => {
                        // Group seeds by category
                        const grouped = filteredSeeds.reduce((acc, seed) => {
                            const categoryName = seed.category?.name || "Uncategorized";
                            if (!acc[categoryName]) {
                                acc[categoryName] = [];
                            }
                            acc[categoryName].push(seed);
                            return acc;
                        }, {} as Record<string, typeof seeds>);

                        return Object.entries(grouped).map(([categoryName, categorySeeds]) => (
                            <div key={categoryName} className="space-y-4">
                                <h3 className="text-xl font-bold text-white tracking-tight">{categoryName}</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                    {categorySeeds.map((seed) => (
                                        <GameBoxCard
                                            key={seed.id}
                                            seed={seed}
                                            href={`/seeds/${seed.id}`}
                                            className="transform transition-transform duration-300"
                                        />
                                    ))}
                                </div>
                            </div>
                        ));
                    })()}

                    {filteredSeeds.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-24 text-center bg-neutral-900/30 rounded-3xl border border-neutral-800 border-dashed">
                            <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                                <div className="w-8 h-8 border-2 border-neutral-600 rounded-full animate-spin-slow" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">No Seeds Found</h3>
                            <p className="text-neutral-400 max-w-md mx-auto">
                                {activeSeedType === "pathlab"
                                    ? "No PathLab explorations are available right now."
                                    : "No workshop seeds are available right now."}
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
                </div>
            )}

            <CreateSeedModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div>
    );
}
