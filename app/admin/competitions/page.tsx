import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/shared/AdminStates";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import {
  type CompetitionOpsFilters,
  type EligibilityStatus,
  getCompetitionOpsData,
} from "@/lib/supabase/competition-ops";

export const dynamic = "force-dynamic";

type RawSearchParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseFilters(raw: RawSearchParams): CompetitionOpsFilters {
  const source = one(raw.source);
  const eligibility = one(raw.eligibility);
  const state = one(raw.state);
  const page = Number(one(raw.page) ?? "1");
  return {
    source: source === "contester" || source === "devpost" ? source : undefined,
    eligibility: ["eligible", "ineligible", "needs_review"].includes(
        eligibility ?? "",
      )
      ? eligibility as EligibilityStatus
      : undefined,
    state: state === "open" || state === "closed" ? state : undefined,
    query: one(raw.q),
    page: Number.isFinite(page) ? page : 1,
  };
}

function formatTimestamp(value: string | null): string {
  if (!value) return "–";
  return new Date(value).toLocaleString("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string | null): string {
  if (!value) return "No deadline";
  return new Date(value).toLocaleDateString("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function eligibilityVariant(status: EligibilityStatus) {
  if (status === "eligible") return "default" as const;
  if (status === "ineligible") return "secondary" as const;
  return "outline" as const;
}

function runVariant(status: string) {
  if (status === "failed") return "destructive" as const;
  if (status === "succeeded") return "default" as const;
  return "secondary" as const;
}

function LastRunStatus({ completedAt, complete }: { completedAt: string | null | undefined; complete: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {complete ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
      ) : (
        <CircleDashed className="h-4 w-4 text-amber-500" aria-hidden="true" />
      )}
      <span>{completedAt === undefined ? "No run yet" : `Last run ${formatTimestamp(completedAt)}`}</span>
    </div>
  );
}

function pageHref(filters: CompetitionOpsFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.source) params.set("source", filters.source);
  if (filters.eligibility) params.set("eligibility", filters.eligibility);
  if (filters.state) params.set("state", filters.state);
  if (filters.query) params.set("q", filters.query);
  params.set("page", String(page));
  return `/admin/competitions?${params.toString()}`;
}

