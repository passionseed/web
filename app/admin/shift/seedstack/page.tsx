import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
import { AdminSeedstackBoard, type SeedstackBoardStudent } from "@/components/admin/AdminSeedstackBoard";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { seedstackConsentState, type SeedstackConsentRow } from "@/lib/seedstack/consent";
import { buildSeedstackBoard, type BoardEvent } from "@/lib/seedstack/board";
import { createServiceRoleClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type ConsentRow = SeedstackConsentRow & { user_id: string };
type AppRow = { user_id: string; nickname: string; cohort: string };

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
      .select("user_id, notice_version, student_consented_at, withdrawn_at"),
    supabase.from("shift_applications").select("user_id, nickname, cohort").not("user_id", "is", null),
  ]);
  const failed = [events, consents, apps].find((r) => r.error);
  if (failed?.error) throw new Error(`seedstack board load failed: ${failed.error.message}`);

  const appByUser = new Map((apps.data as AppRow[]).map((a) => [a.user_id, a]));
  const rows = new Map(buildSeedstackBoard(events.data as BoardEvent[]).map((r) => [r.userId, r]));

  return (consents.data as ConsentRow[]).map((c) => ({
    userId: c.user_id,
    nickname: appByUser.get(c.user_id)?.nickname ?? "admin / test",
    cohort: appByUser.get(c.user_id)?.cohort ?? null,
    consent: seedstackConsentState(c),
    row: rows.get(c.user_id) ?? null,
  }));
}

export default async function AdminSeedstackPage() {
  const students = await loadBoard();
  return (
    <div className="space-y-4">
      <ShiftAdminTabs />
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">SeedStack</h2>
        <p className="text-sm text-muted-foreground">
          Who finished install, scope and ship, without asking in Discord. Only students who agreed on /shift/seedstack send data.
        </p>
      </div>
      <AdminSeedstackBoard students={students} />
    </div>
  );
}
