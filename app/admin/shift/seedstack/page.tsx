import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminSeedstackBoard, type SeedstackBoardStudent } from "@/components/admin/AdminSeedstackBoard";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { seedstackConsentState, type SeedstackConsentRow } from "@/lib/seedstack/consent";
import { buildSeedstackBoard, type BoardEvent } from "@/lib/seedstack/board";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { adminMetadata } from "@/lib/admin/metadata";

export const dynamic = "force-dynamic";
export const metadata = adminMetadata("/admin/shift/seedstack");

type ConsentRow = SeedstackConsentRow & { user_id: string };
type AppRow = { user_id: string; nickname: string; cohort: string };
type ProfileRow = { id: string; username: string | null; full_name: string | null };

/** Reads with the service role, so it checks admin itself rather than trusting the layout. */
async function loadBoard(): Promise<SeedstackBoardStudent[]> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const [events, consents, apps] = await Promise.all([
    supabase
      .from("seedstack_events")
      .select("user_id, step, event, minutes, next, detail, live_url, created_at")
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase
      .from("seedstack_consents")
      .select("user_id, notice_version, student_consented_at, birth_date, parent_consented_at, parent_declined_at, withdrawn_at"),
    // Paid seats only: applicants now link an account before paying.
    supabase
      .from("shift_applications")
      .select("user_id, nickname, cohort")
      .not("user_id", "is", null)
      .not("paid_at", "is", null)
      .neq("status", "declined")
      .order("created_at", { ascending: true }),
  ]);
  // Fail before the profiles lookup, so a consent error is not hidden behind an empty board.
  const firstFailed = [events, consents, apps].find((r) => r.error);
  if (firstFailed?.error) throw new Error(`SeedStack board load failed: ${firstFailed.error.message}`);

  const consentRows = (consents.data ?? []) as ConsentRow[];
  const userIds = consentRows.map((c) => c.user_id);
  const profiles = userIds.length
    ? await supabase.from("profiles").select("id, username, full_name").in("id", userIds)
    : { data: [] as ProfileRow[], error: null };
  if (profiles.error) throw new Error(`SeedStack board load failed: ${profiles.error.message}`);

  const appByUser = new Map(((apps.data ?? []) as AppRow[]).map((a) => [a.user_id, a]));
  const profileById = new Map(((profiles.data ?? []) as ProfileRow[]).map((p) => [p.id, p]));
  const rows = new Map(
    buildSeedstackBoard((events.data ?? []) as BoardEvent[]).map((r) => [r.userId, r]),
  );

  return consentRows.map((c) => ({
    userId: c.user_id,
    // Linking no longer needs a SHIFT seat, so fall back to the profile name.
    nickname:
      appByUser.get(c.user_id)?.nickname ??
      profileById.get(c.user_id)?.full_name ??
      profileById.get(c.user_id)?.username ??
      null,
    cohort: appByUser.get(c.user_id)?.cohort ?? null,
    consent: seedstackConsentState(c),
    row: rows.get(c.user_id) ?? null,
  }));
}

export default async function AdminSeedstackPage() {
  // A load error throws to app/admin/error.tsx, which shows it with a retry.
  const students = await loadBoard();
  const now = Date.now();
  return (
    <div className="space-y-4">
      <ShiftAdminTabs />
      <AdminPageHeader
        eyebrow="SHIFT"
        title="SeedStack"
        description="Who finished install, scope and ship, without asking in Discord. Only students who agreed on /shift/seedstack send data. No cohort shown = linked without a SHIFT seat."
      />
      <AdminSeedstackBoard students={students} now={now} />
    </div>
  );
}
