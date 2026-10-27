import { createServiceRoleClient } from "@/utils/supabase/server";
import { createClient as createHackathonClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

const LOOKUP_CHUNK = 200;

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

/** Participants that already have a hackathon_signup event, so re-running never duplicates. */
async function alreadySynced(client: ServiceClient, ids: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  for (let i = 0; i < ids.length; i += LOOKUP_CHUNK) {
    const { data, error } = await client
      .from("funnel_events")
      .select("user_id")
      .eq("event_name", "hackathon_signup")
      .in("user_id", ids.slice(i, i + LOOKUP_CHUNK));
    if (error) throw new Error(error.message);
    for (const row of (data ?? []) as { user_id: string | null }[]) {
      if (row.user_id) found.add(row.user_id);
    }
  }
  return found;
}

function weekStart(iso: string): string {
  const date = new Date(iso);
  const dayOfWeek = date.getDay();
  const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  return new Date(date.setDate(diff)).toISOString().split("T")[0];
}

async function syncHackathonToFunnel(_formData: FormData): Promise<void> {
  "use server";
  // Server actions are callable directly, so the page guard is not enough.
  await requireAdmin();

  const mainSupabase = createServiceRoleClient();
  const hackathonSupabase = createHackathonClient(
    process.env.HACKATHON_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: participants, error } = await hackathonSupabase
    .from("hackathon_participants")
    .select("id, track, university, grade_level, referral_source, created_at");

  if (error || !participants) {
    redirect("/admin/ceo/sync-hackathon-data?error=" + encodeURIComponent(error?.message || "Unknown error"));
  }

  let synced: Set<string>;
  try {
    synced = await alreadySynced(mainSupabase, participants.map((p) => p.id));
  } catch (lookupError) {
    const message = lookupError instanceof Error ? lookupError.message : "Could not check existing events";
    redirect("/admin/ceo/sync-hackathon-data?error=" + encodeURIComponent(message));
  }

  const fresh = participants.filter((p) => !synced.has(p.id));

  if (fresh.length > 0) {
    const { error: insertError } = await mainSupabase.from("funnel_events").insert(
      fresh.map((p) => ({
        user_id: p.id,
        event_name: "hackathon_signup",
        event_timestamp: p.created_at,
        metadata: {
          track: p.track,
          university: p.university,
          grade_level: p.grade_level,
          source: p.referral_source,
        },
      })),
    );
    if (insertError) {
      redirect("/admin/ceo/sync-hackathon-data?error=" + encodeURIComponent(insertError.message));
    }
  }

  // cohort_assignments is keyed by user_id, so existing rows are left alone.
  const { error: cohortError } = await mainSupabase.from("cohort_assignments").upsert(
    participants.map((p) => ({
      user_id: p.id,
      cohort_date: weekStart(p.created_at),
      acquisition_channel: "hackathon",
      signup_source: "hackathon_registration",
    })),
    { onConflict: "user_id", ignoreDuplicates: true },
  );

  redirect(
    `/admin/ceo/sync-hackathon-data?success=true&count=${fresh.length}&skipped=${participants.length - fresh.length}` +
      (cohortError ? "&cohortError=" + encodeURIComponent(cohortError.message) : ""),
  );
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function SyncResult({ params }: { params: Record<string, string | string[] | undefined> }) {
  const error = first(params.error);
  const cohortError = first(params.cohortError);
  if (error) {
    return (
      <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
        Sync failed: {error}
      </p>
    );
  }
  if (first(params.success) !== "true") return null;
  return (
    <div role="status" className="space-y-1 rounded-md border bg-muted/40 p-3 text-sm">
      <p>
        Added {Number(first(params.count) ?? 0).toLocaleString()} new signups. Skipped{" "}
        {Number(first(params.skipped) ?? 0).toLocaleString()} already synced.
      </p>
      {cohortError && <p className="text-muted-foreground">Cohort assignments failed: {cohortError}</p>}
    </div>
  );
}

export default async function SyncHackathonDataPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;

  return (
    <div className="max-w-2xl space-y-4">
      <AdminPageHeader
        eyebrow="CEO"
        title="Sync hackathon data"
        description="Copy hackathon registrations into the CEO dashboard funnel."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import participants</CardTitle>
          <CardDescription>
            Creates a hackathon signup event and a weekly cohort for each participant. Participants who were synced
            before are skipped, so running it again is safe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SyncResult params={params} />
          <form action={syncHackathonToFunnel}>
            <Button type="submit" className="min-h-11 w-full">
              Start sync
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
