import Link from "next/link";

import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminEmptyState, AdminErrorState } from "@/components/admin/shared/AdminStates";
import { ShiftFeedbackResponses } from "@/components/admin/shift-feedback/ShiftFeedbackResponses";
import { ShiftFeedbackSummary } from "@/components/admin/shift-feedback/ShiftFeedbackSummary";
import { weekdayKey } from "@/lib/content/shift-alumni";
import { SHIFT_COHORTS, getShiftCohort } from "@/lib/content/shift-cohort";
import { summarizeFeedback } from "@/lib/shift/feedbackSummary";
import { loadAlumniCalendar } from "@/lib/supabase/shift-alumni-calendar";
import { listShiftFeedback, type ShiftFeedbackRow } from "@/lib/supabase/shift-feedback";
import { cn } from "@/lib/utils";
import { adminMetadata } from "@/lib/admin/metadata";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const metadata = adminMetadata("/admin/shift/feedback");
export const dynamic = "force-dynamic";

/** `?round=1` keeps one round; no round shows every response. */
function RoundFilter({ selected }: { selected?: number }) {
  const links = [{ href: "/admin/shift/feedback", label: "All rounds", round: undefined as number | undefined }].concat(
    SHIFT_COHORTS.map((c) => ({ href: `/admin/shift/feedback?round=${c.round}`, label: c.name, round: c.round })),
  );
  return (
    <nav className="flex flex-wrap gap-1.5" aria-label="Round">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={link.round === selected ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center rounded-md border px-3 text-sm transition-colors",
            link.round === selected
              ? "border-primary bg-primary/10 font-medium text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

async function loadRows(cohortName?: string): Promise<ShiftFeedbackRow[] | null> {
  try {
    return await listShiftFeedback(cohortName);
  } catch (error) {
    console.error("Failed to load SHIFT feedback:", error);
    return null;
  }
}

export default async function AdminShiftFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>;
}) {
  // The admin layout also checks, but this page reads with the service-role client.
  await requireAdmin();
  const { round } = await searchParams;
  const cohort = round ? getShiftCohort(Number(round)) : undefined;
  const [rows, { doc: calendar }] = await Promise.all([loadRows(cohort?.name), loadAlumniCalendar()]);

  return (
    <div className="space-y-4">
      <ShiftAdminTabs />
      <AdminPageHeader
        eyebrow="SHIFT"
        title="Feedback"
        description="End-of-round answers from /shift/feedback. Students are minors: quote only as each card allows."
      />
      <RoundFilter selected={cohort?.round} />

      {rows === null ? (
        <AdminErrorState
          title="Could not load feedback"
          message="The feedback responses did not load. Reload the page to try again."
        />
      ) : rows.length === 0 ? (
        <AdminEmptyState
          title={`No responses yet${cohort ? ` from ${cohort.name}` : ""}`}
          description="Answers appear here as students send the end-of-round form."
        />
      ) : (
        <>
          <ShiftFeedbackSummary
            summary={summarizeFeedback(rows)}
            sessionDay={weekdayKey(calendar.defaults.firstDate)}
          />
          <h3 className="pt-4 text-base font-semibold">Responses</h3>
          <ShiftFeedbackResponses rows={rows} />
        </>
      )}
    </div>
  );
}
