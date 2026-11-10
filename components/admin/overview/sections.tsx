import "server-only";

import { SeedAdminLiveCounts } from "@/components/admin/console/live-counts";
import type {
  AdminActivityItem,
  AdminKpi,
  AdminQueueSnapshot,
  AdminShiftSnapshot,
} from "@/lib/admin/console";

import { ActivityFeed } from "./ActivityFeed";
import { AttentionList } from "./AttentionList";
import { bangkokDayKey } from "./format";
import { KpiRow } from "./KpiRow";
import { OverviewSummary } from "./OverviewSummary";
import { ShiftPanel } from "./ShiftPanel";
import { shiftHeadline } from "./shift";

/*
 * Async section bodies for the overview. The page starts every loader once,
 * in parallel, and hands each section its promise; each section awaits inside
 * its own Suspense boundary, so the page streams with no waterfall and no
 * loader runs twice.
 */

export async function SummarySection({
  queues,
  shift,
  now,
}: {
  queues: Promise<AdminQueueSnapshot | null>;
  shift: Promise<AdminShiftSnapshot | null>;
  now: Date;
}) {
  const [snapshot, shiftSnapshot] = await Promise.all([queues, shift]);
  return (
    <OverviewSummary
      initial={snapshot}
      shiftLine={shiftHeadline(shiftSnapshot, bangkokDayKey(now) ?? "")}
    />
  );
}

export async function KpiSection({ kpis }: { kpis: Promise<AdminKpi[]> }) {
  return (
    <div className="overview-arrive">
      <KpiRow kpis={await kpis} />
    </div>
  );
}

export async function AttentionSection({
  queues,
}: {
  queues: Promise<AdminQueueSnapshot | null>;
}) {
  const snapshot = await queues;
  return (
    <div className="overview-arrive">
      {snapshot && <SeedAdminLiveCounts snapshot={snapshot} />}
      <AttentionList initial={snapshot} />
    </div>
  );
}

export async function ShiftSection({
  shift,
  now,
}: {
  shift: Promise<AdminShiftSnapshot | null>;
  now: Date;
}) {
  const snapshot = await shift;
  return (
    <div className="overview-arrive">
      <ShiftPanel snapshot={snapshot} today={bangkokDayKey(now) ?? ""} />
    </div>
  );
}

export async function ActivitySection({
  activity,
  now,
}: {
  activity: Promise<AdminActivityItem[]>;
  now: Date;
}) {
  return (
    <div className="overview-arrive">
      <ActivityFeed items={await activity} now={now} />
    </div>
  );
}