export default async function AdminCompetitionsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  // The admin layout also checks, but this page reads with the service-role client.
  await requireAdmin();
  const filters = parseFilters(await searchParams);
  const data = await getCompetitionOpsData(filters);
  const latestRun = data.runs[0];
  const totalPages = Math.max(1, Math.ceil(data.itemCount / data.pageSize));
  const sourceComplete = latestRun?.contester_complete && latestRun?.devpost_complete;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Opportunity operations"
        title="Competition coverage"
        description="Source completeness, eligibility evidence, publication state, and the human-review backlog. Times use Bangkok time."
        actions={<LastRunStatus completedAt={latestRun ? latestRun.completed_at : undefined} complete={Boolean(sourceComplete)} />}
      />

      <section aria-labelledby="coverage-summary">
        <h2 id="coverage-summary" className="sr-only">Coverage summary</h2>
        <dl className="grid border-y sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Source records", data.metrics.totalSources.toLocaleString()],
            ["Open now", data.metrics.openSources.toLocaleString()],
            ["Auto-eligible", data.metrics.eligibleSources.toLocaleString()],
            ["Needs review", data.metrics.reviewSources.toLocaleString()],
            ["Published", data.metrics.activeCompetitions.toLocaleString()],
          ].map(([label, value], index) => (
            <div
              key={label}
              className={`px-4 py-4 ${index > 0 ? "border-t sm:border-t-0 sm:border-l" : ""}`}
            >
              <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
              <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span>Contester open: {data.metrics.openContester.toLocaleString()}</span>
          <span>Devpost open: {data.metrics.openDevpost.toLocaleString()}</span>
          <span>Expired but published: {data.metrics.staleCompetitions}</span>
          <span>Pending human reviews: {data.metrics.pendingReviews}</span>
        </div>
      </section>

      {latestRun && (
        <section className="rounded-lg border bg-muted/15" aria-labelledby="latest-sync">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <div>
              <h2 id="latest-sync" className="font-semibold">Latest source sync</h2>
              <p className="text-xs text-muted-foreground">
                Started {formatTimestamp(latestRun.started_at)} · {latestRun.devpost_pages + latestRun.contester_pages} pages
              </p>
            </div>
            <Badge variant={runVariant(latestRun.status)}>{latestRun.status}</Badge>
          </div>
          <div className="grid gap-px bg-border md:grid-cols-2">
            {[
              {
                name: "Contester",
                fetched: latestRun.contester_fetched,
                reported: latestRun.contester_reported_total,
                complete: latestRun.contester_complete,
              },
              {
                name: "Devpost",
                fetched: latestRun.devpost_fetched,
                reported: latestRun.devpost_reported_total,
                complete: latestRun.devpost_complete,
              },
            ].map((source) => (
              <div key={source.name} className="bg-background px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{source.name}</p>
                  <span className={source.complete ? "text-emerald-400" : "text-amber-400"}>
                    {source.complete ? "Complete" : "Partial"}
                  </span>
                </div>
                <p className="mt-2 font-mono text-xl tabular-nums">
                  {source.fetched.toLocaleString()}
                  <span className="text-sm text-muted-foreground">
                    {` / ${(source.reported ?? 0).toLocaleString()}`}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4" aria-labelledby="source-records">
        <div>
          <h2 id="source-records" className="text-lg font-semibold">Source records</h2>
          <p className="text-sm text-muted-foreground">
            Review-first records stay out of student plans until eligibility is evidenced.
          </p>
        </div>

        <form className="flex flex-wrap items-end gap-3 border-y bg-muted/10 py-3">
          <label className="space-y-1 text-xs font-medium">
            <span>Source</span>
            <select name="source" defaultValue={filters.source ?? ""} className="h-11 rounded-md border bg-background px-2 text-sm">
              <option value="">All sources</option>
              <option value="contester">Contester</option>
              <option value="devpost">Devpost</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium">
            <span>Eligibility</span>
            <select name="eligibility" defaultValue={filters.eligibility ?? ""} className="h-11 rounded-md border bg-background px-2 text-sm">
              <option value="">All states</option>
              <option value="eligible">Eligible</option>
              <option value="needs_review">Needs review</option>
              <option value="ineligible">Ineligible</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium">
            <span>Listing state</span>
            <select name="state" defaultValue={filters.state ?? ""} className="h-11 rounded-md border bg-background px-2 text-sm">
              <option value="">Open and closed</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <label className="min-w-56 flex-1 space-y-1 text-xs font-medium">
            <span>Title</span>
            <input name="q" defaultValue={filters.query ?? ""} placeholder="Search opportunity title" className="h-11 w-full rounded-md border bg-background px-3 text-sm" />
          </label>
          <button type="submit" className="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:bg-primary/90">
            Apply
          </button>
          {(filters.source || filters.eligibility || filters.state || filters.query) && (
            <Link href="/admin/competitions" className="inline-flex h-11 items-center px-2 text-xs underline underline-offset-4">
              Clear
            </Link>
          )}
        </form>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 font-medium">Opportunity</th>
                <th className="px-3 py-2.5 font-medium">Source</th>
                <th className="px-3 py-2.5 font-medium">Eligibility</th>
                <th className="px-3 py-2.5 font-medium">Deadline</th>
                <th className="px-3 py-2.5 font-medium">Evidence</th>
                <th className="px-3 py-2.5 font-medium">Checked</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={`${item.source}:${item.external_id}`} className="border-t align-top">
                  <td className="max-w-sm px-3 py-3">
                    <a href={item.source_url} target="_blank" rel="noreferrer" className="font-medium underline decoration-border underline-offset-4 hover:decoration-foreground">
                      {item.title}
                      <ExternalLink className="ml-1 inline h-3 w-3" aria-hidden="true" />
                    </a>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.opportunity_type ?? "Uncategorized"}
                    </p>
                  </td>
                  <td className="px-3 py-3 capitalize">{item.source}</td>
                  <td className="px-3 py-3">
                    <Badge variant={eligibilityVariant(item.eligibility_status)}>
                      {item.eligibility_status.replace("_", " ")}
                    </Badge>
                    {!item.is_open && <p className="mt-1 text-xs text-muted-foreground">Closed</p>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">{formatDate(item.deadline)}</td>
                  <td className="max-w-xs px-3 py-3 text-xs text-muted-foreground">
                    <p>{item.eligibility_reason ?? "No evidence recorded"}</p>
                    {(item.age_min !== null || item.age_max !== null) && (
                      <p className="mt-1 font-mono">Age {item.age_min ?? "?"}–{item.age_max ?? "?"}</p>
                    )}
                    {item.educational_levels.length > 0 && (
                      <p className="mt-1 font-mono">{item.educational_levels.join(", ")}</p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                    {formatTimestamp(item.source_checked_at)}
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center text-sm text-muted-foreground">
                    No source records match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            {data.itemCount.toLocaleString()} records · page {data.page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {data.page > 1 && (
              <Link href={pageHref(filters, data.page - 1)} className="inline-flex min-h-11 items-center rounded-md border px-3 hover:bg-muted active:bg-muted">
                Previous
              </Link>
            )}
            {data.page < totalPages && (
              <Link href={pageHref(filters, data.page + 1)} className="inline-flex min-h-11 items-center rounded-md border px-3 hover:bg-muted active:bg-muted">
                Next
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Run history</h2>
            <p className="text-sm text-muted-foreground">Durable proof from the last ten source refreshes.</p>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Started</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Contester</th>
                  <th className="px-3 py-2 font-medium">Devpost</th>
                  <th className="px-3 py-2 font-medium">Published</th>
                </tr>
              </thead>
              <tbody>
                {data.runs.map((run) => (
                  <tr key={run.id} className="border-t">
                    <td className="whitespace-nowrap px-3 py-2.5">{formatTimestamp(run.started_at)}</td>
                    <td className="px-3 py-2.5"><Badge variant={runVariant(run.status)}>{run.status}</Badge></td>
                    <td className="px-3 py-2.5 font-mono">{run.contester_fetched}/{run.contester_reported_total ?? "?"}</td>
                    <td className="px-3 py-2.5 font-mono">{run.devpost_fetched}/{run.devpost_reported_total ?? "?"}</td>
                    <td className="px-3 py-2.5 font-mono">{run.promoted_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Human review queue</h2>
            <p className="text-sm text-muted-foreground">Oldest pending work first.</p>
          </div>
          <div className="divide-y rounded-lg border">
            {data.reviews.slice(0, 10).map((review) => (
              <details key={review.id} className="group px-4 py-3">
                <summary className="flex cursor-pointer list-none items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{review.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">Due {formatTimestamp(review.due_at)}</span>
                  </span>
                  <Badge variant="outline">{review.review_type.replace("_", " ")}</Badge>
                </summary>
                <p className="mt-3 pl-7 text-xs leading-relaxed text-muted-foreground">{review.details}</p>
              </details>
            ))}
            {data.reviews.length === 0 && (
              <AdminEmptyState title="No pending reviews" className="border-0" />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
