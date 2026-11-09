"use client";

import { useEffect, useState } from "react";
import { ChevronRight, RefreshCw } from "lucide-react";

import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoading,
} from "@/components/admin/shared/AdminStates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBangkokDateTime } from "@/lib/admin/queue-tools/format";
import {
  EXPERT_STATUS_FILTERS,
  EXPERT_STATUS_LABEL,
  EXPERTS_PAGE_SIZE,
  pageCount,
  type ExpertStatusFilter,
} from "@/lib/admin/queue-tools/experts";
import { cn } from "@/lib/utils";

interface ExpertRow {
  id: string;
  name: string;
  title: string;
  company: string;
  field_category: string;
  status: string;
  mentoring_preference: string;
  created_at: string;
}

/** Touch targets stay 44px below the desktop breakpoint. */
const CONTROL_HEIGHT = "h-11 lg:[@media(pointer:fine)]:h-9";

/** Status chip for expert submissions, on the shell's semantic tokens. */
export function ExpertStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={status === "approved" ? "secondary" : "outline"}
      className={cn(
        "capitalize",
        status === "pending" && "border-primary/50 bg-primary/10 text-foreground",
        status === "rejected" && "border-destructive/40 text-destructive",
      )}
    >
      {status}
    </Badge>
  );
}

interface ExpertQueueProps {
  status: ExpertStatusFilter;
  page: number;
  onStatusChange: (status: ExpertStatusFilter) => void;
  onPageChange: (page: number) => void;
  onSelectExpert: (id: string) => void;
}

/** One page of submissions. Status and page are owned by the URL. */
function useExpertsPage(status: ExpertStatusFilter, page: number) {
  const [data, setData] = useState<{ experts: ExpertRow[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Aborting the previous request means a slow, stale page can never
    // overwrite the one that was asked for last.
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({
      status,
      page: String(page),
      limit: String(EXPERTS_PAGE_SIZE),
    });
    fetch(`/api/admin/experts?${params}`, { signal: controller.signal, cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<{ experts: ExpertRow[] | null; total: number | null }>;
      })
      .then((body) => {
        if (!controller.signal.aborted) {
          setData({ experts: body.experts ?? [], total: body.total ?? 0 });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [status, page, attempt]);

  return { data, loading, error, reload: () => setAttempt((n) => n + 1) };
}

export function ExpertQueue({
  status,
  page,
  onStatusChange,
  onPageChange,
  onSelectExpert,
}: ExpertQueueProps) {
  const { data, loading, error, reload } = useExpertsPage(status, page);
  const total = data?.total ?? 0;
  const totalPages = pageCount(total);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Select value={status} onValueChange={(v) => onStatusChange(v as ExpertStatusFilter)}>
            <SelectTrigger className={`${CONTROL_HEIGHT} w-40`} aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPERT_STATUS_FILTERS.map((value) => (
                <SelectItem key={value} value={value}>
                  {EXPERT_STATUS_LABEL[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {data && !error && (
            <span className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
              {total} total
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" className={CONTROL_HEIGHT} onClick={reload} disabled={loading}>
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <AdminLoading rows={5} rowClassName="h-[76px]" label="Loading expert submissions" />
      ) : error ? (
        <AdminErrorState
          title="Could not load expert submissions"
          message="The list did not load, so this is not an empty queue."
          onRetry={reload}
        />
      ) : !data || data.experts.length === 0 ? (
        page > 1 && total > 0 ? (
          <AdminEmptyState
            title={`Page ${page} is past the end`}
            action={
              <Button size="sm" variant="outline" className={CONTROL_HEIGHT} onClick={() => onPageChange(1)}>
                Go to page 1
              </Button>
            }
          />
        ) : (
          <AdminEmptyState
            title={
              status === "all"
                ? "No expert submissions yet"
                : `No ${EXPERT_STATUS_LABEL[status].toLowerCase()} submissions`
            }
            description={status === "pending" ? "New interviews appear here for review." : undefined}
          />
        )
      ) : (
        <ul className="space-y-2">
          {data.experts.map((expert) => (
            <li key={expert.id}>
              <button
                type="button"
                onClick={() => onSelectExpert(expert.id)}
                className="group flex w-full items-center justify-between gap-4 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">{expert.name}</span>
                    <ExpertStatusBadge status={expert.status} />
                    {expert.mentoring_preference !== "none" && (
                      <Badge variant="outline" className="text-xs">
                        {expert.mentoring_preference} mentoring
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {expert.title} at {expert.company} · {expert.field_category}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatBangkokDateTime(expert.created_at, { year: true })}
                  </p>
                </div>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-active:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && totalPages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            className={CONTROL_HEIGHT}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className={CONTROL_HEIGHT}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}
