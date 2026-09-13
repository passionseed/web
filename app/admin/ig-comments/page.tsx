import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCommentsForAdmin, getCommentsMissedByDm } from "@/lib/supabase/ig-comments";
import {
  getDefaultCommentDmMessage,
  getDefaultPublicCommentReply,
} from "@/lib/dm-leads/delivery-status";
import { getCampaign } from "@/lib/meta/comment-intent";
import { IgCommentReplyRow } from "@/components/admin/IgCommentReplyRow";
import { LeadTagBadges } from "@/components/admin/LeadTagBadges";
import { MissedCommentsCard } from "@/components/admin/MissedCommentsCard";
import { RefreshButton } from "@/components/admin/RefreshButton";
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export default async function IgCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  const { stage } = await searchParams;
  const [comments, missedComments] = await Promise.all([
    getCommentsForAdmin(stage && stage !== "all" ? stage : undefined),
    // Same 30-day window as the bulk-reply action, so the card lists exactly
    // what the button would send to.
    getCommentsMissedByDm(30),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">IG Comments</h2>
          <p className="text-sm text-muted-foreground">
            Comments on posts, auto-labeled by stage. Private reply (DM) only works within 7
            days of the comment — after that, only a public reply is possible.
          </p>
        </div>
        <RefreshButton />
      </div>

      <div className="flex gap-2">
        {(["all", "unknown", "exploring", "building", "job_seeking"] as const).map((s) => (
          <Link
            key={s}
            href={s === "all" ? "/admin/ig-comments" : `/admin/ig-comments?stage=${s}`}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {s === "all" ? "All" : STAGE_LABEL[s]}
          </Link>
        ))}
      </div>

      <MissedCommentsCard
        comments={missedComments.map((c) => ({
          id: c.id,
          username: c.username,
          text: c.text,
          commented_at: c.commented_at,
          campaign: getCampaign(c.text),
        }))}
        defaultPublicMessage={getDefaultPublicCommentReply("username")}
        defaultDmMessage={getDefaultCommentDmMessage()}
      />

      <Card>
        <CardContent className="pt-6">
          {comments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No comments yet.</p>
          ) : (
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
                  const age = daysAgo(c.commented_at);
                  const dmOpen = age <= 7;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.username ?? c.ig_user_id ?? "—"}</TableCell>
                      <TableCell className="max-w-[240px] truncate">{c.text}</TableCell>
                      <TableCell>{c.grade_level ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{STAGE_LABEL[c.stage]}</Badge>
                      </TableCell>
                      <TableCell>
                        <LeadTagBadges tags={c} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(c.commented_at)}
                      </TableCell>
                      <TableCell>
                        {c.replied_at ? (
                          <Badge variant="outline">Replied</Badge>
                        ) : dmOpen ? (
                          <Badge variant="outline">{7 - age}d left</Badge>
                        ) : (
                          <Badge variant="outline">Closed</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <IgCommentReplyRow commentId={c.id} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
