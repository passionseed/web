import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { MarketingStatGrid } from "@/components/admin/meta-marketing/MarketingStatGrid";
import { MarketingSyncStatus } from "@/components/admin/meta-marketing/MarketingSyncStatus";
import {
  AdsTable,
  SourceSeatsTable,
  TopPostsTable,
} from "@/components/admin/meta-marketing/MarketingTables";
import { adminMetadata } from "@/lib/admin/metadata";
import { addDays, bangkokDay } from "@/lib/meta/marketing/dates";
import { formatCount, formatMoney } from "@/lib/meta/marketing/format";
import { buildMarketingReport, type MarketingReport } from "@/lib/meta/marketing/report";
import { getMarketingReportInput } from "@/lib/supabase/meta-marketing-report";

export const dynamic = "force-dynamic";
export const metadata = adminMetadata("/admin/marketing");

const RANGE_DAYS = 30;

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border p-4" aria-label={title}>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export default async function MarketingPage() {
  const until = addDays(bangkokDay(), -1);
  const since = addDays(until, -(RANGE_DAYS - 1));

  let report: MarketingReport | null = null;
  try {
    report = buildMarketingReport(await getMarketingReportInput(since, until));
  } catch (error) {
    console.error("[admin marketing] report failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Insights"
        title="Meta marketing"
        description={`Instagram and Meta Ads, ${since} to ${until} (Bangkok). Synced read-only every morning.`}
      />

      {!report ? (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          Could not load marketing data. Check that the meta_marketing_sync migration is applied.
        </p>
      ) : (
        <>
          <MarketingSyncStatus runs={report.latestRuns} />

          <Section title="Instagram" description={`${report.instagram.days} of ${RANGE_DAYS} days synced. Reach is summed per day, so one person can count more than once.`}>
            <MarketingStatGrid
              label="Instagram totals"
              stats={[
                { label: "Reach", value: formatCount(report.instagram.reach) },
                { label: "Views", value: formatCount(report.instagram.views) },
                { label: "Profile visits", value: formatCount(report.instagram.profileViews) },
                { label: "Link taps", value: formatCount(report.instagram.websiteClicks) },
                {
                  label: "New follows",
                  value: formatCount(report.instagram.follows),
                  note: `${formatCount(report.instagram.unfollows)} unfollows`,
                },
                { label: "Followers now", value: formatCount(report.instagram.followers) },
              ]}
            />
          </Section>

          <Section title="Top posts" description="Posts and Reels published in this range, by lifetime reach as of the latest sync.">
            <TopPostsTable posts={report.topPosts} />
          </Section>

          <Section title="Meta Ads">
            <MarketingStatGrid
              label="Ads totals"
              stats={[
                { label: "Spend", value: formatMoney(report.adsTotals.spend, report.adsTotals.currency) },
                { label: "Impressions", value: formatCount(report.adsTotals.impressions) },
                { label: "Link clicks", value: formatCount(report.adsTotals.linkClicks) },
                { label: "Leads (pixel)", value: formatCount(report.adsTotals.leads) },
              ]}
            />
            <AdsTable rows={report.campaigns} currency={report.adsTotals.currency} />
          </Section>

          <Section title="Ads" description="Each ad with the utm_source its link carries.">
            <AdsTable rows={report.ads} currency={report.adsTotals.currency} showUtm />
          </Section>

          <Section
            title="SHIFT seats by source"
            description="Applications created in this range, joined to ad spend on utm_source. Applications record utm_source only, so ads that share a source share its seats."
          >
            <SourceSeatsTable sources={report.sources} currency={report.adsTotals.currency} />
          </Section>
        </>
      )}
    </div>
  );
}
