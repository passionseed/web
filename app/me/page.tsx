import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { UserPortal } from "@/components/user-portal";
import { MainNav } from "@/components/main-nav";
import { LavaFooter } from "@/components/lava-footer";
import { UserNav } from "@/components/user-nav";
import { createClient } from "@/utils/supabase/server";

export default async function PortalPage() {
  const cookieStore = await cookies();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <UserPortal userId={user.id} />
      </main>
    </div>
  );
}
