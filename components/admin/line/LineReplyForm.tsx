"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { replyOnLine } from "@/app/admin/line/actions";
import { refreshAdminCounts } from "@/components/admin/console/live-counts";
import { LINE_TEXT_LIMIT } from "@/lib/line-oa/limits";

export function LineReplyForm({ contactId, disabled }: { contactId: string; disabled?: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const tooLong = text.length > LINE_TEXT_LIMIT;
  const canSend = text.trim().length > 0 && !tooLong && !isPending && !disabled;

  function send() {
    if (!canSend) return;
    const body = text;
    startTransition(async () => {
      const result = await replyOnLine(contactId, body);
      if (result.ok) {
        setText("");
        refreshAdminCounts();
        if (result.method === "push") toast("Sent as a push message (counts toward the monthly quota).");
      } else {
        toast.error(result.error);
      }
      router.refresh();
    });
  }

  return (
    <form
      className="flex items-end gap-2 border-t p-3"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <div className="flex-1 space-y-1">
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              send();
            }
          }}
          placeholder={disabled ? "This person blocked the account, so LINE will not deliver replies." : "Reply on LINE… (⌘/Ctrl + Enter to send)"}
          rows={3}
          disabled={isPending || disabled}
          className="resize-none"
        />
        {tooLong && (
          <p className="text-xs text-destructive">
            {text.length}/{LINE_TEXT_LIMIT} characters, LINE will reject this.
          </p>
        )}
      </div>
      <Button type="submit" disabled={!canSend}>
        <Send className="h-4 w-4" />
        {isPending ? "Sending" : "Send"}
      </Button>
    </form>
  );
}
