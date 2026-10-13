import type { Metadata } from "next";

import { CurriculumEditor } from "@/components/shift/CurriculumEditor";
import { REFUND_HOW, REFUND_STEPS } from "@/lib/content/shift-refund";
import {
  parseCurriculumDoc,
  SHIFT2_DEFAULT_DOC,
  type CurriculumDoc,
} from "@/lib/content/shift2-curriculum";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

/**
 * SHIFT[2] curriculum for mentors: rules, how to interview, refund steps, and
 * the 7 days, on one page. Admins can edit and save. Internal: not indexed,
 * not linked from the site. Contains no student data.
 */

export const metadata: Metadata = {
  title: "SHIFT[2] Curriculum",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const ROUND = "2";

async function loadDoc(): Promise<{ doc: CurriculumDoc; updatedAt: string | null }> {
  try {
    const { data } = await createAdminClient()
      .from("shift_curriculum")
      .select("content, updated_at")
      .eq("round", ROUND)
      .maybeSingle();
    const doc = parseCurriculumDoc(data?.content);
    if (doc) return { doc, updatedAt: data?.updated_at ?? null };
  } catch {
    // No table or no env: fall back to the defaults in code.
  }
  return { doc: SHIFT2_DEFAULT_DOC, updatedAt: null };
}

async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .limit(1);
    return !!data?.length;
  } catch {
    return false;
  }
}

export default async function Shift2CurriculumPage() {
  const [{ doc, updatedAt }, canEdit] = await Promise.all([loadDoc(), isAdmin()]);
  return (
    <CurriculumEditor
      round={ROUND}
      initial={doc}
      updatedAt={updatedAt}
      canEdit={canEdit}
      refundSteps={[...REFUND_STEPS]}
      refundHow={REFUND_HOW}
    />
  );
}
