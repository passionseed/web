import { redirect } from "next/navigation";
import { Suspense } from "react";
import { JourneyPageClientWrapper } from "./journey-page-client";
import { createClient } from "@/utils/supabase/server";

function JourneyPageLoading() {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-400/30 border-t-blue-400" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">
            Loading your journey
          </h2>
          <p className="text-slate-400 text-sm">
            Initializing your interactive learning map...
          </p>
        </div>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function JourneyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const userAvatar = user?.user_metadata?.avatar_url;

  return (
    <Suspense fallback={<JourneyPageLoading />}>
      <JourneyPageClientWrapper
        userId={user?.id || ""}
        userName={userName}
        userAvatar={userAvatar}
      />
    </Suspense>
  );
}
