import { Suspense } from "react";

import { KpiRowSkeleton } from "@/components/admin/overview/KpiRow";
import { OverviewRefreshButton } from "@/components/admin/overview/OverviewRefreshButton";
import { OverviewSummarySkeleton } from "@/components/admin/overview/OverviewSummary";
import { formatBangkokLongDate } from "@/components/admin/overview/format";
import {
  ActivitySection,
  AttentionSection,
  KpiSection,
  ShiftSection,
  SummarySection,
} from "@/components/admin/overview/sections";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminLoading } from "@/components/admin/shared/AdminStates";
import { ScrollToHash } from "@/components/admin/shared/ScrollToHash";
import type { AdminQueueSnapshot, AdminShiftSnapshot } from "@/lib/admin/console";
import { adminMetadata } from "@/lib/admin/metadata";
import {
  getAdminActivity,
  getAdminKpis,
  getAdminQueueSnapshot,
  getAdminShiftSnapshot,
} from "@/lib/admin/overview";
import { requireAdmin } from "@/lib/admin/requireAdmin";

import "./overview.css";

export const dynamic = "force-dynamic";
export const metadata = adminMetadata("/admin");

const ACTIVITY_LIMIT = 25;

/** Loaders resolve by contract; this keeps a surprise rejection from blanking a section. */
function settle<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return promise.catch((error: unknown) => {
    console.error("[admin overview] loader failed", error);
    return fallback;
  });
}

/**
 * Mission control: what needs the team now, the numbers that matter, the
 * live SHIFT round, and what just happened. Each section streams on its own.
 */
export default async function AdminOverviewPage() {
  // The layout's check can be skipped by a forged router-state header, so
  // the page checks too before any service-role loader starts.
  await requireAdmin();

  const now = new Date();
  const queues = settle<AdminQueueSnapshot | null>(getAdminQueueSnapshot(), null);
  const kpis = settle(getAdminKpis(), []);
  const shift = settle<AdminShiftSnapshot | null>(getAdminShiftSnapshot(), null);
  const activity = settle(getAdminActivity(ACTIVITY_LIMIT), []);

  return (
    <div className="admin-overview overview">
      <AdminPageHeader
        eyebrow={formatBangkokLongDate(now)}
        title="Overview"
        description={
          <Suspense fallback={<OverviewSummarySkeleton />}>
            <SummarySection queues={queues} shift={shift} now={now} />
          </Suspense>
        }
        actions={<OverviewRefreshButton />}
      />

      <section className="overview-kpis" aria-labelledby="overview-kpis-title">
        <h2 id="overview-kpis-title" className="sr-only">
          Key numbers
        </h2>
        <Suspense fallback={<KpiRowSkeleton />}>
          <KpiSection kpis={kpis} />
        </Suspense>
      </section>

      <div className="overview-columns">
        <section
          id="attention"
          className="overview-section overview-area-attention"
          aria-labelledby="overview-attention-title"
        >
          <div className="admin-section-heading">
            <h2 id="overview-attention-title">Needs attention</h2>
            <span>Most urgent first</span>
          </div>
          <Suspense
            fallback={<AdminLoading rows={3} rowClassName="h-20" label="Loading work queues" />}
          >
            <AttentionSection queues={queues} />
          </Suspense>
        </section>
        {/* The topbar "Needs you" link lands here after the loading skeleton. */}
        <ScrollToHash id="attention" />

        <section
          className="overview-section overview-area-shift"
          aria-labelledby="overview-shift-title"
        >
          <div className="admin-section-heading">
            <h2 id="overview-shift-title">SHIFT</h2>
            <span>Current round</span>
          </div>
          <Suspense
            fallback={<AdminLoading rows={4} rowClassName="h-16" label="Loading SHIFT numbers" />}
          >
            <ShiftSection shift={shift} now={now} />
          </Suspense>
        </section>

        <section
          className="overview-section overview-area-activity"
          aria-labelledby="overview-activity-title"
        >
          <div className="admin-section-heading">
            <h2 id="overview-activity-title">Recent activity</h2>
            <span>Bangkok time</span>
          </div>
          <Suspense
            fallback={<AdminLoading rows={5} rowClassName="h-12" label="Loading recent activity" />}
          >
            <ActivitySection activity={activity} now={now} />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
