import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { requireCCResearchAccess } from "@/lib/cc-research/auth";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CcResearchLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const access = await requireCCResearchAccess();

  if (!access.authorized) {
    return (
      <div className="container mx-auto py-12">
        <div className="max-w-2xl mx-auto rounded-lg border border-white/10 bg-[#070f1b]/70 p-8 text-center">
          <div className="inline-flex items-center rounded-md bg-indigo-500/20 p-3">
            <GraduationCap className="h-5 w-5 text-indigo-300" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">CC Research is team-only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This workflow is isolated from the B2B workbench and requires Passion Seed team access.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            {access.status === 401 && (
              <Button asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/build">Back to Build</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="border-b border-white/10 bg-black/30">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-5 w-5 text-indigo-300" />
            <div>
              <h1 className="text-lg font-semibold">Community College Research</h1>
              <p className="text-xs text-muted-foreground">Independent CC project namespace</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/cc-research/campaigns">Campaigns</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/build">
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
              </Link>
            </Button>
          </div>
        </div>
      </div>
      <main>{children}</main>
    </div>
  );
}
