import { HomePage } from "@/components/home/HomePage";
import { isAnonymousUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { redirect, unstable_rethrow } from "next/navigation";
import { unstable_cache } from "next/cache";
import {
  isProfileComplete,
  PROFILE_COMPLETION_SELECT,
} from "@/lib/profile-completion";

export const dynamic = "force-dynamic";

/**
 * The real "น้องๆ ที่เราได้ดูแล" figure for the landing testimonials: every
 * profile, one per registered user including anonymous trial accounts. The
 * service role is required because profiles RLS reads for authenticated
 * users only, while the landing page is public. Only the count ever leaves
 * the server.
 *
 * Cached for an hour so the public page does not hit the database on every
 * visit. Failures throw instead of returning null: unstable_cache stores
 * whatever returns, and a cached null would pin the section to its fallback
 * copy for the whole hour. A throw is not cached, so the next visit retries.
 */
const getStudentCount = unstable_cache(
  async (): Promise<number> => {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });
    if (error) throw new Error(`profiles count failed: ${error.message}`);
    return count ?? 0;
  },
  ["student-count"],
  { revalidate: 3600 }
);

export default async function Home() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isAnonymous = isAnonymousUser(user);

    if (user && isAnonymous) {
      const { data: anonProfile } = await supabase
        .from("profiles")
        .select("is_onboarded")
        .eq("id", user.id)
        .maybeSingle();

      if (anonProfile?.is_onboarded) {
        redirect("/me");
      }

      redirect("/onboard");
    }

    if (user && !isAnonymous) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(`${PROFILE_COMPLETION_SELECT}, is_onboarded`)
        .eq("id", user.id)
        .single();
      const { data: guardianConsent } = await supabase
        .from("profile_guardian_consents")
        .select("guardian_phone, guardian_relationship, consent_confirmed_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (
        profileError ||
        !isProfileComplete(profileData, guardianConsent) ||
        !profileData.is_onboarded
      ) {
        redirect("/onboard");
      }

      redirect("/me");
    }
  } catch (error) {
    // redirect() throws a framework control-flow error. Preserve it instead of
    // treating a successful auth redirect as a failed Supabase request.
    unstable_rethrow(error);
    // Supabase unreachable or auth error — show landing page
  }

  const studentCount = await getStudentCount().catch(() => null);

  return <HomePage studentCount={studentCount} />;
}
