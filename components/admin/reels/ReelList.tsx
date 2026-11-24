"use client";

import Link from "next/link";

import { ELEMENT_LABEL, type Reel } from "@/lib/content/elemental-reels";
import { STATUSES, STATUS_LABEL, formatDay, type DayGroup, type ReelStatus } from "@/lib/reels/studio";
import { useStoredState } from "@/lib/reels/useStoredState";

export const STATUS_KEY = "reel-studio:status:v1";

function ReelCard({
  reel,
  status,
  onStatus,
}: {
  reel: Reel;
  status: ReelStatus;
  onStatus: (next: ReelStatus) => void;
}) {
  return (
    <li className="rounded-md border border-border bg-card p-3 text-card-foreground">
      <Link
        href={`/admin/hackathon/reels/${reel.id}`}
        className="block min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <p className="text-sm text-muted-foreground">
          {ELEMENT_LABEL[reel.element]}
          {" · "}
          {reel.length} วินาที
          {reel.ticket ? ` · ${reel.ticket}` : ""}
          {reel.backup ? " · สำรอง" : ""}
          {reel.alt ? " · ทางเลือก" : ""}
        </p>
        <p className="mt-1 text-xl font-semibold leading-snug">{reel.title}</p>
      </Link>
      <label className="mt-3 flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">สถานะ</span>
        <select
          value={status}
          onChange={(e) => onStatus(e.target.value as ReelStatus)}
          className="min-h-11 rounded-md border border-border bg-background px-3 text-base text-foreground"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </label>
    </li>
  );
}

export function ReelList({ groups, today }: { groups: DayGroup[]; today: string }) {
  const [statuses, setStatuses] = useStoredState<Record<string, ReelStatus>>(STATUS_KEY, {});

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.day} aria-labelledby={`day-${group.day}`}>
          <h2 id={`day-${group.day}`} className="mb-2 text-lg font-semibold">
            {formatDay(group.day)}
            {group.day === today ? " (วันนี้)" : ""}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.reels.map((reel) => (
              <ReelCard
                key={reel.id}
                reel={reel}
                status={statuses[reel.id] ?? "scripted"}
                onStatus={(next) => setStatuses((prev) => ({ ...prev, [reel.id]: next }))}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
