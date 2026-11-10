import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminEmptyState, AdminErrorState } from "@/components/admin/shared/AdminStates";
import { ShiftVoiceFilters, type VoiceSelection } from "@/components/admin/shift-voice/ShiftVoiceFilters";
import { ShiftVoiceReport } from "@/components/admin/shift-voice/ShiftVoiceReport";
import { adminMetadata } from "@/lib/admin/metadata";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { buildVoiceReport, type VoiceReportRow } from "@/lib/shift/voiceSummary";
import {
  cohortDays,
  defaultVoiceDay,
  roundsInSession,
  trackedCohorts,
  voiceWindow,
  type VoiceWindowMode,
} from "@/lib/shift/voiceWindow";
import {
  ShiftVoiceNotSetUpError,
  listShiftVoiceSpans,
  loadShiftVoiceRoster,
} from "@/lib/supabase/shift-voice";

export const metadata = adminMetadata("/admin/shift/voice");
export const dynamic = "force-dynamic";

const MODES: VoiceWindowMode[] = ["session", "day", "round"];

function select(params: { round?: string; day?: string; window?: string }): VoiceSelection | null {
  const cohorts = trackedCohorts();
  if (cohorts.length === 0) return null;
  const live = roundsInSession();
  const cohort =
    cohorts.find((c) => String(c.round) === params.round) ??
    cohorts.find((c) => live.has(c.name)) ??
    cohorts[cohorts.length - 1];
  const day = params.day && cohortDays(cohort).includes(params.day) ? params.day : defaultVoiceDay(cohort);
  const mode = MODES.find((m) => m === params.window) ?? "session";
  return { cohort, day, mode };
}

type Loaded = { rows: VoiceReportRow[] } | { error: "not_set_up" | "failed" };

async function load(selection: VoiceSelection): Promise<Loaded> {
  const window = voiceWindow(selection.cohort, selection.day, selection.mode);
  try {
    const [roster, spans] = await Promise.all([
      loadShiftVoiceRoster(selection.cohort.name),
      listShiftVoiceSpans(selection.cohort.name, window),
    ]);
    return { rows: buildVoiceReport(roster, spans, window) };
  } catch (error) {
    if (error instanceof ShiftVoiceNotSetUpError) return { error: "not_set_up" };
    console.error("Failed to load SHIFT voice participation:", error);
    return { error: "failed" };
  }
}

export default async function AdminShiftVoicePage({
  searchParams,
}: {
  searchParams: Promise<{ round?: string; day?: string; window?: string }>;
}) {
  // The admin layout also checks, but this page reads minors' data with the service-role client.
  await requireAdmin();
  const selection = select(await searchParams);
  const loaded = selection ? await load(selection) : null;

  return (
    <div className="space-y-4">
      <ShiftAdminTabs />
      <AdminPageHeader
        eyebrow="SHIFT"
        title="Voice"
        description="Who was in the Discord voice channels, from the bot. Admins only: students are minors."
      />

      {!selection || !loaded ? (
        <AdminEmptyState title="No rounds with voice tracking yet" />
      ) : (
        <>
          <ShiftVoiceFilters cohorts={trackedCohorts()} selected={selection} />
          {"rows" in loaded ? (
            <ShiftVoiceReport rows={loaded.rows} />
          ) : loaded.error === "not_set_up" ? (
            <AdminErrorState
              title="Voice tracking is not set up"
              message="The shift_voice_spans table is missing. Apply migration 20261109160000_shift_voice_spans.sql, then start the bot (bot/README.md)."
            />
          ) : (
            <AdminErrorState
              title="Could not load voice participation"
              message="The voice data did not load. Reload the page to try again."
            />
          )}
        </>
      )}
    </div>
  );
}
