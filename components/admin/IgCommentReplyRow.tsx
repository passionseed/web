"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { replyPublicly, replyPrivately, sendRadarDm } from "@/app/admin/ig-comments/actions";
import { refreshAdminCounts } from "@/components/admin/console/live-counts";

const TEMPLATE_BUTTON_CLASS =
  "inline-flex min-h-11 items-center text-xs text-muted-foreground underline-offset-2 hover:underline active:underline lg:min-h-0";

/** What a Radar comment row shows. Computed on the server (spec 5.5). */
export interface RadarRowInfo {
  /** "สาย ไซเบอร์" style label, or "Hub" for unmapped posts. */
  label: string;
  /** `radar_comment_dms.status`, or null when nothing was claimed yet. */
  status: "claimed" | "sent" | "failed" | "skipped" | null;
  errorCode?: string | null;
  /** Vaguer ask on a mapped reel: a person decides. */
  needsReview: boolean;
  /** False outside the 7-day private-reply window or when the reel has DMs off. */
  canSend: boolean;
}

const RADAR_STATUS_LABEL: Record<NonNullable<RadarRowInfo["status"]>, string> = {
  claimed: "Sending",
  sent: "DM sent",
  failed: "DM failed",
  skipped: "Skipped",
};

/**
 * One-click fixed Radar DM. The server uses the claim RPC, so a double click
 * or a click racing the webhook can never DM the same comment twice.
 */
export function RadarSendButton({
  commentId,
  info,
  className,
}: {
  commentId: string;
  info: RadarRowInfo;
  className?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const sendable = info.canSend && (info.status === null || info.status === "failed");

  const send = () => {
    setError(null);
    startTransition(async () => {
      const result = await sendRadarDm(commentId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Radar link sent as a DM");
      refreshAdminCounts();
    });
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">
          Radar · {info.label}
          {info.status ? ` · ${RADAR_STATUS_LABEL[info.status]}` : info.needsReview ? " · needs review" : ""}
          {info.status === "failed" && info.errorCode ? ` (${info.errorCode})` : ""}
        </span>
        {sendable && (
          <Button
            size="sm"
            className="h-11 lg:[@media(pointer:fine)]:h-9"
            disabled={isPending}
            onClick={send}
          >
            {isPending ? "Sending…" : info.status === "failed" ? "ส่งลิงก์ Radar อีกครั้ง" : "ส่งลิงก์ Radar"}
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function IgCommentReplyRow({
  commentId,
  defaultPrivateMessage,
  defaultPublicMessage,
  radar,
}: {
  commentId: string;
  /** Open-cohort DM, filled in when the operator asks for the SHIFT reply. */
  defaultPrivateMessage?: string;
  /** Open-cohort public reply, including the @mention. */
  defaultPublicMessage?: string;
  /**
   * Set for Radar comments. They only get the fixed Radar DM, so the free-text
   * DM button is replaced by the one-click Radar send.
   */
  radar?: RadarRowInfo;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const send = (mode: "public" | "private") => {
    setError(null);
    startTransition(async () => {
      const result = mode === "public"
        ? await replyPublicly(commentId, message)
        : await replyPrivately(commentId, message);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("");
      toast.success(mode === "public" ? "Public reply posted" : "Private reply sent as a DM");
      refreshAdminCounts();
    });
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Reply…"
          aria-label="Reply to this comment"
          disabled={isPending}
          className="h-11 lg:[@media(pointer:fine)]:h-9"
        />
        <Button
          size="sm"
          variant="outline"
          className="h-11 lg:[@media(pointer:fine)]:h-9"
          disabled={isPending || !message.trim()}
          onClick={() => send("public")}
        >
          Public reply
        </Button>
        {!radar && (
          <Button
            size="sm"
            className="h-11 lg:[@media(pointer:fine)]:h-9"
            disabled={isPending || !message.trim()}
            onClick={() => send("private")}
          >
            DM (private reply)
          </Button>
        )}
      </div>
      {radar && <RadarSendButton commentId={commentId} info={radar} />}
      {(defaultPrivateMessage || defaultPublicMessage) && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {defaultPrivateMessage && (
            <button
              type="button"
              className={TEMPLATE_BUTTON_CLASS}
              disabled={isPending}
              onClick={() => setMessage(defaultPrivateMessage)}
            >
              Use current SHIFT DM
            </button>
          )}
          {defaultPublicMessage && (
            <button
              type="button"
              className={TEMPLATE_BUTTON_CLASS}
              disabled={isPending}
              onClick={() => setMessage(defaultPublicMessage)}
            >
              Use current SHIFT public reply
            </button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
