import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { UniversityExampleJourneyCanvas } from "@/components/admin/UniversityExampleJourneyCanvas";

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
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/login");
  }

  // Get user profile (simplified check - in real app would check admin role)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect("/me");
  }

  const university = await getUniversity(supabase, resolvedParams.universityId);

  return (
    <UniversityExampleJourneyCanvas 
      university={university}
      user={user}
    />
  );
}