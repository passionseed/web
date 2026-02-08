import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { PathDayBuilder } from "@/components/pathlab/PathDayBuilder";
import { GeneratedPathReview } from "@/components/pathlab/GeneratedPathReview";
import { PATHLAB_CURRICULUM } from "../../pathlab/curriculum";
import { ArrowLeft, Map } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PathLabBuilderPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PathLabBuilderPage({
  params,
}: PathLabBuilderPageProps) {
  const { id: seedId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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

  if (!seed) {
    notFound();
  }

  if (seed.seed_type !== "pathlab") {
    notFound();
  }

  const isAdminOrInstructor = !!roles?.length;
  const isCreator = seed.created_by === user.id;
  if (!isAdminOrInstructor && !isCreator) {
    notFound();
  }

  let { data: path } = await supabase
    .from("paths")
    .select("*")
    .eq("seed_id", seed.id)
    .maybeSingle();

  if (!path) {
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
      throw new Error(createPathError?.message || "Failed to initialize path");
    }
    path = createdPath;
  }

  const [{ data: days }, { data: mapNodes }] = await Promise.all([
    supabase
      .from("path_days")
      .select("*")
      .eq("path_id", path.id)
      .order("day_number", { ascending: true }),
    supabase
      .from("map_nodes")
      .select("id, title, node_type")
      .eq("map_id", seed.map_id)
      .order("created_at", { ascending: true }),
  ]);

  const initialDays =
    days && days.length > 0
      ? days
      : PATHLAB_CURRICULUM.map((day) => ({
          ...day,
          context_text: day.context_text,
        }));

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
            href={`/seeds/${seedId}/pathlab-reports`}
            className="text-sm text-neutral-400 transition-colors hover:text-white"
          >
            Reports
          </Link>
        </div>
        <Button asChild variant="outline" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
          <Link href={`/map/${seed.map_id}/edit`}>
            <Map className="mr-2 h-4 w-4" />
            Edit Map Nodes
          </Link>
        </Button>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">
          PathLab Builder
        </p>
        <h1 className="text-3xl font-bold text-white">{seed.title}</h1>
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
