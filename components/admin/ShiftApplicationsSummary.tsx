import { Badge } from "@/components/ui/badge";
import type { SeatStats, SourceCount } from "@/lib/shift/applicationStats";

function pct(value: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.min(100, (value / total) * 100)}%`;
}

/** Paid seats in solid, accepted-but-unpaid layered behind, out of total seats. */
export function ShiftSeatBar({ stats, total }: { stats: SeatStats; total: number }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span>
          <span className="text-2xl font-semibold">{stats.paid}</span>
          <span className="text-muted-foreground"> paid</span>
          <span className="mx-2 text-muted-foreground">/</span>
          <span className="font-medium">{stats.accepted}</span>
          <span className="text-muted-foreground"> accepted</span>
          <span className="mx-2 text-muted-foreground">/</span>
          <span className="font-medium">{stats.seats}</span>
          <span className="text-muted-foreground"> seats</span>
        </span>
        <span className="text-muted-foreground">{total} applications</span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 bg-primary/30"
          style={{ width: pct(stats.accepted, stats.seats) }}
        />
        <div
          className="absolute inset-y-0 left-0 bg-primary"
          style={{ width: pct(stats.paid, stats.seats) }}
        />
      </div>
    </div>
  );
}

export function ShiftSourceChips({ sources }: { sources: SourceCount[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {sources.map(({ source, count }) => (
        <Badge key={source} variant="outline" className="gap-1.5 font-normal">
          {source}
          <span className="font-semibold">{count}</span>
        </Badge>
      ))}
    </div>
  );
}
