import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { getPSAccess } from "@/actions/ps";
import { Button } from "@/components/ui/button";
import { Phase1Workbench } from "@/components/ps/b2b/Phase1Workbench";

export const dynamic = "force-dynamic";

export default async function PSB2BPage() {
  const access = await getPSAccess();

  if (!access.isAuthenticated || !access.isAuthorized) {
    return (
      <div className="container mx-auto py-12">
        <div className="max-w-2xl mx-auto rounded-lg border border-white/10 bg-[#0b1220]/60 p-8 text-center">
          <h1 className="text-2xl font-bold text-white">Build Access Required</h1>
          <p className="mt-3 text-white/70">This area is limited to Passion Seed team members.</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            {!access.isAuthenticated && (
              <Button asChild variant="secondary">
                <Link href="/login">Sign In</Link>
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
    <div className="container mx-auto space-y-6 py-8">
      <div className="mb-2">
        <Link
          href="/build"
          className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Build
        </Link>
      </div>

      <div className="rounded-lg border border-white/10 bg-gradient-to-r from-emerald-950/30 to-sky-950/30 p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-emerald-500/20 p-2">
            <Building2 className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">PassionSeed B2B Phase 1</h1>
            <p className="text-sm text-muted-foreground">
              Discovery, scoring, outreach drafts, and manual CRM feedback learning in one workflow.
            </p>
          </div>
        </div>
      </div>

      <Phase1Workbench />
    </div>
  );
}
