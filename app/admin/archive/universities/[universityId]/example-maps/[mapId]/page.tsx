import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { EditExampleMapFlow } from "@/components/admin/EditExampleMapFlow";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

async function getUniversity(supabase: ServerClient, universityId: string) {
  const { data: university, error } = await supabase
    .from("universities")
    .select("*")
    .eq("id", universityId)
    .single();

  if (error || !university) {
    redirect("/admin/archive/universities");
  }

  return university;
}

async function getExampleMap(supabase: ServerClient, mapId: string) {
  const { data: exampleMap, error } = await supabase
    .from("university_example_maps")
    .select("*")
    .eq("id", mapId)
    .single();

  if (error || !exampleMap) {
    return null;
  }

  return exampleMap;
}

/** The flow renders its own full-screen title, so this page adds no header. */
export default async function EditExampleMapPage({
  params,
}: {
  params: Promise<{ universityId: string; mapId: string }>;
}) {
  const user = await requireAdmin();
  const { universityId, mapId } = await params;
  const supabase = await createClient();
  const [university, exampleMap] = await Promise.all([
    getUniversity(supabase, universityId),
    getExampleMap(supabase, mapId),
  ]);

  if (!exampleMap) {
    redirect("/admin/archive/universities");
  }

  // Only the id is used; the full auth user stays on the server.
  return <EditExampleMapFlow university={university} exampleMap={exampleMap} user={{ id: user.id }} />;
}
