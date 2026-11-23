import type { Metadata } from "next";

import { AutoRefresh } from "@/components/admin/hackathon/elemental/AutoRefresh";
import { CopyLineButton } from "@/components/admin/hackathon/elemental/CopyLineButton";
import { PipelineSection, type PipelineState } from "@/components/admin/hackathon/elemental/PipelineSection";
import { SeatsSection } from "@/components/admin/hackathon/elemental/SeatsSection";
import { TasksSection, type TasksState } from "@/components/admin/hackathon/elemental/TasksSection";
import { TodayStrip } from "@/components/admin/hackathon/elemental/TodayStrip";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { bangkokDate, shortDate } from "@/lib/hackathon/elemental/bangkok-date";
import { aggregateTasks, linearTeamUrl, parseOwnerNames } from "@/lib/hackathon/elemental/linear-progress";
import { LINEAR_TEAM_KEY, loadHackathonIssues } from "@/lib/hackathon/elemental/linear-fetch";
import { isNextStepOverdue, pipelineProgress } from "@/lib/hackathon/elemental/pipeline";
import {
  paceLine,
  seatPace,
  summarizeRegistrations,
  type RegistrationTotalsRow,
} from "@/lib/hackathon/elemental/seats";
import { dailySummary } from "@/lib/hackathon/elemental/summary";
import { ELEMENTAL_TARGETS } from "@/lib/hackathon/elemental/targets";
import { buildTodayRows } from "@/lib/hackathon/elemental/today";
import { listRegistrationTotals } from "@/lib/supabase/hackathon-event-registrations";
import {
  listPipeline,
  PIPELINE_MIGRATION,
  PipelineNotSetUpError,
} from "@/lib/supabase/hackathon-pipeline";

// Reads Supabase and Linear on every request, never at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Elemental progress" };

async function loadSeatRows(): Promise<RegistrationTotalsRow[] | null> {
  try {
    return await listRegistrationTotals(ELEMENTAL.slug);
  } catch (error) {
    console.error("[admin/hackathon/elemental] sign-ups failed to load", error);
    return null;
  }
}

async function loadTasks(today: string): Promise<TasksState> {
  const result = await loadHackathonIssues();
  if (!result.ok) return result;
  return {
    ok: true,
    progress: aggregateTasks(result.issues, today, parseOwnerNames(process.env.HACKATHON_OWNER_NAMES)),
    teamUrl: linearTeamUrl(result.issues[0]?.url, LINEAR_TEAM_KEY),
  };
}

async function loadPipelineState(): Promise<PipelineState> {
  try {
    return { status: "ok", items: await listPipeline(ELEMENTAL.slug) };
  } catch (error) {
    if (error instanceof PipelineNotSetUpError) return { status: "not_set_up", migration: PIPELINE_MIGRATION };
    console.error("[admin/hackathon/elemental] pipeline failed to load", error);
    return { status: "failed" };
  }
}

export default async function AdminHackathonElementalPage() {
  await requireAdmin();
  const now = new Date();
  const today = bangkokDate(now);
  const [seatRows, tasks, pipeline] = await Promise.all([loadSeatRows(), loadTasks(today), loadPipelineState()]);

  const totals = seatRows ? summarizeRegistrations(seatRows, now) : null;
  const pace = totals ? seatPace(totals.paidSeats, today) : null;
  const line = seatRows && totals ? paceLine(seatRows, totals.paidSeats, now) : null;
  const items = pipeline.status === "ok" ? pipeline.items : null;
  const progress = items ? pipelineProgress(items) : null;
  const { start, end } = ELEMENTAL_TARGETS.event;

  const todayRows = buildTodayRows({
    today,
    slipsToCheck: totals?.slipsToCheck ?? null,
    items,
    tasks: tasks.ok ? tasks.progress.todayAndOverdue : null,
    elementsMissing: progress?.elementsMissing ?? null,
  });

  const summary = dailySummary({
    today,
    seats:
      totals && line
        ? { paid: totals.paidSeats, target: ELEMENTAL_TARGETS.seats.target, paidToday: line.paidToday, need: line.toNext }
        : null,
    money: progress
      ? {
          cashSigned: progress.cashSigned,
          prizePool: progress.prizePool,
          sponsorsSigned: progress.sponsorsSigned,
          sponsorsTalking: progress.sponsorsTalking,
        }
      : null,
    voices: progress
      ? { covered: progress.elementsCovered.length, target: progress.voicesTarget, missing: progress.elementsMissing }
      : null,
    overdue: {
      tasks: tasks.ok ? tasks.progress.todayAndOverdue.filter((t) => t.overdue).length : null,
      followUps: items ? items.filter((i) => isNextStepOverdue(i, today)).length : null,
    },
  });

  return (
    <div className="min-w-0 space-y-4">
      <AutoRefresh />
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-lg font-medium tracking-tight">
            {ELEMENTAL.series}: {ELEMENTAL.edition}
          </h2>
          <p className="text-sm tabular-nums text-muted-foreground">
            {shortDate(start)} to {shortDate(end)} · today {shortDate(today)}, Bangkok
          </p>
        </div>
        <CopyLineButton line={summary} />
      </div>
      <TodayStrip rows={todayRows} today={today} partial={!seatRows || !tasks.ok || !items} />
      <SeatsSection totals={totals} pace={pace} line={line} today={today} />
      <TasksSection state={tasks} today={today} />
      <PipelineSection state={pipeline} today={today} loadedAt={now.toISOString()} />
    </div>
  );
}
