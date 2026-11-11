import { Badge } from "@/components/ui/badge";
import type { CareerRequestGroup } from "@/lib/radar-guide/admin-funnel";
import type { CareerRequestAdminRow } from "@/lib/supabase/radar-guide-admin";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(
    new Date(value)
  );
}

/**
 * Career requests (spec 6, item 5): free text from students, admin-only and
 * never shown publicly. Grouped by lowercased text, with the raw rows below.
 */
export function RadarCareerRequests({
  groups,
  rows,
  error,
}: {
  groups: CareerRequestGroup[];
  rows: CareerRequestAdminRow[];
  error?: string | null;
}) {
  return (
    <div className="space-y-8">
      {error ? <p className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{error}</p> : null}

      <section className="space-y-3" aria-labelledby="requests-grouped-heading">
        <div>
          <h2 id="requests-grouped-heading" className="text-xl font-semibold">
            Most requested careers
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length.toLocaleString()} request{rows.length === 1 ? "" : "s"}, grouped by text. Students wrote these; keep them inside the team.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-2 font-medium">Request</th>
                <th className="p-2 text-right font-medium">Count</th>
                <th className="p-2 font-medium">Status</th>
                <th className="p-2 font-medium">Matched field</th>
                <th className="p-2 font-medium">Latest</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    No career requests yet.
                  </td>
                </tr>
              ) : (
                groups.map((group) => (
                  <tr key={group.text}>
                    <td className="p-2 font-medium">{group.text}</td>
                    <td className="p-2 text-right tabular-nums">{group.count}</td>
                    <td className="p-2">
                      <span className="flex flex-wrap gap-1">
                        {Object.entries(group.statuses).map(([status, count]) => (
                          <Badge key={status} variant="outline" className="text-[10px]">
                            {status} {count}
                          </Badge>
                        ))}
                      </span>
                    </td>
                    <td className="p-2 text-xs">{group.matchedFieldSlug ?? "–"}</td>
                    <td className="p-2 text-xs text-muted-foreground">{formatDate(group.lastAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="requests-raw-heading">
        <h2 id="requests-raw-heading" className="text-xl font-semibold">
          All requests
        </h2>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-2 font-medium">Time</th>
                <th className="p-2 font-medium">Request</th>
                <th className="p-2 font-medium">Source</th>
                <th className="p-2 font-medium">From page</th>
                <th className="p-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="p-2 text-xs text-muted-foreground">{formatDate(row.created_at)}</td>
                  <td className="p-2">{row.request_text}</td>
                  <td className="p-2 text-xs">{row.source}</td>
                  <td className="p-2 text-xs">{row.from_field_slug ?? "hub"}</td>
                  <td className="p-2 text-xs">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
