"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { replyPublicly, replyPrivately } from "@/app/admin/ig-comments/actions";
import { refreshAdminCounts } from "@/components/admin/console/live-counts";

const TEMPLATE_BUTTON_CLASS =
  "inline-flex min-h-11 items-center text-xs text-muted-foreground underline-offset-2 hover:underline active:underline lg:min-h-0";

export function IgCommentReplyRow({
  commentId,
  defaultPrivateMessage,
  defaultPublicMessage,
}: {
  commentId: string;
  /** Open-cohort DM, filled in when the operator asks for the SHIFT reply. */
  defaultPrivateMessage?: string;
  /** Open-cohort public reply, including the @mention. */
  defaultPublicMessage?: string;
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
        <Button
          size="sm"
          className="h-11 lg:[@media(pointer:fine)]:h-9"
          disabled={isPending || !message.trim()}
          onClick={() => send("private")}
        >
          DM (private reply)
        </Button>
      </div>
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
