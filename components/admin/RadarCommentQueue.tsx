"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { runBulkReply, type BulkRunResult } from "@/app/admin/ig-comments/actions";
import { refreshAdminCounts } from "@/components/admin/console/live-counts";
import { RadarSendButton, type RadarRowInfo } from "@/components/admin/IgCommentReplyRow";

export interface RadarQueueRow {
  id: string;
  username: string | null;
  text: string;
  commented_at: string;
  /** Keyword or explicit request: the bulk send may take it. */
  autoSendable: boolean;
  info: RadarRowInfo;
}

type RadarTab = "pending" | "review" | "done";

const TAB_LABEL: Record<RadarTab, string> = {
  pending: "To send",
  review: "Needs review",
  done: "Sent or skipped",
};

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function tabOf(row: RadarQueueRow): RadarTab {
  const open = row.info.status === null || row.info.status === "failed";
  if (!open || !row.info.canSend) return "done";
  return row.autoSendable ? "pending" : "review";
}

/**
 * The admin Radar queue (spec 5.5). Radar comments never use the generic
 * missed-DM copy: every send here is the fixed Radar DM and public reply,
 * through the claim RPC. With RADAR_COMMENT_DM_AUTO on, this is only the retry
 * path for failed sends and the review path for vaguer comments.
 */
export function RadarCommentQueue({
  rows,
  autoOn,
  loadError,
}: {
  rows: RadarQueueRow[];
  autoOn: boolean;
  loadError?: string | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<RadarTab>("pending");
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BulkRunResult | null>(null);

  const byTab = useMemo(() => {
    const groups: Record<RadarTab, RadarQueueRow[]> = { pending: [], review: [], done: [] };
    for (const row of rows) groups[tabOf(row)].push(row);
    return groups;
  }, [rows]);

  if (loadError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Radar comments</CardTitle>
          <CardDescription>{loadError}</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  if (rows.length === 0) return null;

  const visible = byTab[tab];

  const runPending = async () => {
    setConfirming(false);
    setRunning(true);
    try {
      const pass = await runBulkReply({ mode: "both", campaign: "radar" });
      setResult(pass);
    } catch (error) {
      setResult({
        sent: 0,
        failed: 0,
        skipped: byTab.pending.length,
        errors: [error instanceof Error ? error.message : "The run did not return"],
        sentTo: [],
        unreachable: 0,
        privacyBlocked: 0,
        dmsDelivered: 0,
        publicReplies: 0,
        dryRun: false,
        crashed: true,
      });
    } finally {
      setRunning(false);
      router.refresh();
      refreshAdminCounts();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Radar comments: {byTab.pending.length + byTab.review.length} open</CardTitle>
        <CardDescription>
          RADAR keyword comments and link requests on mapped reels, last 7 days. Every send is the
          fixed Radar DM plus one public reply, never custom or rewritten copy. Auto-send is{" "}
          {autoOn ? "on" : "off"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TAB_LABEL) as RadarTab[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              disabled={running}
              className={`min-h-11 rounded-full border px-3 py-1 text-sm transition-colors disabled:opacity-50 lg:min-h-0 ${
                tab === key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {TAB_LABEL[key]} ({byTab[key].length})
            </button>
          ))}
        </div>

        <ul className="max-h-96 divide-y overflow-y-auto rounded-md border text-sm">
          {visible.map((row) => (
            <li key={row.id} className="space-y-1 px-3 py-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="shrink-0 font-medium">{row.username ?? "-"}</span>
                <span className="flex-1 truncate text-muted-foreground">{row.text}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{daysAgo(row.commented_at)}d ago</span>
              </div>
              <RadarSendButton commentId={row.id} info={row.info} />
            </li>
          ))}
          {visible.length === 0 && (
            <li className="px-3 py-4 text-center text-muted-foreground">Nothing here.</li>
          )}
        </ul>

        {result && (
          <p className="text-sm text-muted-foreground">
            {result.dmsDelivered} DMs sent, {result.publicReplies} public replies,{" "}
            {result.privacyBlocked} refused by privacy settings, {result.failed} failed,{" "}
            {result.skipped} still queued.
            {result.errors.length > 0 && ` ${result.errors.slice(0, 3).join("; ")}`}
          </p>
        )}

        {tab === "pending" && byTab.pending.length > 0 && (
          <div className="flex items-center gap-2">
            {confirming ? (
              <>
                <Button onClick={runPending} disabled={running}>
                  Confirm: send the Radar DM to {Math.min(byTab.pending.length, 15)}
                </Button>
                <Button variant="outline" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={() => setConfirming(true)} disabled={running}>
                {running ? "Sending…" : `Send the next ${Math.min(byTab.pending.length, 15)}`}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
