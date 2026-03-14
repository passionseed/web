import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ExpertQueueClient } from "./ExpertQueueClient";

async function checkAdminAccess() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) redirect("/login");

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");

  if (!roles?.length) redirect("/me");

  return user;
}

export const dynamic = "force-dynamic";

export default async function AdminExpertsPage() {
  await checkAdminAccess();

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Expert Submissions</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review and approve expert career interviews to generate PathLabs.
        </p>
      </div>
      <ExpertQueueClient />
    </div>
  );
}
