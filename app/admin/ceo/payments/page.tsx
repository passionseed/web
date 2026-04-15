import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ManualPaymentTracker } from "@/components/admin/ceo/ManualPaymentTracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getNorthStarMetrics } from "@/lib/supabase/ceo-dashboard";

async function checkAdminAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect("/login");
  
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["admin", "team"]);
    
  if (!roles || roles.length === 0) redirect("/me");
  
  return user;
}

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  await checkAdminAccess();
  const metrics = await getNorthStarMetrics();

  return (
    <div className="min-h-screen relative overflow-hidden dusk-gradient">
      <div className="dusk-atmosphere" />
      
      <div className="relative z-10 container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white font-kodchasan tracking-tight mb-2">
            Payment Tracking
          </h1>
          <p className="text-slate-400">
            Manual entry for family round and camp payments
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ManualPaymentTracker />
          
          <div className="space-y-6">
            <Card className="ei-card">
              <CardHeader>
                <CardTitle className="text-white">Current MRR</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-white">
                  ฿{metrics.mrr.toLocaleString()}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Based on recorded payments
                </p>
              </CardContent>
            </Card>

            <Card className="ei-card">
              <CardHeader>
                <CardTitle className="text-white">Integration Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Stripe</span>
                  <span className="text-amber-400 text-sm">Not connected</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">OMISE (Thailand)</span>
                  <span className="text-amber-400 text-sm">Not connected</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Manual Entry</span>
                  <span className="text-emerald-400 text-sm">Active</span>
                </div>
                <p className="text-xs text-slate-500 mt-4">
                  Manual payment tracking is active. Connect Stripe or OMISE for automated tracking.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
