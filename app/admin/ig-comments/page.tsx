import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ADMIN_COMMENTS_DEFAULT_LIMIT,
  countCommentsForAdmin,
  getCommentsForAdmin,
  getCommentsMissedByDm,
} from "@/lib/supabase/ig-comments";
import {
  getDefaultCommentDmMessage,
  getDefaultPublicCommentReply,
} from "@/lib/dm-leads/delivery-status";
import { getCampaign } from "@/lib/meta/comment-intent";
import { daysSince, formatBangkokDateTime } from "@/lib/admin/queue-tools/format";
import {
  igCommentsHref,
  igDmWindow,
  insidePrivateReplyWindow,
  IG_REPLY_FILTERS,
  IG_STAGE_FILTERS,
  parseIgCommentsView,
  type IgCommentsView,
  type IgReplyFilter,
  type IgStageFilter,
} from "@/lib/admin/queue-tools/ig-comments";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { IgCommentReplyRow } from "@/components/admin/IgCommentReplyRow";
import { LeadTagBadges } from "@/components/admin/LeadTagBadges";
import { MissedCommentsCard } from "@/components/admin/MissedCommentsCard";
import { RefreshButton } from "@/components/admin/RefreshButton";
import { FilterLinks } from "@/components/admin/queue-tools/FilterLinks";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/shared/AdminStates";
import type { DmLeadStage } from "@/types/dm-leads";

export const dynamic = "force-dynamic";

/**
 * 60 is the ceiling this Vercel plan allows, so the batch is sized to finish
 * well inside it rather than the budget being sized to the batch. The client
 * card chains runs back to back to work through a queue larger than one pass.
 */
export const maxDuration = 60;

const STAGE_LABEL: Record<DmLeadStage, string> = {
  unknown: "Unknown",
  exploring: "Exploring",
  building: "Building",
  job_seeking: "Job seeking",
};

const STAGE_FILTER_LABEL: Record<IgStageFilter, string> = { all: "All stages", ...STAGE_LABEL };

const REPLY_FILTER_LABEL: Record<IgReplyFilter, string> = {
  all: "All comments",
  unreplied: "Unreplied",
  missed: "No DM yet, last 7 days",
};

const EMPTY_TITLE: Record<IgReplyFilter, string> = {
  all: "No comments yet",
  unreplied: "Every comment here has a reply",
  missed: "No keyword comments are waiting for a DM",
};

const PAGE_SIZE = ADMIN_COMMENTS_DEFAULT_LIMIT;
const PAGER_LINK = "min-h-11 lg:[@media(pointer:fine)]:min-h-9";

/** "Comments 301 to 600 of 1,234" with Newer and Older links. Server-rendered. */
function CommentPager({
  view,
  totalPages,
  total,
  shown,
}: {
  view: IgCommentsView;
  totalPages: number;
  total: number;
  shown: number;
}) {
  const first = (view.page - 1) * PAGE_SIZE + 1;
  const last = first + shown - 1;
  const step = (page: number, label: string, enabled: boolean) =>
    enabled ? (
      <Button asChild variant="outline" size="sm" className={PAGER_LINK}>
        <Link href={igCommentsHref({ ...view, page })} scroll={false}>
          {label}
        </Link>
      </Button>
    ) : (
      <Button variant="outline" size="sm" className={PAGER_LINK} disabled>
        {label}
      </Button>
    );
  return (
    <nav aria-label="Comment pages" className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm tabular-nums text-muted-foreground">
        Comments {first.toLocaleString("en-US")} to {last.toLocaleString("en-US")} of{" "}
        {total.toLocaleString("en-US")}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          {step(view.page - 1, "Newer", view.page > 1)}
          {step(view.page + 1, "Older", view.page < totalPages)}
        </div>
      )}
    </nav>
  );
}

