import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Users, Calendar, Play, ArrowRight } from "lucide-react";
import Link from "next/link";
import { CreateRoomButton } from "@/components/seeds/CreateRoomButton";
import { SeedSettingsButton } from "@/components/seeds/SeedSettingsButton";
import { marked } from "marked";
import { sanitizeHtml } from "@/lib/security";

interface SeedDetailPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function SeedDetailPage({ params }: SeedDetailPageProps) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    // Check if user is admin
    let isAdmin = false;
    if (user) {
        const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);

        isAdmin = roles?.some(r => r.role === "admin") || false;
        console.log("User ID:", user.id);
        console.log("User roles:", roles);
        console.log("Is admin:", isAdmin);
    }

    // Fetch seed details
    const { data: seed } = await supabase
        .from("seeds")
        .select("*, learning_maps!map_id(title, description), category:seed_categories(id, name, logo_url)")
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
    let userHasCompletedRoom = false;
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
            // Check if the room is for this seed
            if (room.seed_id === id && (room.status === "waiting" || room.status === "active")) {
                userRoom = room;

                // Check if user has completed this room
                const { data: completionData } = await supabase
                    .from("seed_room_completions")
                    .select("*")
                    .eq("room_id", room.id)
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (completionData) {
                    userHasCompletedRoom = true;
                }
            }
        }
    }

    const isCreator = user && seed.created_by === user.id;
    const canEdit = isAdmin || isCreator;

    console.log("Seed created by:", seed.created_by);
    console.log("Is creator:", isCreator);
    console.log("Can edit:", canEdit);

    // Parse description markdown with line breaks preserved
    const descriptionHtml = seed.description
        ? sanitizeHtml(marked.parse(seed.description.replace(/\n/g, '  \n'), { async: false }) as string) // Preserve line breaks in markdown
        : null;

    return (
        <div className="min-h-screen relative overflow-hidden font-sans">
            {/* Background Image - Heavily Blurred for Atmosphere - Extended to Full Page */}
            <div className="fixed inset-0 z-0">
                {seed.cover_image_url ? (
                    <>
                        <div
                            className="absolute inset-0 bg-cover bg-center transform scale-125 blur-3xl opacity-60"
                            style={{ backgroundImage: `url(${seed.cover_image_url})` }}
                        />
                        {/* Gradient Overlay - Lighter and more transparent */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neutral-950/60 to-neutral-950/80" />
                    </>
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900" />
                )}
            </div>

            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[800px] h-[800px] bg-purple-900/10 rounded-full blur-[120px] mix-blend-screen" />
            </div>

            {/* Settings Button - Positioned below navbar */}
            {canEdit && (
                <div className="fixed top-24 right-6 z-40">
                    <SeedSettingsButton seed={seed} />
                </div>
            )}

            {/* Hero Section with Atmospheric Color Background */}
            <div className="relative w-full min-h-[50vh] flex flex-col pt-24 pb-12 overflow-visible">

                {/* Hero Content */}
                <div className="relative z-10 flex-1 flex flex-col justify-end px-6">
                    <div className="max-w-7xl mx-auto w-full">

                        {/* Back Button - Aligned with Title */}
                        <div className="mb-6">
                            <Link href="/seeds">
                                <Button
                                    variant="ghost"
                                    className="bg-black/20 hover:bg-black/40 text-white/80 hover:text-white backdrop-blur-md border border-white/10 rounded-full px-4 group"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                                    Back to Seeds
                                </Button>
                            </Link>
                        </div>

                        <div className="flex flex-col gap-8">
                            <div className="max-w-4xl">
                                <h1 className="text-5xl md:text-7xl font-bold text-white mb-2 tracking-tight drop-shadow-lg leading-tight">
                                    {seed.title}
                                </h1>
                                {seed.slogan && (
                                    <p className="text-xl md:text-2xl text-white/80 font-medium mb-6 drop-shadow-md">
                                        {seed.slogan}
                                    </p>
                                )}

                                {/* Quick Stats Row (Glassmorphism) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mb-6">
                                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 flex flex-col gap-1 transition-transform hover:scale-105 duration-300">
                                        <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wider font-semibold">
                                            <span>Series</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {seed.category?.logo_url && (
                                                <img
                                                    src={seed.category.logo_url}
                                                    alt={seed.category.name}
                                                    className="w-10 h-10 object-contain"
                                                />
                                            )}
                                            <p className="text-2xl font-bold text-white">{seed.category?.name || 'Uncategorized'}</p>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 flex flex-col gap-1 transition-transform hover:scale-105 duration-300">
                                        <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wider font-semibold">
                                            <Users className="w-4 h-4" />
                                            <span>Group Size</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl font-bold text-white">{seed.min_students || 1}</span>
                                            <span className="text-white/50">-</span>
                                            <span className="text-2xl font-bold text-white">{seed.max_students || 50}</span>
                                            <span className="text-white/60 text-sm">students</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Hero CTA */}
                                <div className="max-w-xs">
                                    {user ? (
                                        <CreateRoomButton
                                            seedId={seed.id}
                                            userId={user.id}
                                            existingRoom={userRoom}
                                            isCompleted={userHasCompletedRoom}
                                        />
                                    ) : (
                                        <Link href="/login">
                                            <Button className="w-full bg-white text-black hover:bg-neutral-200 text-lg py-6 font-bold shadow-xl">
                                                Sign in to Start
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 space-y-12">
                <section className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
                    <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
                        <span className="w-1 h-8 bg-blue-500 rounded-full mr-2" />
                        About this Journey
                    </h2>
                    <div className="prose prose-invert prose-lg max-w-none text-neutral-300 leading-relaxed space-y-4">
                        {descriptionHtml ? (
                            <div dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
                        ) : (
                            <p>No description provided for this journey seed. It's ready to be explored!</p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

