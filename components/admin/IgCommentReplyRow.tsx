"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { replyPublicly, replyPrivately } from "@/app/admin/ig-comments/actions";

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
    });
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Reply…"
          disabled={isPending}
        />
        <Button size="sm" variant="outline" disabled={isPending || !message.trim()} onClick={() => send("public")}>
          Public reply
        </Button>
        <Button size="sm" disabled={isPending || !message.trim()} onClick={() => send("private")}>
          DM (private reply)
        </Button>
      </div>
      {(defaultPrivateMessage || defaultPublicMessage) && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {defaultPrivateMessage && (
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              disabled={isPending}
              onClick={() => setMessage(defaultPrivateMessage)}
            >
              Use current SHIFT DM
            </button>
          )}
          {defaultPublicMessage && (
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              disabled={isPending}
              onClick={() => setMessage(defaultPublicMessage)}
            >
              Use current SHIFT public reply
            </button>
          )}
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
