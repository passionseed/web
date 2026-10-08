"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertCircle, Check, Copy, MessageSquare, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getLeadCommentInfo,
  personalizeLeadCopyAction,
  replyPubliclyToLeadComment,
} from "@/app/admin/dm-leads/actions";
import {
  getDefaultPublicCommentReply,
  hasThreadDeliveryFailure,
} from "@/lib/dm-leads/delivery-status";
import { getCampaign } from "@/lib/meta/comment-intent";
import type { DmConversation, DmConversationWithMessages, IgComment } from "@/types/dm-leads";

interface DmLeadPublicReplyBarProps {
  conversation: Pick<
    DmConversation,
    | "id"
    | "username"
    | "display_name"
    | "grade_level"
    | "interests"
    | "activities_summary"
    | "stage"
    | "wants_pathlab"
    | "pathlab_pay_ready"
    | "wants_community"
    | "wants_talent"
    | "has_hands_on_experience"
  >;
  thread: DmConversationWithMessages | null;
}

export function DmLeadPublicReplyBar({ conversation, thread }: DmLeadPublicReplyBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [comment, setComment] = useState<IgComment | null>(null);
  const [loadingComment, setLoadingComment] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [personalized, setPersonalized] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isBlocked = hasThreadDeliveryFailure(thread?.dm_messages);

  useEffect(() => {
    // Reset state when conversation changes
    setIsOpen(isBlocked);
    setSentSuccess(false);
    setError(null);
    setCopied(false);
    setMessage(getDefaultPublicCommentReply(conversation.username));

    let cancelled = false;
    setPersonalized(false);
    setLoadingComment(true);
    getLeadCommentInfo(conversation.id)
      .then((data) => {
        if (cancelled) return;
        setComment(data);
        setMessage(getDefaultPublicCommentReply(conversation.username, getCampaign(data?.text)));
        setLoadingComment(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadingComment(false);
      });

    return () => {
      cancelled = true;
    };
  }, [conversation.id, conversation.username, isBlocked]);

  /**
   * The rewrite costs an LLM round trip, so it waits until the bar is on
   * screen. Previously it fired for every lead the operator clicked through,
   * whether or not they ever opened this bar.
   */
  useEffect(() => {
    const visible = isBlocked || isOpen;
    if (!visible || personalized || loadingComment || !message.trim()) return;

    let cancelled = false;
    setPersonalized(true);
    void personalizeLeadCopyAction({
      conversationId: conversation.id,
      template: message,
      kind: getCampaign(comment?.text) === "shift" ? "composed" : "public_comment",
    }).then((result) => {
      if (!cancelled && result.body) setMessage(result.body);
    });
    return () => {
      cancelled = true;
    };
    // `message` is intentionally omitted: this must not re-run on each edit.
    // It does re-run when the comment load finishes, which is when the SHIFT
    // template replaces the privacy one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, isBlocked, isOpen, personalized, loadingComment, comment]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendPublicReply = () => {
    if (!comment || !message.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await replyPubliclyToLeadComment(comment.id, message.trim());
      if (!res.ok) {
        setError(res.error || "Failed to send public reply");
        return;
      }
      setSentSuccess(true);
    });
  };

  if (!isBlocked && !isOpen) {
    return (
      <div className="flex items-center justify-end px-3 py-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setIsOpen(true)}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Public reply to comment
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "space-y-2 border-b p-3 transition-colors",
        isBlocked
          ? "border-destructive/30 bg-destructive/10 dark:bg-destructive/15"
          : "bg-muted/40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {isBlocked ? (
            <div className="flex items-center gap-1.5 font-medium text-destructive text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>ส่ง DM ไม่ถึง: บัญชีนี้ติด Instagram Privacy Restrictions</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 font-medium text-xs">
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span>ตอบกลับคอมเมนต์หน้าโพสต์ (Public Comment Reply)</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {comment && (
            <Badge variant="outline" className="text-[10px]">
              พบคอมเมนต์ในระบบ
            </Badge>
          )}
          {!isBlocked && (
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {isBlocked && (
        <p className="text-xs text-muted-foreground">
          น้องตั้งค่าไม่รับข้อความจากคนแปลกหน้า แนะนำให้ตอบคอมเมนต์ใต้โพสต์สะกิดให้น้องทัก DM เข้ามาก่อน
        </p>
      )}

      {comment && (
        <div className="rounded border bg-background/80 p-2 text-xs">
          <p className="font-medium text-muted-foreground text-[11px]">คอมเมนต์ล่าสุดของน้อง:</p>
          <p className="mt-0.5 line-clamp-2 italic">“{comment.text}”</p>
        </div>
      )}

      {sentSuccess ? (
        <div className="flex items-center gap-2 rounded bg-emerald-500/15 p-2 text-xs text-emerald-700 dark:text-emerald-300">
          <Check className="h-4 w-4 shrink-0" />
          <span>ตอบกลับคอมเมนต์ใต้โพสต์สำเร็จแล้ว! รอน้องทัก DM เข้ามา</span>
        </div>
      ) : (
        <div className="space-y-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder="ข้อความตอบกลับใต้คอมเมนต์..."
            className="text-xs resize-none bg-background"
            disabled={isPending}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              {copied ? "คัดลอกแล้ว" : "คัดลอกข้อความ"}
            </Button>

            {comment ? (
              <Button
                type="button"
                size="sm"
                className="h-7 text-xs gap-1.5"
                disabled={isPending || !message.trim()}
                onClick={handleSendPublicReply}
              >
                <Send className="h-3 w-3" />
                {isPending ? "กำลังส่ง..." : "ส่ง Public Reply"}
              </Button>
            ) : (
              <span className="text-[11px] text-muted-foreground italic">
                (ไม่พบคอมเมนต์ใน DB · สามารถคัดลอกไปตอบใน IG App ได้โดยตรง)
              </span>
            )}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
