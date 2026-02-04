import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { CreateExampleMapFlow } from "@/components/admin/CreateExampleMapFlow";
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

export default async function CreateExampleMapPage({
  params,
}: {
  params: Promise<{ universityId: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await params;
  
  const user = await checkAdminAccess(supabase);

  const university = await getUniversity(supabase, resolvedParams.universityId);

  return (
    <CreateExampleMapFlow 
      university={university}
      user={user}
    />
  );
}
