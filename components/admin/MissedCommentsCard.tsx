"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  runBulkReply,
  type BulkReplyMode,
  type BulkRunResult,
} from "@/app/admin/ig-comments/actions";
import { BULK_REPLY_BATCH_CAP } from "@/app/admin/ig-comments/constants";
import type { CampaignKey } from "@/lib/meta/comment-intent";

export interface MissedCommentItem {
  id: string;
  username: string | null;
  text: string;
  commented_at: string;
  campaign: CampaignKey | null;
  /** True when no message has ever gone out to this commenter. */
  neverContacted: boolean;
}

type TabKey = "all" | CampaignKey;

const MODE_LABEL: Record<BulkReplyMode, string> = {
  public: "Public reply only",
  private: "DM only (private reply)",
  both: "DM and public reply",
};

const MODE_HINT: Record<BulkReplyMode, string> = {
  public: "Visible under the comment. No 7-day limit, so it reaches older comments too.",
  private: "A real DM. Only possible within 7 days, and only once per comment, ever.",
  both: "Everyone gets both: a DM, and a public reply under their comment. Anyone whose privacy settings refuse the DM still gets the public reply.",
};

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export function MissedCommentsCard({
  comments,
  defaultPublicMessage,
  defaultDmMessage,
}: {
  comments: MissedCommentItem[];
  /** Default public reply copy, rendered with a sample @mention. */
  defaultPublicMessage: string;
  /** Default DM copy. */
  defaultDmMessage: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("all");
  const [mode, setMode] = useState<BulkReplyMode>("both");
  const [dmMessage, setDmMessage] = useState("");
  const [publicMessage, setPublicMessage] = useState("");
  /**
   * Defaults on: the common task is reaching people the live automation never
   * got to, and the expensive mistake is messaging someone a second time.
   */
  const [onlyNeverContacted, setOnlyNeverContacted] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<BulkRunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState(0);
  /**
   * Read inside the loop between passes, so Stop takes effect after the run in
   * flight rather than abandoning replies mid-batch. State alone would be stale
   * inside the closure.
   */
  const stopRequested = useRef(false);

  const counts = useMemo(() => {
    const pool = onlyNeverContacted ? comments.filter((c) => c.neverContacted) : comments;
    const uni = pool.filter((c) => c.campaign === "uni").length;
    return { all: pool.length, uni, port: pool.length - uni };
  }, [comments, onlyNeverContacted]);

  /**
   * A DM is only possible inside 7 days, so a private or "both" run works from
   * a smaller pool than a public-only sweep. Showing the public count while a
   * DM mode is selected would promise sends that cannot happen.
   */
  const visible = useMemo(() => {
    let rows = tab === "all" ? comments : comments.filter((c) => c.campaign === tab);
    if (onlyNeverContacted) rows = rows.filter((c) => c.neverContacted);
    return mode === "public" ? rows : rows.filter((c) => daysAgo(c.commented_at) <= 7);
  }, [comments, tab, mode, onlyNeverContacted]);

  const alreadyMessaged = useMemo(() => {
    const byTab = tab === "all" ? comments : comments.filter((c) => c.campaign === tab);
    const inWindow = mode === "public" ? byTab : byTab.filter((c) => daysAgo(c.commented_at) <= 7);
    return inWindow.filter((c) => !c.neverContacted).length;
  }, [comments, tab, mode]);

  if (comments.length === 0) return null;

  const batchSize = Math.min(visible.length, BULK_REPLY_BATCH_CAP);
  const campaign = tab === "all" ? undefined : tab;

  /**
   * One pass is capped so it finishes inside the platform's 60s function limit,
   * so a queue larger than the cap needs several passes. Chaining them here
   * keeps every request short while still draining the queue in one click.
   *
   * The loop trusts `skipped`, the count the action could not reach this pass,
   * rather than a local guess at what is left.
   */
  const MAX_PASSES = 60;

  const run = async (dryRun: boolean) => {
    setRunning(true);
    setConfirming(false);
    stopRequested.current = false;
    const totals: BulkRunResult = {
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      sentTo: [],
      unreachable: 0,
      privacyBlocked: 0,
      dmsDelivered: 0,
      publicReplies: 0,
      dryRun,
    };
    let passes = 0;

    try {
      for (;;) {
        const pass = await runBulkReply({
          mode,
          campaign,
          dmMessage: dmMessage.trim() || undefined,
          publicMessage: publicMessage.trim() || undefined,
          onlyNeverContacted,
          dryRun,
        });
        passes += 1;
        totals.sent += pass.sent;
        totals.failed += pass.failed;
        totals.skipped = pass.skipped;
        totals.errors.push(...pass.errors);
        totals.sentTo.push(...pass.sentTo);
        totals.unreachable += pass.unreachable;
        totals.privacyBlocked += pass.privacyBlocked;
        totals.dmsDelivered += pass.dmsDelivered;
        totals.publicReplies += pass.publicReplies;
        setResult({ ...totals, errors: [...totals.errors], sentTo: [...totals.sentTo] });
        setRuns(passes);

        // A dry run never marks anything replied, so the queue cannot shrink
        // and a second pass would return the same people forever.
        if (dryRun) break;
        // Every send failed identically: retrying would burn through the whole
        // queue against the same broken call.
        if (pass.systemicFailure) {
          totals.systemicFailure = true;
          setResult({ ...totals, errors: [...totals.errors], sentTo: [...totals.sentTo] });
          break;
        }
        if (pass.skipped === 0 || pass.sent === 0 || stopRequested.current) break;
        if (passes >= MAX_PASSES) break;
      }
    } finally {
      setRunning(false);
      if (!dryRun) router.refresh();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Missed by DM — {counts.all} unreplied</CardTitle>
        <CardDescription>
          Commenters who asked for something and never got a reply. Pick a campaign, choose how
          to reach them, and edit the message if you want. Sends {batchSize} at a time until the
          queue is empty.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Campaign tabs */}
        <div className="flex gap-2">
          {(["all", "uni", "port"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              disabled={running}
              className={`rounded-full border px-3 py-1 text-sm transition-colors disabled:opacity-50 ${
                tab === key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {key === "all" ? "All" : key} ({counts[key]})
            </button>
          ))}
        </div>

        {/* Audience */}
        <label className="flex items-start gap-2 rounded-md border p-3 text-sm">
          <input
            type="checkbox"
            checked={onlyNeverContacted}
            onChange={(e) => setOnlyNeverContacted(e.target.checked)}
            disabled={running}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium">Only people never messaged before</span>
            <span className="block text-xs text-muted-foreground">
              {onlyNeverContacted
                ? `Skipping ${alreadyMessaged} who already received a message. Uncheck to include them.`
                : `Includes ${alreadyMessaged} who were already messaged and never answered, so they would hear from us twice.`}
            </span>
          </span>
        </label>

        {/* Channel */}
        <div className="space-y-2">
          <p className="text-sm font-medium">How to reply</p>
          <div className="flex flex-wrap gap-2">
            {(["both", "private", "public"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                disabled={running}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-50 ${
                  mode === m
                    ? "border-foreground bg-muted"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{MODE_HINT[mode]}</p>
        </div>

        {/* Message, one box per channel this run will use. */}
        <div className="grid gap-4 sm:grid-cols-2">
          {(mode === "private" || mode === "both") && (
            <div className="space-y-2">
              <p className="text-sm font-medium">DM message</p>
              <Textarea
                value={dmMessage}
                onChange={(e) => setDmMessage(e.target.value)}
                placeholder={defaultDmMessage}
                rows={6}
                disabled={running}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {dmMessage.trim() ? "Sent exactly as written." : "Empty: uses the default, personalized."}
              </p>
            </div>
          )}

          {(mode === "public" || mode === "both") && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Public reply</p>
              <Textarea
                value={publicMessage}
                onChange={(e) => setPublicMessage(e.target.value)}
                placeholder={defaultPublicMessage}
                rows={6}
                disabled={running}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {publicMessage.trim()
                  ? "Sent exactly as written."
                  : "Empty: uses the default, personalized and @mentioning them."}
              </p>
            </div>
          )}
        </div>

        <ul className="max-h-60 divide-y overflow-y-auto rounded-md border text-sm">
          {visible.map((comment) => (
            <li key={comment.id} className="flex items-baseline justify-between gap-3 px-3 py-2">
              <span className="shrink-0 font-medium">{comment.username ?? "—"}</span>
              <span className="flex-1 truncate text-muted-foreground">{comment.text}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {daysAgo(comment.commented_at)}d ago
              </span>
            </li>
          ))}
          {visible.length === 0 && (
            <li className="px-3 py-4 text-center text-muted-foreground">
              Nothing in this campaign can be reached with that option.
            </li>
          )}
        </ul>

        {result?.systemicFailure && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <span className="font-medium">Every send failed the same way.</span> That points at the
            access token, a permission, or the endpoint rather than the comments themselves.
            Nothing was retired, so the queue is intact once the cause is fixed.
          </p>
        )}

        {result && (
          <p className="text-sm">
            {result.dryRun ? "Preview: would contact" : "Reached"} {result.sent}
            {!result.dryRun && result.dmsDelivered > 0 && ` · ${result.dmsDelivered} DM`}
            {!result.dryRun && result.publicReplies > 0 && ` · ${result.publicReplies} public`}
            {!result.dryRun && `, failed ${result.failed}`}
            {result.privacyBlocked > 0 && `, ${result.privacyBlocked} refused the DM`}
            {result.unreachable > 0 && `, ${result.unreachable} deleted and retired`}
            {result.skipped > 0 && `, ${result.skipped} still queued`}
            {runs > 1 && ` · ${runs} runs`}
            {running && " · running…"}.
            {result.errors.length > 0 && (
              <span className="block text-xs text-destructive">
                {result.errors.slice(0, 5).join(" · ")}
                {result.errors.length > 5 && ` · +${result.errors.length - 5} more`}
              </span>
            )}
          </p>
        )}

        {result && result.sentTo.length > 0 && (
          <details className="rounded-md border bg-muted/40 p-3 text-sm">
            <summary className="cursor-pointer font-medium">
              {result.dryRun ? "Would contact" : "Replied to"} {result.sentTo.length}
              {running ? " so far" : ""}
            </summary>
            {/* Selectable so the list can be copied out before the card refreshes. */}
            <p className="mt-2 max-h-48 overflow-y-auto break-words font-mono text-xs leading-5 select-text">
              {result.sentTo.join(", ")}
            </p>
          </details>
        )}

        {running ? (
          <div className="flex items-center gap-2">
            <Button disabled>Working… {result ? `${result.sent} done` : ""}</Button>
            <Button variant="outline" onClick={() => (stopRequested.current = true)}>
              Stop after this batch
            </Button>
          </div>
        ) : confirming ? (
          <div className="flex items-center gap-2">
            <Button onClick={() => run(false)}>
              Confirm — {MODE_LABEL[mode].toLowerCase()} to {visible.length}
            </Button>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => run(true)} disabled={visible.length === 0}>
              Preview recipients
            </Button>
            <Button onClick={() => setConfirming(true)} disabled={visible.length === 0}>
              Send to {visible.length}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
