import { redirect } from "next/navigation";
import { UserPortal } from "@/components/user-portal";
import { createClient } from "@/utils/supabase/server";
import { getUserDashboardData } from "@/lib/supabase/reflection";

export default async function PortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log(user, "pottal");

  if (!user) {
    redirect("/login");
  }

  const dashboardData = await getUserDashboardData(supabase);

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <UserPortal dashboardData={dashboardData} />
      </main>
    </div>
  );
}
