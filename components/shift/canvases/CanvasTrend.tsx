import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TrendRow } from "@/lib/shift/canvas-snapshots";
import { SHIFT_CARDS, shortTitle } from "@/lib/whiteboard/shift-cards";

const COLUMNS = [
  { key: "notes", label: "Notes" },
  { key: "interviews", label: SHIFT_CARDS.interview.emoji, title: shortTitle("interview") },
  { key: "references", label: SHIFT_CARDS.reference.emoji, title: shortTitle("reference") },
  { key: "tests", label: SHIFT_CARDS.test.emoji, title: shortTitle("test") },
  { key: "pivots", label: SHIFT_CARDS.pivot.emoji, title: shortTitle("pivot") },
  { key: "versions", label: "Versions" },
  { key: "daysLogged", label: "Days" },
] as const;

const formatDay = (day: string) =>
  new Date(`${day}T12:00:00+07:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Bangkok" });

/** A canvas's daily snapshots: the numbers, what grew, and Claude Haiku's note on what changed. */
export function CanvasTrend({ rows }: { rows: TrendRow[] }) {
  return (
    <section aria-label="Progress by day" className="space-y-2 rounded-lg border bg-card p-4">
      <h2 className="text-sm font-semibold">Progress by day</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No snapshots yet. One is taken every night, around 23:45 Bangkok time.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                {COLUMNS.map((c) => (
                  <TableHead key={c.key} className="text-right" title={"title" in c ? c.title : undefined}>
                    <span aria-hidden={"title" in c}>{c.label}</span>
                    {"title" in c && <span className="sr-only">{c.title}</span>}
                  </TableHead>
                ))}
                <TableHead className="min-w-64">What changed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.day}>
                  <TableCell className="whitespace-nowrap text-sm">{formatDay(r.day)}</TableCell>
                  {COLUMNS.map((c) => {
                    const delta = r.delta[c.key];
                    return (
                      <TableCell key={c.key} className="whitespace-nowrap text-right text-sm tabular-nums">
                        {c.key === "daysLogged" ? `${r.stats.daysLogged}/${r.stats.days}` : r.stats[c.key]}
                        {delta ? (
                          <span className={delta > 0 ? "ml-1 text-emerald-500" : "ml-1 text-muted-foreground"}>
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        ) : null}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-sm text-muted-foreground">{r.changeNote ?? "–"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
