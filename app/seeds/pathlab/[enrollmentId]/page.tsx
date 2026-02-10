import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { PathLabExperience } from "@/components/pathlab/PathLabExperience";
import { getPathEndReflection, getPathExitReflection, getPathReflections } from "@/lib/supabase/pathlab-reflections";

interface PathLabExperiencePageProps {
  params: Promise<{
    enrollmentId: string;
  }>;
  searchParams: Promise<{
    day?: string | string[];
  }>;
}

type PathDayRow = {
  day_number: number | string | null;
  title: string | null;
  context_text: string | null;
  reflection_prompts: string[] | null;
  node_ids: string[] | null;
};

type PathDayNodeRow = {
  id: string;
  title: string | null;
};

export default async function PathLabExperiencePage({ params, searchParams }: PathLabExperiencePageProps) {
  const { enrollmentId } = await params;
  const { day: daySearchParam } = await searchParams;
  const requestedDayNumber =
    typeof daySearchParam === "string" ? Number.parseInt(daySearchParam, 10) : Number.NaN;
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

  const { data: days } = await supabase
    .from("path_days")
    .select("day_number, title, context_text, reflection_prompts, node_ids")
    .eq("path_id", enrollment.path.id)
    .order("day_number", { ascending: true });

  const dayRows = (days || []) as PathDayRow[];
  const allPathDayNodeIds = Array.from(
    new Set(
      dayRows.flatMap((entry) =>
        Array.isArray(entry.node_ids) ? entry.node_ids : [],
      ),
    ),
  );
  const nodeTitleById = new Map<string, string>();

  if (allPathDayNodeIds.length > 0) {
    const { data: pathDayNodes } = await supabase
      .from("map_nodes")
      .select("id, title")
      .in("id", allPathDayNodeIds);

    ((pathDayNodes || []) as PathDayNodeRow[]).forEach((node) => {
      nodeTitleById.set(node.id, node.title?.trim() || "Untitled activity");
    });
  }

  const allDayNumbers = dayRows
    .map((entry) => Number(entry.day_number))
    .filter((entry: number) => Number.isFinite(entry));

  const pathDaySummaries = dayRows
    .filter((entry) => Number.isFinite(Number(entry.day_number)))
    .map((entry) => ({
      day_number: Number(entry.day_number),
      title: typeof entry.title === "string" ? entry.title : null,
      context_text:
        typeof entry.context_text === "string" ? entry.context_text : "",
      reflection_prompts: Array.isArray(entry.reflection_prompts)
        ? entry.reflection_prompts.filter(
            (prompt): prompt is string =>
              typeof prompt === "string" && prompt.trim().length > 0,
          )
        : [],
      node_ids: Array.isArray(entry.node_ids) ? entry.node_ids : [],
      nodes: (Array.isArray(entry.node_ids) ? entry.node_ids : []).map(
        (nodeId) => ({
          id: nodeId,
          title: nodeTitleById.get(nodeId) || "Untitled activity",
        }),
      ),
    }));

  const maxAccessibleDay =
    enrollment.status === "explored"
      ? Number(enrollment.path?.total_days || enrollment.current_day)
      : Number(enrollment.current_day);
  const availableDayNumbers = allDayNumbers.filter((dayNumber) => dayNumber <= maxAccessibleDay);
  const navigableDayNumbers = availableDayNumbers.length > 0 ? availableDayNumbers : allDayNumbers;
  const fallbackDayNumber =
    availableDayNumbers.includes(Number(enrollment.current_day))
      ? Number(enrollment.current_day)
      : availableDayNumbers[availableDayNumbers.length - 1] || allDayNumbers[0] || Number(enrollment.current_day);
  const selectedDayNumber =
    Number.isFinite(requestedDayNumber) && navigableDayNumbers.includes(requestedDayNumber)
      ? requestedDayNumber
      : fallbackDayNumber;

  const { data: day } = await supabase
    .from("path_days")
    .select("*")
    .eq("path_id", enrollment.path.id)
    .eq("day_number", selectedDayNumber)
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
        pathDaySummaries={pathDaySummaries}
        availableDayNumbers={navigableDayNumbers}
        currentDayNumber={Number(enrollment.current_day)}
        reflections={reflections}
        exitReflection={exitReflection}
        endReflection={endReflection}
      />
    </div>
  );
}
