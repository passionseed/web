import Link from "next/link";
import { BucketPills } from "@/components/admin/BucketPills";
import { DmLeadFilters as DmLeadFilterBar } from "@/components/admin/DmLeadFilters";
import { DmLeadsInbox } from "@/components/admin/DmLeadsInbox";
import { PirateFunnel } from "@/components/admin/PirateFunnel";
import { RefreshButton } from "@/components/admin/RefreshButton";
import { ScoreboardStrip } from "@/components/admin/ScoreboardStrip";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { parseDmLeadView, type DmLeadRawParams } from "@/lib/admin/queue-tools/dm-leads";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import {
  getConversationsForAdmin,
  getDmLeadFacets,
  getDmLeadSignals,
} from "@/lib/supabase/dm-leads";
import { getPirateFunnel } from "@/lib/supabase/pirate-funnel";

export const dynamic = "force-dynamic";

export default async function DmLeadsPage({
  searchParams,
}: {
  searchParams: Promise<DmLeadRawParams>;
}) {
  // The admin layout also checks, but this page reads with the service-role client.
  await requireAdmin();
  const rawParams = await searchParams;
  // status=open arrives as filters.openOnly and is applied in SQL, so the
  // list and the facet counts agree.
  const { filters: parsedFilters, bar } = parseDmLeadView(rawParams);
  // ?origin=radar shows only threads opened by a Career Radar DM. They are
  // excluded from every other view, bucket and score (spec 5.6), and the
  // server refuses anything but the fixed Radar templates to them.
  const radarOnly = (rawParams as Record<string, unknown>).origin === "radar";
  const filters = radarOnly ? { ...parsedFilters, origin: "radar" as const } : parsedFilters;
  // One scan of dm_messages, shared by the list and the facets.
  const signals = await getDmLeadSignals();
  const [conversations, facets, funnel] = await Promise.all([
    getConversationsForAdmin(filters, signals),
    getDmLeadFacets(filters, signals),
    getPirateFunnel(),
  ]);

  return (
    <div className="space-y-3">
      <AdminPageHeader
        eyebrow="Inbox"
        title="DM leads"
        description="เรียงตามลำดับงานจาก reply playbook: ทำจากซ้ายไปขวา"
        actions={<RefreshButton />}
      />

      <p className="text-sm text-muted-foreground">
        {radarOnly ? (
          <>
            Showing Career Radar threads only. These students asked for a Radar link and are not
            leads: they are read-only here, and only the fixed Radar replies can be sent.{" "}
            <Link href="/admin/dm-leads" className="underline underline-offset-2">
              Back to leads
            </Link>
          </>
        ) : (
          <Link href="/admin/dm-leads?origin=radar" className="underline underline-offset-2">
            Career Radar threads (read-only)
          </Link>
        )}
      </p>

      <ScoreboardStrip scoreboard={facets.scoreboard} />

      <PirateFunnel funnel={funnel} />

      <BucketPills
        activeBucket={filters.bucket}
        bucketCounts={facets.bucketCounts}
        total={facets.total}
      />

      <DmLeadFilterBar
        values={bar}
        chipCounts={{
          needsReply: facets.needsReply,
          pathlabSent: facets.pathlabSent,
          starred: facets.starred,
          followUpDue: facets.followUpDue,
        }}
        stageCounts={facets.stageCounts}
        statusCounts={facets.leadStatusCounts}
        tagCounts={facets.tagCounts}
      />

      <DmLeadsInbox conversations={conversations} />
    </div>
  );
}
