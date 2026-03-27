import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Users, Calendar } from "lucide-react";
import Link from "next/link";
import { CreateRoomButton } from "@/components/seeds/CreateRoomButton";
import { SeedSettingsButton } from "@/components/seeds/SeedSettingsButton";
import { markdownToSafeHtml } from "@/lib/security/sanitize-html";
import { BeginPathButton } from "@/components/pathlab/BeginPathButton";

interface SeedDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SeedDetailPage({ params }: SeedDetailPageProps) {
  const { id } = await params;
  console.log("[SeedPage] Loading seed id:", id);
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) console.error("[SeedPage] Auth error:", authError.message);
  console.log("[SeedPage] User:", user?.id ?? "anonymous");

  // Check if user is admin
  let isAdmin = false;
  if (user) {
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (rolesError) console.error("[SeedPage] user_roles error:", rolesError.message, rolesError.code);
    isAdmin = roles?.some((r) => r.role === "admin") || false;
    console.log("[SeedPage] User ID:", user.id, "| is admin:", isAdmin);
  }

  // Fetch seed details
  console.log("[SeedPage] Fetching seed…");
  const { data: seed, error: seedError } = await supabase
    .from("seeds")
    .select(
      "*, learning_maps!map_id(title, description), category:seed_categories(id, name, logo_url)",
    )
    .eq("id", id)
    .single();

  if (seedError) console.error("[SeedPage] seeds fetch error:", seedError.message, seedError.code);
  console.log("[SeedPage] Seed found:", !!seed, "| type:", seed?.seed_type);

  if (!seed) {
    notFound();
  }

  const isPathLab = seed.seed_type === "pathlab";

  // Fetch path data separately so a missing table doesn't break the whole page
  let pathData: { id: string; total_days: number } | null = null;
  if (isPathLab) {
    console.log("[SeedPage] Fetching pathlab path data…");
    const { data: pathResult, error: pathError } = await supabase
      .from("paths")
      .select("id, total_days")
      .eq("seed_id", id)
      .maybeSingle();
    if (pathError) console.error("[SeedPage] paths fetch error:", pathError.message, pathError.code);
    console.log("[SeedPage] Path data:", pathResult);
    pathData = pathResult;
  }

  const pathTotalDays = pathData?.total_days;

  // Check if user is already in a room for this seed
  let userRoom = null;
  let userHasCompletedRoom = false;
  if (user && !isPathLab) {
    console.log("[SeedPage] Fetching room membership…");
    const { data: membershipData, error: membershipError } = await supabase
      .from("seed_room_members")
      .select(
        `
                *,
                room:seed_rooms!inner(*)
            `,
      )
      .eq("user_id", user.id)
      .eq("room.seed_id", id)
      .limit(1)
      .maybeSingle();

    if (membershipError) console.error("[SeedPage] seed_room_members error:", membershipError.message, membershipError.code);
    console.log("[SeedPage] Membership found:", !!membershipData);

    if (membershipData && (membershipData as any).room) {
      const room = (membershipData as any).room;
      console.log("[SeedPage] Room id:", room.id, "| status:", room.status, "| seed_id:", room.seed_id);
      // Check if the room is for this seed
      if (
        room.seed_id === id &&
        (room.status === "waiting" || room.status === "active")
      ) {
        userRoom = room;

        // Check if user has completed this room
        const { data: completionData, error: completionError } = await supabase
          .from("seed_room_completions")
          .select("*")
          .eq("room_id", room.id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (completionError) console.error("[SeedPage] seed_room_completions error:", completionError.message, completionError.code);
        console.log("[SeedPage] Completion found:", !!completionData);

        if (completionData) {
          userHasCompletedRoom = true;
        }
      }
    }
  }

  // Check if user is already enrolled in pathlab
  let pathEnrollmentId: string | undefined = undefined;
  if (user && isPathLab && pathData?.id) {
    console.log("[SeedPage] Fetching path enrollment…");
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("path_enrollments")
      .select("id")
      .eq("user_id", user.id)
      .eq("path_id", pathData.id)
      .maybeSingle();

    if (enrollmentError) console.error("[SeedPage] path_enrollments error:", enrollmentError.message, enrollmentError.code);
    console.log("[SeedPage] Enrollment:", enrollment?.id ?? "none");

    if (enrollment) {
      pathEnrollmentId = enrollment.id;
    }
  }

  const isCreator = user && seed.created_by === user.id;
  const canEdit = isAdmin || isCreator;

  console.log("[SeedPage] Seed created by:", seed.created_by, "| is creator:", isCreator, "| can edit:", canEdit);
  console.log("[SeedPage] Rendering page ✓");

  // Parse description markdown with line breaks preserved
  const descriptionHtml = seed.description
    ? markdownToSafeHtml(seed.description.replace(/\n/g, "  \n"))
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
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow" style={{ animationDelay: "2s" }} />
        <div className="absolute top-[40%] left-[20%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[100px] mix-blend-screen animate-pulse-slow" style={{ animationDelay: "4s" }} />
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
                <h1 className="text-5xl md:text-7xl font-extrabold mb-4 tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                  {seed.title}
                </h1>
                {seed.slogan && (
                  <p className="text-xl md:text-2xl text-white/90 font-medium mb-8 drop-shadow-md border-l-4 border-blue-500 pl-4 py-1">
                    {seed.slogan}
                  </p>
                )}

                {/* Quick Stats Row (Glassmorphism) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mb-8">
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/30 hover:bg-white/10 rounded-2xl p-5 flex flex-col gap-2 transition-all hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] duration-300 group">
                    <div className="flex items-center gap-2 text-white/50 group-hover:text-white/70 transition-colors text-xs uppercase tracking-widest font-bold">
                      <span>Series</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {seed.category?.logo_url && (
                        <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-md">
                          <img
                            src={seed.category.logo_url}
                            alt={seed.category.name}
                            className="w-8 h-8 object-contain"
                          />
                        </div>
                      )}
                      <p className="text-2xl font-bold text-white tracking-tight">
                        {seed.category?.name || "Uncategorized"}
                      </p>
                    </div>
                  </div>

                  {isPathLab ? (
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/30 hover:bg-white/10 rounded-2xl p-5 flex flex-col gap-2 transition-all hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] duration-300 group">
                      <div className="flex items-center gap-2 text-white/50 group-hover:text-white/70 transition-colors text-xs uppercase tracking-widest font-bold">
                        <Calendar className="w-4 h-4" />
                        <span>Duration</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl font-bold text-white tracking-tight">
                          {pathTotalDays || 5}
                        </span>
                        <span className="text-white/50 text-sm font-medium">
                          days <br />(~30 min each)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/30 hover:bg-white/10 rounded-2xl p-5 flex flex-col gap-2 transition-all hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] duration-300 group">
                      <div className="flex items-center gap-2 text-white/50 group-hover:text-white/70 transition-colors text-xs uppercase tracking-widest font-bold">
                        <Users className="w-4 h-4" />
                        <span>Group Size</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white tracking-tight">
                          {seed.min_students || 1}
                        </span>
                        <span className="text-white/40 font-light text-2xl">-</span>
                        <span className="text-3xl font-bold text-white tracking-tight">
                          {seed.max_students || 50}
                        </span>
                        <span className="text-white/50 text-sm font-medium ml-1">students</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Hero CTA */}
                <div className="max-w-sm pt-4">
                  {user ? (
                    <div className="transform transition-all hover:scale-[1.02] active:scale-[0.98]">
                      {isPathLab ? (
                        <BeginPathButton
                          seedId={seed.id}
                          existingEnrollmentId={pathEnrollmentId}
                        />
                      ) : (
                        <CreateRoomButton
                          seedId={seed.id}
                          userId={user.id}
                          existingRoom={userRoom}
                          isCompleted={userHasCompletedRoom}
                        />
                      )}
                    </div>
                  ) : (
                    <Link href="/login">
                      <Button className="w-full bg-white/90 text-black hover:bg-white text-lg py-7 font-bold shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] transition-all duration-300 rounded-xl hover:-translate-y-1">
                        Sign in to Start
                      </Button>
                    </Link>
                  )}
                </div>
                {canEdit && isPathLab && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      asChild
                      variant="outline"
                      className="bg-black/20 hover:bg-black/40 text-white/80 hover:text-white backdrop-blur-md border border-white/10"
                    >
                      <Link href={`/seeds/${seed.id}/pathlab-builder`}>
                        Path Builder
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="bg-black/20 hover:bg-black/40 text-white/80 hover:text-white backdrop-blur-md border border-white/10"
                    >
                      <Link href={`/seeds/${seed.id}/reports`}>
                        Student Reports
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 space-y-12">
        <section className="bg-neutral-900/40 backdrop-blur-2xl border border-white/10 hover:border-white/20 transition-all duration-500 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>

          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-4">
            <span className="w-1.5 h-8 bg-gradient-to-b from-blue-400 to-purple-600 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            {isPathLab ? "About this Exploration" : "About this Journey"}
          </h2>

          <div className="prose prose-invert prose-lg max-w-none text-neutral-300 leading-relaxed prose-headings:text-white prose-a:text-blue-400 hover:prose-a:text-blue-300 prose-strong:text-white prose-strong:font-semibold">
            {descriptionHtml ? (
              <div className="space-y-6" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
            ) : (
              <p className="text-neutral-400 italic">
                No description provided for this journey seed. It's ready to be
                explored!
              </p>
            )}

            {isPathLab && (
              <div className="mt-10 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center backdrop-blur-md">
                <div className="p-3 bg-blue-500/20 rounded-full text-blue-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                </div>
                <div>
                  <h4 className="text-white font-semibold m-0 text-lg">Self-Paced Journey</h4>
                  <p className="text-sm text-blue-200/80 m-0 mt-1">
                    PathLab is solo and self-paced. You will complete each day,
                    reflect, then intentionally decide whether to continue, pause,
                    or quit.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
