import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { UserPortal } from "@/components/user-portal";
import { MainNav } from "@/components/main-nav";
import { LavaFooter } from "@/components/lava-footer";
import { UserNav } from "@/components/user-nav";
import { createClient } from "@/utils/supabase/client";

export default async function PortalPage() {
  const cookieStore = await cookies();
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <MainNav />
          <div className="ml-auto flex items-center space-x-4">
            <UserNav user={session.user} />
          </div>
        </div>
      </header>
      <main className="flex-1">
        <UserPortal userId={session.user.id} />
      </main>
      <LavaFooter />
    </div>
  );
}
