import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { EditExampleMapFlow } from "@/components/admin/EditExampleMapFlow";
import { checkAdminAccess } from "@/utils/admin";

async function getUniversity(supabase: any, universityId: string) {
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

async function getExampleMap(supabase: any, mapId: string) {
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

export default async function EditExampleMapPage({
  params,
}: {
  params: Promise<{ universityId: string; mapId: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await params;
  
  const user = await checkAdminAccess(supabase);

  const university = await getUniversity(supabase, resolvedParams.universityId);
  const exampleMap = await getExampleMap(supabase, resolvedParams.mapId);

  if (!exampleMap) {
    redirect(`/admin/archive/universities/${resolvedParams.universityId}`);
  }

  return (
    <EditExampleMapFlow 
      university={university}
      exampleMap={exampleMap}
      user={user}
    />
  );
}
