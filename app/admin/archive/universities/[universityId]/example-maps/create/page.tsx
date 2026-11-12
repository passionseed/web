import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { CreateExampleMapFlow } from "@/components/admin/CreateExampleMapFlow";
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

/** The flow renders its own full-screen title, so this page adds no header. */
export default async function CreateExampleMapPage({
  params,
}: {
  params: Promise<{ universityId: string }>;
}) {
  const user = await requireAdmin();
  const { universityId } = await params;
  const supabase = await createClient();
  const university = await getUniversity(supabase, universityId);

  // Only the id is used; the full auth user stays on the server.
  return <CreateExampleMapFlow university={university} user={{ id: user.id }} />;
}