export default async function IgCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; filter?: string; page?: string }>;
}) {
  // The admin layout also checks, but this page reads with the service-role client.
  await requireAdmin();
  const view = parseIgCommentsView(await searchParams);
  const stage = view.stage === "all" ? undefined : view.stage;
  // The all and unreplied lists are paged in SQL; the missed list is short and never paged.
  const paged = view.filter !== "missed";
  const [listed, stageCount, unrepliedCount, missedComments, neverContacted] = await Promise.all([
    // ?filter=unreplied runs in SQL, so the newest unreplied comments are never
    // pushed out of the capped list by replied ones. ?filter=missed is cut
    // from the missed-by-DM list below instead.
    view.filter === "missed"
      ? Promise.resolve([])
      : getCommentsForAdmin({
          stage,
          unrepliedOnly: view.filter === "unreplied",
          limit: PAGE_SIZE,
          offset: (view.page - 1) * PAGE_SIZE,
        }),
    countCommentsForAdmin({ stage }),
    countCommentsForAdmin({ stage, unrepliedOnly: true }),
    // Same 30-day window as the bulk-reply action, so the card lists exactly
    // what the button would send to.
    getCommentsMissedByDm(30),
    // The subset no outbound message has ever gone to, so the card can offer
    // "skip anyone already messaged" without a second round trip.
    getCommentsMissedByDm(30, undefined, true),
  ]);
  const now = Date.now();
  // The overview's "IG comments to answer" queue: getCommentsMissedByDm(7).
  const missedInWindow = insidePrivateReplyWindow(missedComments, now).filter(
    (c) => !stage || c.stage === stage,
  );
  const comments = view.filter === "missed" ? missedInWindow : listed;
  const filterCounts: Record<IgReplyFilter, number> = {
    all: stageCount,
    unreplied: unrepliedCount,
    missed: missedInWindow.length,
  };
  const matchingCount = filterCounts[view.filter];
  const totalPages = paged ? Math.max(1, Math.ceil(matchingCount / PAGE_SIZE)) : 1;
  const pastTheEnd = paged && comments.length === 0 && view.page > 1 && matchingCount > 0;
  const neverContactedIds = new Set(neverContacted.map((c) => c.id));
  const shiftDmMessage = getDefaultCommentDmMessage("shift");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Inbox"
        title="IG comments"
        description="Comments on posts, auto-labelled by stage. A private reply (DM) only works within 7 days of the comment. After that, only a public reply is possible."
        actions={<RefreshButton />}
      />

      <div className="space-y-2">
        <FilterLinks
          label="Reply status"
          items={IG_REPLY_FILTERS.map((filter) => ({
            key: filter,
            label: REPLY_FILTER_LABEL[filter],
            href: igCommentsHref({ ...view, filter, page: 1 }),
            active: view.filter === filter,
            count: filterCounts[filter],
          }))}
        />
        <FilterLinks
          label="Stage"
          items={IG_STAGE_FILTERS.map((stage) => ({
            key: stage,
            label: STAGE_FILTER_LABEL[stage],
            href: igCommentsHref({ ...view, stage, page: 1 }),
            active: view.stage === stage,
          }))}
        />
      </div>

      <MissedCommentsCard
        comments={missedComments.map((c) => ({
          id: c.id,
          username: c.username,
          text: c.text,
          commented_at: c.commented_at,
          campaign: getCampaign(c.text),
          neverContacted: neverContactedIds.has(c.id),
        }))}
        defaultPublicMessage={getDefaultPublicCommentReply("username")}
        defaultDmMessage={getDefaultCommentDmMessage()}
        shiftPublicMessage={getDefaultPublicCommentReply("username", "shift")}
        shiftDmMessage={shiftDmMessage}
      />

      {pastTheEnd ? (
        <AdminEmptyState
          title={`Page ${view.page} is past the end`}
          description={`${matchingCount.toLocaleString("en-US")} comments match, ${totalPages.toLocaleString("en-US")} pages in all.`}
          action={
            <Button asChild variant="outline" size="sm" className={PAGER_LINK}>
              <Link href={igCommentsHref({ ...view, page: totalPages })} scroll={false}>
                Go to the last page
              </Link>
            </Button>
          }
        />
      ) : comments.length === 0 ? (
        <AdminEmptyState
          title={EMPTY_TITLE[view.filter]}
          description={
            view.stage !== "all" ? `Showing the ${STAGE_LABEL[view.stage]} stage only.` : undefined
          }
        />
      ) : (
        <Card>
          <CardContent className="space-y-3 pt-6">
            {paged && totalPages > 1 ? (
              <CommentPager
                view={view}
                totalPages={totalPages}
                total={matchingCount}
                shown={comments.length}
              />
            ) : null}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Commented</TableHead>
                  <TableHead>DM window</TableHead>
                  <TableHead className="w-[360px]">Reply</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comments.map((c) => {
                  const dmWindow = igDmWindow(c.replied_at, daysSince(c.commented_at, now));
                  const isShift = getCampaign(c.text) === "shift";
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.username ?? c.ig_user_id ?? "-"}</TableCell>
                      <TableCell className="max-w-[240px] truncate">{c.text}</TableCell>
                      <TableCell>{c.grade_level ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{STAGE_LABEL[c.stage]}</Badge>
                      </TableCell>
                      <TableCell>
                        <LeadTagBadges tags={c} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatBangkokDateTime(c.commented_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {dmWindow.state === "replied"
                            ? "Replied"
                            : dmWindow.state === "open"
                              ? `${dmWindow.daysLeft}d left`
                              : "Closed"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <IgCommentReplyRow
                          commentId={c.id}
                          defaultPrivateMessage={isShift ? shiftDmMessage : undefined}
                          defaultPublicMessage={
                            isShift ? getDefaultPublicCommentReply(c.username, "shift") : undefined
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {paged && totalPages > 1 ? (
              <CommentPager
                view={view}
                totalPages={totalPages}
                total={matchingCount}
                shown={comments.length}
              />
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
