import { redirect } from "next/navigation";
import { Suspense } from "react";
import { UserPortal } from "@/components/user-portal";
import { createClient } from "@/utils/supabase/server";
import { getUserDashboardData } from "@/lib/supabase/reflection";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dashboardData = await getUserDashboardData(supabase, user);

  const userName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const userAvatar = user.user_metadata?.avatar_url;

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <div className="container mx-auto px-4 md:px-6 py-6 md:py-10 max-w-7xl">
          {/* User Portal Content */}
          <UserPortal dashboardData={dashboardData} />
        </div>
      </main>
    </div>
  );
}
