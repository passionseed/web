import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  formatPct,
  funnelRates,
  GUIDE_PAGE_TARGETS,
  type ChannelPageRow,
  type FunnelTotals,
  type GuidePageFunnelRow,
  type ReelFunnelRow,
} from "@/lib/radar-guide/admin-funnel";
import { adminPageLabel } from "@/lib/radar-guide/admin-pages";
import { cn } from "@/lib/utils";

export interface FunnelLinkRow {
  code: string;
  /** Guide page the link opens, if any. */
  pageKey?: string | null;
  clicks: number;
  visits: number | null;
}

const WEEK_OPTIONS = [1, 2, 4, 8, 12] as const;

function Num({ value }: { value: number | null }) {
  return <>{value === null ? "-" : value.toLocaleString()}</>;
}

const TH = "p-2 text-right font-medium";
const TD = "p-2 text-right tabular-nums";

function FunnelCells({ totals }: { totals: FunnelTotals }) {
  const rates = funnelRates(totals);
  return (
    <>
      <td className={TD}>{totals.visits.toLocaleString()}</td>
      <td className={TD}>{totals.devices.toLocaleString()}</td>
      <td className={TD}>{rates.pagesPerVisit === null ? "-" : rates.pagesPerVisit.toFixed(1)}</td>
      <td className={TD}>{totals.plays.toLocaleString()}</td>
      <td className={TD}>{formatPct(rates.unmutePct)}</td>
      <td className={TD}>{formatPct(rates.completePct)}</td>
      <td className={TD}>{formatPct(rates.interactivePct)}</td>
      <td className={TD}>{totals.cta.toLocaleString()}</td>
      <td className={TD}>{totals.follow.toLocaleString()}</td>
      <td className={TD}>{totals.share.toLocaleString()}</td>
      <td className={TD}>{totals.intents.toLocaleString()}</td>
      <td className={TD}>{totals.requests.toLocaleString()}</td>
    </>
  );
}

const FUNNEL_HEAD = [
  "Visits",
  "Devices",
  "Pages / visit",
  "Plays",
  "Unmute",
  "Complete",
  "Interactive",
  "CTA",
  "Follow",
  "Share",
  "Intents",
  "Requests",
];

/**
 * Guide funnel tab (spec 6, item 4). Reads `analytics_radar_guide_funnel`,
 * `analytics_radar_guide_pages`, `radar_reel_insights` and the DM log only.
 * Filters are a plain GET form.
 */
