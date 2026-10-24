import { Badge } from "@/components/ui/badge";
import { SOURCE_LABELS, syncErrorHint } from "@/lib/meta/marketing/format";
import type { SyncRunRecordRow } from "@/lib/meta/marketing/report";
import type { MarketingSource } from "@/lib/supabase/meta-marketing";

const SOURCES: MarketingSource[] = ["ig_account", "ig_media", "meta_ads"];

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "ok") return "default";
  if (status === "failed") return "destructive";
  if (status === "skipped") return "secondary";
  return "outline";
}

function formatRunTime(value: string | null): string {
  if (!value) return "still running";
  return new Date(value).toLocaleString("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Last run per source, with the fix for anything that stopped it. */
export function MarketingSyncStatus({ runs }: { runs: SyncRunRecordRow[] }) {
  return (
    <section aria-label="Sync status" className="grid gap-3 sm:grid-cols-3">
      {SOURCES.map((source) => {
        const run = runs.find((r) => r.source === source);
        const hint = syncErrorHint(run?.error_code ?? null);
        return (
          <div key={source} className="space-y-1.5 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{SOURCE_LABELS[source]}</p>
              <Badge variant={run ? statusVariant(run.status) : "outline"}>{run?.status ?? "never run"}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {run
                ? `${formatRunTime(run.finished_at)} · ${run.rows_upserted.toLocaleString("en-US")} rows`
                : "Waiting for the first daily sync."}
            </p>
            {run?.error_code && (
              <p className="text-xs">
                <code className="break-all">{run.error_code}</code>
                {hint && <span className="text-muted-foreground"> {hint}</span>}
              </p>
            )}
          </div>
        );
      })}
    </section>
  );
}
