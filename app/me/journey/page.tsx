import { redirect } from "next/navigation";
import { Suspense } from "react";
import { JourneyMapCanvas } from "@/components/journey";
import { createClient } from "@/utils/supabase/server";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

function JourneyPageLoading() {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <Loader2 className="w-16 h-16 animate-spin text-blue-400" />
          <div className="absolute inset-0 animate-pulse">
            <div className="w-16 h-16 rounded-full bg-blue-400/20" />
          </div>
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

export default async function JourneyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const userAvatar = user.user_metadata?.avatar_url;

  return (
    <div className="flex h-screen flex-col bg-slate-950">
      {/* Header with breadcrumb and back button */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm px-4 md:px-6 py-3 md:py-4 sticky top-0 z-20">
        <div className="container mx-auto max-w-7xl flex items-center justify-between gap-4">
          {/* Back button */}
          <Link href="/me">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>

          {/* Breadcrumb */}
          <Breadcrumb className="hidden md:flex">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/me" className="hover:text-foreground">
                    Dashboard
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold">
                  Journey Map
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Spacer for layout */}
          <div className="flex-1" />

          {/* Title for mobile */}
          <h1 className="md:hidden text-lg font-bold text-white">
            Journey Map
          </h1>
        </div>
      </header>

      {/* Main content - full screen journey map */}
      <main className="flex-1 overflow-hidden">
        <Suspense fallback={<JourneyPageLoading />}>
          <JourneyMapCanvas
            userId={user.id}
            userName={userName}
            userAvatar={userAvatar}
          />
        </Suspense>
      </main>
    </div>
  );
}
