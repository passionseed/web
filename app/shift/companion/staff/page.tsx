import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ShiftCompanionStaff } from "@/components/shift/companion/ShiftCompanionStaff";
import type { CompanionCohorts } from "@/lib/shift/companion-contract";

export const dynamic = "force-dynamic";
export const metadata = { title: "SHIFT Companion staff", robots: { index: false, follow: false } };

export default async function CompanionStaffPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fshift%2Fcompanion%2Fstaff");
  const { data, error } = await supabase.rpc("shift_companion_action", {
    p_action: "staff_cohorts", p_payload: {},
  });
  if (error || !data?.ok) {
    return <main className="mx-auto max-w-xl px-5 py-16"><h1 className="text-xl font-semibold">SHIFT Companion</h1><p className="mt-4" role="alert">Could not load your cohorts. Please try again.</p></main>;
  }
  const initial = data as CompanionCohorts;
  if (!initial.is_admin && initial.cohorts.length === 0) {
    return <main className="mx-auto max-w-xl px-5 py-16"><h1 className="text-xl font-semibold">Staff access required</h1><p className="mt-4">Sign in with an admin account or ask an admin to add you as a cohort mentor.</p></main>;
  }
  return <ShiftCompanionStaff initial={initial} />;
}
