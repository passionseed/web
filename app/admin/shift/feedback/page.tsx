import Link from "next/link";

import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
import { ShiftFeedbackResponses } from "@/components/admin/shift-feedback/ShiftFeedbackResponses";
import { ShiftFeedbackSummary } from "@/components/admin/shift-feedback/ShiftFeedbackSummary";
import { SHIFT_COHORTS, getShiftCohort } from "@/lib/content/shift-cohort";
import { summarizeFeedback } from "@/lib/shift/feedbackSummary";
import { listShiftFeedback, type ShiftFeedbackRow } from "@/lib/supabase/shift-feedback";
import { cn } from "@/lib/utils";

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
          className={cn(
            "rounded-md border px-3 py-1 text-sm",
            link.round === selected ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
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
  const { round } = await searchParams;
  const cohort = round ? getShiftCohort(Number(round)) : undefined;
  const rows = await loadRows(cohort?.name);

  return (
    <div className="space-y-4">
      <ShiftAdminTabs />
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">SHIFT Feedback</h2>
        <p className="text-sm text-muted-foreground">
          End-of-round answers from /shift/feedback. Students are minors: quote only as each card allows.
        </p>
      </div>
      <RoundFilter selected={cohort?.round} />

      {rows === null ? (
        <p role="alert" className="text-sm text-muted-foreground">Failed to load feedback.</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No responses yet{cohort ? ` from ${cohort.name}` : ""}.</p>
      ) : (
        <>
          <ShiftFeedbackSummary summary={summarizeFeedback(rows)} />
          <h3 className="pt-4 text-base font-semibold">Responses</h3>
          <ShiftFeedbackResponses rows={rows} />
        </>
      )}
    </div>
  );
}
