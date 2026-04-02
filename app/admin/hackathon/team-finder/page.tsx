import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import TeamFinderAdminPage from "@/components/admin/hackathon/TeamFinderAdminPage";

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

export default async function HackathonTeamFinderAdminPage() {
  await checkAdminAccess();

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Team Finder — Admin</h1>
        <p className="text-muted-foreground text-sm mt-1">
          ดูว่าใครกำลังหาทีม จำลองการจับกลุ่ม และยืนยันเพื่อสร้างทีมจริง
        </p>
      </div>
      <TeamFinderAdminPage />
    </div>
  );
}
