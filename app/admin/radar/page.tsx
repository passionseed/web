import { createClient } from "@/utils/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Eye,
  FileText,
  MousePointerClick,
  Search,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RadarAnalyticsCharts } from "@/components/admin/RadarAnalyticsCharts";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminEmptyState, AdminErrorState } from "@/components/admin/shared/AdminStates";

export const dynamic = "force-dynamic";

type EngagementRow =
  Database["public"]["Views"]["analytics_radar_engagement"]["Row"];

type IntentRow = Database["public"]["Tables"]["radar_path_intents"]["Row"];

type AdminRadarPageProps = {
  searchParams?: Promise<{
    view?: string;
    q?: string;
  }>;
};

function formatActivityDate(value: string | null) {
  if (!value) return "No activity";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

const VIEW_TAB =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors";

function ViewTabs({ activeView }: { activeView: "content" | "analytics" }) {
  const tabs = [
    { view: "content", href: "/admin/radar", label: "Content", icon: FileText },
    { view: "analytics", href: "/admin/radar?view=analytics", label: "Analytics", icon: BarChart3 },
  ] as const;
  return (
    <nav
      className="grid w-full grid-cols-2 rounded-lg border bg-muted/40 p-1 lg:w-auto"
      aria-label="Radar workspace views"
    >
      {tabs.map(({ view, href, label, icon: Icon }) => (
        <Link
          key={view}
          href={href}
          aria-current={activeView === view ? "page" : undefined}
          className={cn(
            VIEW_TAB,
            activeView === view
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground active:text-foreground"
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export default async function AdminRadarPage({
  searchParams,
}: AdminRadarPageProps) {
  const params = await searchParams;
  const activeView = params?.view === "analytics" ? "analytics" : "content";
  const searchQuery = params?.q?.trim() || "";
  const supabase = await createClient();

  // Independent reads run together; profiles wait for the intent user ids.
  const [
    { data: engagement, error: engagementError },
    { data: recentIntents, error: intentsError },
    { data: radarFields, error: fieldsError },
    // Global uniques must be computed in SQL (do not sum per-field uniques, and
    // do not page through radar_field_views which can exceed the API row limit).
    { data: totals, error: totalsError },
  ] = await Promise.all([
    supabase
      .from("analytics_radar_engagement")
      .select("*")
      .order("views", { ascending: false }),
    supabase
      .from("radar_path_intents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("radar_fields")
      .select("id, slug, name_th, name_en")
      .order("sort_order", { ascending: true }),
    supabase
      .from("analytics_radar_totals")
      .select("total_views, unique_viewers, total_intents")
      .maybeSingle(),
  ]);

  const intentUserIds = (recentIntents || [])
    .map((i) => i.user_id)
    .filter((id): id is string => Boolean(id));

  const { data: intentProfiles, error: profilesError } =
    intentUserIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, email, full_name, username")
          .in("id", intentUserIds)
      : { data: [], error: null };

  const totalViews =
    totals?.total_views ??
    engagement?.reduce((sum, row) => sum + (row.views || 0), 0) ??
    0;
  const totalIntents =
    totals?.total_intents ??
    engagement?.reduce((sum, row) => sum + (row.intents || 0), 0) ??
    0;
  const uniqueViewers = totals?.unique_viewers ?? 0;

  const profileById = new Map(
    (intentProfiles || []).map((p) => [p.id, p])
  );
  const engagementBySlug = new Map(
    (engagement || []).map((row) => [row.field_slug, row])
  );
  const normalizedQuery = searchQuery.toLocaleLowerCase();
  const rankedFields = (radarFields || [])
    .map((field) => {
      const fieldEngagement = engagementBySlug.get(field.slug);
      return {
        ...field,
        views: fieldEngagement?.views || 0,
        uniqueViewers: fieldEngagement?.unique_viewers || 0,
      };
    })
    .sort(
      (a, b) =>
        b.uniqueViewers - a.uniqueViewers ||
        b.views - a.views ||
        a.slug.localeCompare(b.slug)
    )
    .map((field, index) => ({ ...field, rank: index + 1 }));
  const filteredFields = rankedFields.filter((field) =>
    [field.name_th, field.name_en, field.slug].some((value) =>
      value?.toLocaleLowerCase().includes(normalizedQuery)
    )
  );

  const error =
    engagementError ||
    intentsError ||
    profilesError ||
    fieldsError ||
    totalsError;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Career Radar"
        title="Radar workspace"
        description="Maintain the career stories students see, then review which fields and paths are earning attention."
        actions={<ViewTabs activeView={activeView} />}
      />

      {error && (
        <AdminErrorState
          title="Could not load all Radar data"
          message={`Some numbers below may be missing. ${error.message}`}
        />
      )}

      {activeView === "content" ? (
        <section className="space-y-4" aria-labelledby="radar-content-heading">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="radar-content-heading" className="text-xl font-semibold">
                Career fields
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {radarFields?.length || 0} published field
                {(radarFields?.length || 0) === 1 ? "" : "s"}, ranked by unique
                viewers.
              </p>
            </div>
            <form action="/admin/radar" method="get" className="relative w-full sm:max-w-xs">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                name="q"
                defaultValue={searchQuery}
                placeholder="Search fields"
                aria-label="Search Radar fields"
                className="h-10 pl-9"
              />
            </form>
          </div>

          <div>
            {filteredFields.length === 0 ? (
              <AdminEmptyState
                title={searchQuery ? "No matching fields" : "No Radar fields available"}
                description={
                  searchQuery
                    ? `Try a different search than “${searchQuery}”.`
                    : "Fields will appear here after they are added."
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {filteredFields.map((field) => (
                  <Link
                    key={field.id}
                    href={`/admin/radar/${field.id}`}
                    className="group relative min-h-48 overflow-hidden rounded-lg border bg-card p-4 transition-colors duration-200 hover:border-primary/40 active:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <div
                      className="pointer-events-none absolute -right-6 -top-7 h-28 w-28 rounded-full border border-primary/15"
                      aria-hidden="true"
                    >
                      <span className="absolute inset-4 rounded-full border border-primary/15" />
                      <span className="absolute inset-8 rounded-full border border-primary/20" />
                      <span className="absolute inset-1/2 h-px w-1/2 origin-left bg-primary/15" />
                      <span className="absolute left-1/2 top-0 h-1/2 w-px bg-primary/15" />
                      <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/40" />
                    </div>

                    <div className="relative flex h-full flex-col">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">
                          #{field.rank}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          Published
                        </span>
                      </div>

                      <div className="mt-6 min-w-0">
                        <h3 className="truncate font-semibold leading-snug">
                          {field.name_th || field.name_en || field.slug}
                        </h3>
                        {field.name_th && field.name_en && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {field.name_en}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-4 border-t pt-3 text-xs">
                        <span className="inline-flex items-center gap-1.5" title="Unique viewers">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                          <strong className="font-semibold">
                            {field.uniqueViewers.toLocaleString()}
                          </strong>
                          <span className="text-muted-foreground">unique</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5" title="Total views">
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                          <strong className="font-semibold">
                            {field.views.toLocaleString()}
                          </strong>
                          <span className="text-muted-foreground">views</span>
                        </span>
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                        <span className="truncate font-mono text-[10px] text-muted-foreground">
                          {field.slug}
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                          Edit
                          <ArrowRight
                            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                            aria-hidden="true"
                          />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : (
        <div className="space-y-10">
          <section aria-labelledby="radar-overview-heading">
            <div className="mb-4">
              <h2 id="radar-overview-heading" className="text-xl font-semibold">
                Engagement overview
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                How visitors move from exploring a career to choosing a next step.
              </p>
            </div>
            <div className="grid overflow-hidden rounded-xl border sm:grid-cols-3">
              {[
                {
                  label: "Page views",
                  value: totalViews.toLocaleString(),
                  detail: `${uniqueViewers.toLocaleString()} unique sessions`,
                  icon: Eye,
                },
                {
                  label: "Path intents",
                  value: totalIntents.toLocaleString(),
                  detail: "Clicks to try a recommended path",
                  icon: MousePointerClick,
                },
                {
                  label: "Intent rate",
                  value:
                    totalViews > 0
                      ? `${((totalIntents / totalViews) * 100).toFixed(1)}%`
                      : "0%",
                  detail: "Path intents per page view",
                  icon: Users,
                },
              ].map((metric, index) => (
                <div
                  key={metric.label}
                  className={cn(
                    "flex items-start justify-between gap-4 p-5",
                    index > 0 && "border-t sm:border-l sm:border-t-0"
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {metric.label}
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight">
                      {metric.value}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {metric.detail}
                    </p>
                  </div>
                  <metric.icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4" aria-labelledby="field-performance-heading">
            <div>
              <h2 id="field-performance-heading" className="text-xl font-semibold">
                Field performance
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Published fields ranked by total views.
              </p>
            </div>
            <div className="overflow-x-auto rounded-xl border">
              <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead>Field</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Unique viewers</TableHead>
                <TableHead className="text-right">Intents</TableHead>
                <TableHead className="text-right">Unique intenters</TableHead>
                <TableHead>Paths</TableHead>
                <TableHead>Last activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(engagement || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No radar engagement data yet.
                  </TableCell>
                </TableRow>
              ) : (
                (engagement as EngagementRow[]).map((row) => (
                  <TableRow key={row.field_slug}>
                    <TableCell>
                      <div className="font-medium">
                        {row.field_name_th || row.field_name_en || row.field_slug}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {row.field_slug}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{row.views}</TableCell>
                    <TableCell className="text-right">
                      {row.unique_viewers}
                    </TableCell>
                    <TableCell className="text-right">{row.intents}</TableCell>
                    <TableCell className="text-right">
                      {row.unique_intenters}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(row.intent_paths || []).map((path) => (
                          <Badge
                            key={path}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {path}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatActivityDate(row.last_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
              </Table>
            </div>
          </section>

          {/* ── Daily Analytics Charts ── */}
          <RadarAnalyticsCharts />

          <section className="space-y-4" aria-labelledby="recent-intents-heading">
            <div>
              <h2 id="recent-intents-heading" className="text-xl font-semibold">
                Recent path intents
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The latest visitors who chose to try a recommended next step.
              </p>
            </div>
            <div className="overflow-x-auto rounded-xl border">
              <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Field</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Button label</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Session</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(recentIntents || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No path intents yet.
                  </TableCell>
                </TableRow>
              ) : (
                (recentIntents as IntentRow[]).map((intent) => {
                  const profile = intent.user_id
                    ? profileById.get(intent.user_id)
                    : null;
                  return (
                    <TableRow key={intent.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatActivityDate(intent.created_at)}
                      </TableCell>
                      <TableCell>{intent.field_slug}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {intent.path_slug}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {intent.button_label || "–"}
                      </TableCell>
                      <TableCell>
                        {intent.user_id ? (
                          <div>
                            <div className="text-sm">
                              {profile?.full_name || profile?.username || "Unknown"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {profile?.email || intent.user_id}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Anonymous
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {intent.session_id.slice(0, 12)}…
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
              </Table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
