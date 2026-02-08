import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { PathLabExperience } from "@/components/pathlab/PathLabExperience";
import { getPathEndReflection, getPathExitReflection, getPathReflections } from "@/lib/supabase/pathlab-reflections";

interface PathLabExperiencePageProps {
  params: Promise<{
    enrollmentId: string;
  }>;
}

export default async function PathLabExperiencePage({ params }: PathLabExperiencePageProps) {
  const { enrollmentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/seeds/pathlab/${enrollmentId}`);
  }

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("path_enrollments")
    .select(
      `
      *,
      path:paths(
        *,
        seed:seeds(*)
      )
    `
    )
    .eq("id", enrollmentId)
    .single();

  if (enrollmentError || !enrollment) {
    notFound();
  }

  if (enrollment.user_id !== user.id) {
    notFound();
  }

  const { data: day } = await supabase
    .from("path_days")
    .select("*")
    .eq("path_id", enrollment.path.id)
    .eq("day_number", enrollment.current_day)
    .maybeSingle();

  let dayNodes: any[] = [];
  if (day?.node_ids?.length) {
    const { data: fetchedNodes } = await supabase
      .from("map_nodes")
      .select(
        `
        *,
        node_paths_source:node_paths!source_node_id(*),
        node_paths_destination:node_paths!destination_node_id(*),
        node_content(*),
        node_assessments(
          *,
          quiz_questions(*)
        )
      `
      )
      .in("id", day.node_ids);

    const byId = new Map((fetchedNodes || []).map((node: any) => [node.id, node]));
    dayNodes = day.node_ids.map((id: string) => byId.get(id)).filter(Boolean);
  }

  const [reflections, exitReflection, endReflection] = await Promise.all([
    getPathReflections(enrollmentId),
    getPathExitReflection(enrollmentId),
    getPathEndReflection(enrollmentId),
  ]);

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8">
      <PathLabExperience
        enrollment={enrollment}
        seed={enrollment.path.seed}
        path={enrollment.path}
        day={day}
        dayNodes={dayNodes}
        reflections={reflections}
        exitReflection={exitReflection}
        endReflection={endReflection}
      />
    </div>
  );
}