export function RadarGuideFunnel({
  weeks,
  page,
  fromWeek,
  pages,
  byChannelPage,
  totals,
  guidePages = [],
  reels,
  links,
  error,
}: {
  weeks: number;
  page: string | null;
  fromWeek: string;
  pages: Array<{ slug: string; name: string }>;
  byChannelPage: ChannelPageRow[];
  totals: FunnelTotals;
  guidePages?: GuidePageFunnelRow[];
  reels: ReelFunnelRow[];
  links: FunnelLinkRow[];
  error?: string | null;
}) {
  return (
    <div className="space-y-8">
      <form action="/admin/radar" method="get" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="view" value="funnel" />
        <label className="space-y-1 text-xs font-medium">
          <span className="block">Weeks</span>
          <select name="weeks" defaultValue={String(weeks)} className="h-10 rounded-md border bg-background px-3 text-sm">
            {WEEK_OPTIONS.map((w) => (
              <option key={w} value={w}>
                Last {w} week{w === 1 ? "" : "s"}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium">
          <span className="block">Page</span>
          <select name="page" defaultValue={page ?? ""} className="h-10 rounded-md border bg-background px-3 text-sm">
            <option value="">All pages</option>
            <option value="hub">Hub</option>
            {pages.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="outline" className="min-h-10">
          Apply
        </Button>
        <p className="text-xs text-muted-foreground">Weeks start Monday (Bangkok), from {fromWeek}.</p>
      </form>

      {error ? <p className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{error}</p> : null}

      <section className="space-y-3" aria-labelledby="funnel-channel-heading">
        <div>
          <h2 id="funnel-channel-heading" className="text-xl font-semibold">
            By channel and page
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Unmute and complete are per play; interactive is per visit. Devices add up weekly uniques.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="p-2 text-left font-medium">Channel</th>
                <th className="p-2 text-left font-medium">Page</th>
                {FUNNEL_HEAD.map((h) => (
                  <th key={h} className={TH}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {byChannelPage.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-6 text-center text-muted-foreground">
                    No guide visits in this range yet.
                  </td>
                </tr>
              ) : (
                byChannelPage.map((row) => (
                  <tr key={`${row.channel}:${row.page}`}>
                    <td className="p-2 font-mono text-xs">{row.channel}</td>
                    <td className="p-2">{row.page}</td>
                    <FunnelCells totals={row.totals} />
                  </tr>
                ))
              )}
            </tbody>
            {byChannelPage.length > 0 ? (
              <tfoot className="border-t bg-muted/20 font-medium">
                <tr>
                  <td className="p-2" colSpan={2}>
                    Total
                  </td>
                  <FunnelCells totals={totals} />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>

      <GuidePagesTable rows={guidePages} />

      <section className="space-y-3" aria-labelledby="funnel-reel-heading">
        <div>
          <h2 id="funnel-reel-heading" className="text-xl font-semibold">
            By reel
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Reach and saves come from the latest insights snapshot. DM to visit counts ig-comment-dm visits per distinct commenter.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="p-2 text-left font-medium">Reel</th>
                <th className={TH}>Reach</th>
                <th className={TH}>Avg watch</th>
                <th className={TH}>Commenters</th>
                <th className={TH}>Per 1k reach</th>
                <th className={TH}>Sends + saves / reach</th>
                <th className={TH}>DMs sent</th>
                <th className={TH}>Failed</th>
                <th className={TH}>DM visits</th>
                <th className={TH}>DM to visit</th>
                <th className={TH}>All visits</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reels.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-6 text-center text-muted-foreground">
                    No reels mapped yet. <Link href="/admin/radar/reels" className="underline">Map reels</Link>.
                  </td>
                </tr>
              ) : (
                reels.map((row) => (
                  <tr key={row.reel.id}>
                    <td className="p-2">
                      <span className="block font-mono text-xs">{row.utmContent}</span>
                      <span className="text-xs text-muted-foreground">
                        {row.reel.angle ?? "no angle"}
                        {row.reel.is_trial ? " · trial" : ""}
                      </span>
                    </td>
                    <td className={TD}>
                      <Num value={row.reach} />
                    </td>
                    <td className={TD}>{row.avgWatchS === null ? "-" : `${row.avgWatchS.toFixed(1)}s`}</td>
                    <td className={TD}>{row.commenters}</td>
                    <td className={TD}>{row.commentersPer1k === null ? "-" : row.commentersPer1k.toFixed(1)}</td>
                    <td className={TD}>{formatPct(row.sendsSavesPerReach, 1)}</td>
                    <td className={TD}>{row.sent}</td>
                    <td className={cn(TD, row.failed > 0 && "text-destructive")}>{row.failed}</td>
                    <td className={TD}>{row.dmVisits}</td>
                    <td className={TD}>{formatPct(row.dmToVisit)}</td>
                    <td className={TD}>{row.visits}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="funnel-links-heading">
        <div>
          <h2 id="funnel-links-heading" className="text-xl font-semibold">
            Link clicks against visits
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A big gap means the page did not load or record in the in-app browser.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="p-2 text-left font-medium">Code</th>
                <th className={TH}>Clicks</th>
                <th className={TH}>Visits</th>
                <th className={TH}>Visits / click</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {links.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-muted-foreground">
                    No link clicks in this range.
                  </td>
                </tr>
              ) : (
                links.map((link) => (
                  <tr key={link.code}>
                    <td className="p-2">
                      <span className="block font-mono text-xs">/r/{link.code}</span>
                      {link.pageKey ? <span className="text-xs text-muted-foreground">{link.pageKey}</span> : null}
                    </td>
                    <td className={TD}>{link.clicks}</td>
                    <td className={TD}>
                      <Num value={link.visits} />
                    </td>
                    <td className={TD}>
                      {link.visits === null || link.clicks === 0 ? "-" : formatPct(link.visits / link.clicks)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const TARGET_LABEL: Record<keyof typeof GUIDE_PAGE_TARGETS, string> = {
  reachPct: `reach under ${formatPct(GUIDE_PAGE_TARGETS.reachPct)}`,
  playPct: `play under ${formatPct(GUIDE_PAGE_TARGETS.playPct)}`,
  skipPct: `skip over ${formatPct(GUIDE_PAGE_TARGETS.skipPct)}`,
  clipCompletePct: `clip complete under ${formatPct(GUIDE_PAGE_TARGETS.clipCompletePct)}`,
};

function Pct({ value, flagged }: { value: number | null; flagged: boolean }) {
  return <span className={cn(flagged && "font-semibold text-destructive")}>{formatPct(value)}</span>;
}

/** One row per code guide page (level), in level order, with drop-off and skip rate. */
function GuidePagesTable({ rows }: { rows: GuidePageFunnelRow[] }) {
  return (
    <section className="space-y-3" aria-labelledby="funnel-pages-heading">
      <div>
        <h2 id="funnel-pages-heading" className="text-xl font-semibold">
          By guide page
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Reach is viewers per viewer of the first page. Play is viewers who tapped a game; skip is &quot;ข้ามเกม ดูเฉลย&quot;
          taps per player. Red marks a page below its pilot target.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="p-2 text-left font-medium">Page</th>
              <th className={TH}>Viewers</th>
              <th className={TH}>Reach</th>
              <th className={TH}>Play</th>
              <th className={TH}>Skip</th>
              <th className={TH}>Clip plays</th>
              <th className={TH}>Clip complete</th>
              <th className={TH}>Shares</th>
              <th className={TH}>CTAs</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-muted-foreground">
                  No code guide pages in this range.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const flagged = new Set(row.belowTarget);
                return (
                  <tr key={`${row.slug}:${row.pageKey}`} title={row.belowTarget.map((k) => TARGET_LABEL[k]).join(", ")}>
                    <td className="p-2">
                      <span className="block">{adminPageLabel(row.slug, row.pageKey)}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {row.slug}/{row.pageKey}
                      </span>
                    </td>
                    <td className={TD}>{row.viewers.toLocaleString()}</td>
                    <td className={TD}>
                      <Pct value={row.reachPct} flagged={flagged.has("reachPct")} />
                    </td>
                    <td className={TD}>
                      <Pct value={row.playPct} flagged={flagged.has("playPct")} />
                    </td>
                    <td className={TD}>
                      <Pct value={row.skipPct} flagged={flagged.has("skipPct")} />
                    </td>
                    <td className={TD}>{row.clipPlays.toLocaleString()}</td>
                    <td className={TD}>
                      <Pct value={row.clipCompletePct} flagged={flagged.has("clipCompletePct")} />
                    </td>
                    <td className={TD}>{row.shares.toLocaleString()}</td>
                    <td className={TD}>{row.ctas.toLocaleString()}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
