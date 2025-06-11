import { redirect } from "next/navigation";
import { UserPortal } from "@/components/user-portal";
import { createClient } from "@/utils/supabase/server";

export default async function PortalPage() {
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
        <UserPortal userId={user!.id} />
      </main>
    </div>
  );
}
