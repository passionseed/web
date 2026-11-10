"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  sendCampaignTargetAction,
  skipCampaignTargetAction,
} from "@/app/admin/dm-leads/campaign/actions";
import { ChatAppLink } from "@/components/admin/ChatAppLink";
import { pageShortcutsPaused } from "@/components/admin/shared/page-shortcuts";
import { GATE_REASON_LABELS, type GateReason } from "@/lib/dm-leads/send-gate";
import type { CampaignQueueItem } from "@/lib/supabase/dm-campaigns";

/**
 * The review lane: one card at a time, keyboard-driven.
 *
 * Built as a single focused card rather than a list because the operator's job
 * here is a verdict, not a comparison — 179 threads only clears in one sitting
 * if each one is read-and-decide with no scrolling and no mouse.
 *
 * Keys mirror the inbox's vim mode: Enter sends, s skips, e edits, j/k move.
 */
export function CampaignReviewQueue({
  campaignId,
  items,
}: {
  campaignId: string;
  items: CampaignQueueItem[];
}) {
  const [queue, setQueue] = useState(items);
  const [index, setIndex] = useState(0);
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setQueue(items), [items]);

  const current = queue[index] ?? null;

  useEffect(() => {
    setBody(current?.draft_body ?? current?.template_body ?? "");
    setEditing(false);
    setError(null);
  }, [current?.id, current?.draft_body, current?.template_body]);

  const advance = () => {
    setQueue((prev) => prev.filter((item) => item.id !== current?.id));
    setIndex((prev) => Math.min(prev, Math.max(0, queue.length - 2)));
  };

  const send = async () => {
    if (!current || pending || !body.trim()) return;
    setPending(true);
    setError(null);
    const result = await sendCampaignTargetAction({
      targetId: current.id,
      conversationId: current.conversation_id,
      campaignId,
      variant: current.variant,
      body,
    });
    setPending(false);
    if (result.ok) advance();
    else setError(result.error);
  };

  const skip = async () => {
    if (!current || pending) return;
    setPending(true);
    await skipCampaignTargetAction(current.id, "operator skipped");
    setPending(false);
    advance();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (pageShortcutsPaused(event)) return;
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "TEXTAREA" || target?.tagName === "INPUT";

      if (typing) {
        // Cmd/Ctrl+Enter sends from inside the editor; Escape leaves it.
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          void send();
        }
        if (event.key === "Escape") (target as HTMLElement).blur();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        void send();
      } else if (event.key === "s") {
        event.preventDefault();
        void skip();
      } else if (event.key === "e") {
        event.preventDefault();
        setEditing(true);
      } else if (event.key === "j") {
        setIndex((prev) => Math.min(queue.length - 1, prev + 1));
      } else if (event.key === "k") {
        setIndex((prev) => Math.max(0, prev - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const reasons = useMemo(
    () => (current?.gate_reasons ?? []) as GateReason[],
    [current]
  );

  if (!current) {
    return (
      <p className="rounded-lg border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        คิวว่างแล้ว ทักครบทุกคนในรอบนี้
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          เหลือ <b className="text-foreground">{queue.length}</b> · กำลังดูคนที่{" "}
          {index + 1}
        </span>
        <span className="font-mono">
          Enter ส่ง · s ข้าม · e แก้ · j/k เลื่อน
        </span>
      </div>

      <div className="rounded-lg border">
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-3 py-2 text-xs">
          <b className="text-sm">
            {current.display_name ?? current.username ?? "ไม่ทราบชื่อ"}
          </b>
          {current.grade_level && (
            <span className="text-muted-foreground">{current.grade_level}</span>
          )}
          {current.interests.slice(0, 2).map((interest) => (
            <span key={interest} className="rounded bg-background px-1.5 py-0.5">
              {interest}
            </span>
          ))}
          <span className="ml-auto rounded bg-background px-1.5 py-0.5 font-mono">
            {current.bucket} · rung {current.rung} · {current.variant}
          </span>
          <ChatAppLink conversation={current} showLabel={false} />
        </div>

        {/* Addendum E: flags route, threads decide. Never approve without the thread. */}
        <div className="max-h-56 space-y-1.5 overflow-y-auto border-b p-3">
          {current.recent_turns.length === 0 ? (
            <p className="text-xs text-muted-foreground">ไม่มีข้อความก่อนหน้า</p>
          ) : (
            current.recent_turns.map((turn, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-lg px-2.5 py-1.5 text-sm",
                  turn.direction === "inbound"
                    ? "bg-muted"
                    : "ml-auto bg-primary/10 text-right"
                )}
              >
                {turn.body}
              </div>
            ))
          )}
        </div>

        {reasons.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-b px-3 py-2">
            {reasons.map((reason) => (
              <span
                key={reason}
                className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200"
              >
                {GATE_REASON_LABELS[reason] ?? reason}
              </span>
            ))}
          </div>
        )}

        <div className="p-3">
          {editing ? (
            <Textarea
              autoFocus
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={5}
              className="text-sm"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="w-full whitespace-pre-wrap rounded border border-dashed p-2.5 text-left text-sm hover:bg-muted/50"
            >
              {body}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button onClick={() => void send()} disabled={pending || !body.trim()}>
          {pending ? "กำลังส่ง…" : "ส่ง (Enter)"}
        </Button>
        <Button variant="outline" onClick={() => void skip()} disabled={pending}>
          ข้าม (s)
        </Button>
      </div>
    </div>
  );
}
