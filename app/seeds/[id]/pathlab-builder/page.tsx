import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { PathDayBuilder } from "@/components/pathlab/PathDayBuilder";
import { PageBuilder } from "@/components/pathlab/PageBuilder";
import { GeneratedPathReview } from "@/components/pathlab/GeneratedPathReview";
import { PATHLAB_CURRICULUM } from "../../pathlab/curriculum";
import { ArrowLeft, Map as MapIcon, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { DebugButton } from "@/components/pathlab/DebugButton";

interface PathLabBuilderPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PathLabBuilderPage({
  params,
}: PathLabBuilderPageProps) {
  const { id: seedId } = await params;
  console.log('[PathLabBuilder] Page loaded with seedId:', seedId);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log('[PathLabBuilder] User authenticated:', user?.id);

  if (!user) {
    console.log('[PathLabBuilder] No user found, redirecting to login');
    redirect(`/login?next=/seeds/${seedId}/pathlab-builder`);
  }

  const [{ data: seed }, { data: roles }] = await Promise.all([
    supabase.from("seeds").select("*").eq("id", seedId).single(),
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "instructor"]),
  ]);

  console.log('[PathLabBuilder] Seed data:', {
    seedId,
    seedType: seed?.seed_type,
    createdBy: seed?.created_by,
    title: seed?.title
  });
  console.log('[PathLabBuilder] User roles:', roles);

  if (!seed) {
    console.log('[PathLabBuilder] Seed not found, returning 404');
    notFound();
  }

  if (seed.seed_type !== "pathlab") {
    console.log('[PathLabBuilder] Seed is not a pathlab, returning 404');
    notFound();
  }

  const isAdminOrInstructor = !!roles?.length;
  const isCreator = seed.created_by === user.id;
  console.log('[PathLabBuilder] Permission check:', { isAdminOrInstructor, isCreator });

  if (!isAdminOrInstructor && !isCreator) {
    console.log('[PathLabBuilder] User lacks permission, returning 404');
    notFound();
  }

  let { data: path } = await supabase
    .from("paths")
    .select("*")
    .eq("seed_id", seed.id)
    .maybeSingle();

  console.log('[PathLabBuilder] Path lookup result:', path ? `Found path ${path.id}` : 'No path found');

  if (!path) {
    console.log('[PathLabBuilder] Creating new path for seed:', seed.id);
    const { data: createdPath, error: createPathError } = await supabase
      .from("paths")
      .insert({
        seed_id: seed.id,
        total_days: 5,
        created_by: user.id,
      })
      .select("*")
      .single();

    if (createPathError || !createdPath) {
      console.error('[PathLabBuilder] Failed to create path:', createPathError);
      throw new Error(createPathError?.message || "Failed to initialize path");
    }
    console.log('[PathLabBuilder] Created new path:', createdPath.id);
    path = createdPath;
  }

  // Fetch path days
  const { data: days } = await supabase
    .from("path_days")
    .select("*")
    .eq("path_id", path.id)
    .order("day_number", { ascending: true });

  console.log('[PathLabBuilder] Path days fetched:', {
    count: days?.length || 0,
    days: days?.map(d => ({ id: d.id, day_number: d.day_number, title: d.title }))
  });

  // Only fetch map nodes if we have days using the legacy system
  const hasLegacyDays = days && days.length > 0 && days.some(d => d.node_ids && d.node_ids.length > 0);
  let mapNodes = [];

  console.log('[PathLabBuilder] Legacy system check:', { hasLegacyDays });

  if (hasLegacyDays) {
    const result = await supabase
      .from("map_nodes")
      .select("id, title, node_type")
      .eq("map_id", seed.map_id)
      .order("created_at", { ascending: true });
    mapNodes = result.data || [];
    console.log('[PathLabBuilder] Map nodes fetched:', mapNodes.length);
  }

  const initialDays =
    days && days.length > 0
      ? days
      : PATHLAB_CURRICULUM.map((day) => ({
          ...day,
          context_text: day.context_text,
        }));

  // Feature flag: Use new PageBuilder or legacy PathDayBuilder
  console.log('[PathLabBuilder] Feature flag USE_NEW_PAGE_BUILDER:', FEATURE_FLAGS.USE_NEW_PAGE_BUILDER);

  if (FEATURE_FLAGS.USE_NEW_PAGE_BUILDER) {
    console.log('[PathLabBuilder] Using new PageBuilder system');

    // Ensure we have at least one page
    let allDays = days && days.length > 0 ? days : [];

    if (allDays.length === 0) {
      console.log('[PathLabBuilder] No pages exist, creating default page');
      const { data: createdPage, error: createPageError } = await supabase
        .from("path_days")
        .insert({
          path_id: path.id,
          day_number: 1,
          title: null,
          context_text: "",
          reflection_prompts: [],
          node_ids: [],
          migrated_from_nodes: true,
        })
        .select("*")
        .single();

      if (createPageError || !createdPage) {
        console.error('[PathLabBuilder] Failed to create page:', createPageError);
        throw new Error(createPageError?.message || "Failed to create page");
      }
      console.log('[PathLabBuilder] Created default page:', createdPage.id);
      allDays = [createdPage];
    }

    // Fetch activities for all pages
    const pageIds = allDays.map((d) => d.id).filter(Boolean);

    console.log('[PathLabBuilder] Fetching activities for page IDs:', pageIds);

    let allActivities: any[] = [];

    // Only fetch activities if we have valid page IDs
    if (pageIds.length > 0) {
      try {
        const { data, error: activitiesError } = await supabase
          .from("path_activities")
          .select(
            `
            *,
            path_content (*),
            path_assessment:path_assessments (
              *,
              quiz_questions:path_quiz_questions (*)
            )
          `
          )
          .in("path_day_id", pageIds)
          .order("display_order", { ascending: true });

        if (activitiesError) {
          console.error('[PathLabBuilder] Failed to fetch activities:', activitiesError);
          // Continue with empty activities array instead of crashing
        } else {
          allActivities = data || [];
          console.log('[PathLabBuilder] Activities fetched:', allActivities.length);
        }
      } catch (error) {
        console.error('[PathLabBuilder] Activities fetch exception:', error);
        // Continue with empty activities array
      }
    } else {
      console.log('[PathLabBuilder] No page IDs, skipping activity fetch');
    }

    // Group activities by page
    const activitiesByPage = new Map();
    if (allActivities && Array.isArray(allActivities)) {
      allActivities.forEach((activity) => {
        const pageId = activity.path_day_id;
        if (pageId && !activitiesByPage.has(pageId)) {
          activitiesByPage.set(pageId, []);
        }
        if (pageId) {
          activitiesByPage.get(pageId).push({
            ...activity,
            path_content: activity.path_content || [],
            path_assessment: activity.path_assessment?.[0] || null,
          });
        }
      });
    }

    // Build page data
    const initialPages = allDays.map((day) => ({
      id: day.id,
      day_number: day.day_number,
      title: day.title,
      context_text: day.context_text,
      reflection_prompts: day.reflection_prompts || [],
      activities: activitiesByPage.get(day.id) || [],
    }));

    console.log('[PathLabBuilder] Initial pages built:', {
      count: initialPages.length,
      pages: initialPages.map(p => ({
        id: p.id,
        day_number: p.day_number,
        title: p.title,
        activities_count: p.activities.length
      }))
    });

    // Import MultiPageBuilder
    const { MultiPageBuilder } = await import(
      "@/components/pathlab/PageBuilder/MultiPageBuilder"
    );

    console.log('[PathLabBuilder] Rendering MultiPageBuilder component');

    // Use new multi-page builder with navigation
    return (
      <div className="h-screen flex flex-col bg-neutral-950">
        {/* Top Navigation */}
        <div className="border-b border-neutral-800 px-6 py-3 bg-neutral-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/seeds/${seedId}`}
                className="flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to seed
              </Link>
              <span className="text-neutral-700">|</span>
              <h2 className="text-sm font-medium text-white">{seed.title}</h2>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/seeds/${seedId}/reports`}
                className="text-sm text-neutral-400 transition-colors hover:text-white"
              >
                Reports
              </Link>
              <DebugButton
                data={{
                  seedId,
                  pathId: path.id,
                  totalDays: path.total_days,
                  pagesCount: initialPages.length,
                  pages: initialPages.map(p => ({
                    id: p.id,
                    day_number: p.day_number,
                    title: p.title,
                    activities_count: p.activities.length
                  })),
                  featureFlag: FEATURE_FLAGS.USE_NEW_PAGE_BUILDER
                }}
              />
            </div>
          </div>
        </div>

        {/* Multi-Page Builder */}
        <div className="flex-1 overflow-hidden">
          <MultiPageBuilder
            seedId={seedId}
            pathId={path.id}
            initialPages={initialPages}
            totalDays={path.total_days}
            initialDayNumber={1}
          />
        </div>
      </div>
    );
  }

  // Legacy PathDayBuilder (default when feature flag is disabled)
  console.log('[PathLabBuilder] Using legacy PathDayBuilder system');
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/seeds/${seedId}`}
            className="flex items-center gap-1 text-sm text-neutral-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to seed
          </Link>
          <Link
            href={`/seeds/${seedId}/reports`}
            className="text-sm text-neutral-400 transition-colors hover:text-white"
          >
            Reports
          </Link>
        </div>
        {days && days.length > 0 && days.some(d => d.node_ids && d.node_ids.length > 0) && (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="border-green-700 text-green-300 hover:bg-green-950/50">
              <Link href={`/seeds/${seedId}/pathlab-builder/migrate`}>
                Migrate to New System
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
              <Link href={`/map/${seed.map_id}/edit`}>
                <MapIcon className="mr-2 h-4 w-4" />
                Edit Map Nodes (Legacy)
              </Link>
            </Button>
          </div>
        )}
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">
          PathLab Builder
        </p>
        <h1 className="text-3xl font-bold text-white">{seed.title}</h1>
        {!hasLegacyDays && (
          <p className="text-sm text-green-400 mt-1">
            Using new activities system - build content directly without maps
          </p>
        )}
      </div>
      <PathDayBuilder
        pathId={path.id}
        totalDays={path.total_days}
        initialDays={
          (initialDays || []) as Array<{
            id?: string;
            day_number: number;
            title: string | null;
            context_text: string;
            reflection_prompts: string[];
            node_ids: string[];
          }>
        }
        mapNodes={
          (mapNodes || []) as Array<{
            id: string;
            title: string;
            node_type: string | null;
          }>
        }
        mapId={seed.map_id}
        mode="activities"
      />
      <GeneratedPathReview
        seedId={seed.id}
        nodes={
          (mapNodes || []).map((node: any) => ({
            id: node.id,
            title: node.title,
          }))
        }
      />
    </div>
  );
}
