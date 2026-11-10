"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, Star } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { updateLead, type LeadMetaPatch } from "@/app/admin/dm-leads/actions";
import { refreshAdminCounts } from "@/components/admin/console/live-counts";
import type { DmConversation, DmLeadStatus } from "@/types/dm-leads";

export const LEAD_STATUS_OPTIONS: { value: DmLeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
  { value: "spam", label: "Spam" },
];

/** Tomorrow at 09:00 local — the default one-key follow-up. */
export function followUpTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

function inDaysAt9(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

function nextMondayAt9(): string {
  const d = new Date();
  const diff = (8 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

export function formatFollowUp(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isFollowUpDue(iso: string): boolean {
  return new Date(iso).getTime() <= Date.now();
}

/** Status and follow-up changes move the "awaiting reply" and "follow-ups due" queues. */
export function leadPatchMovesQueues(patch: LeadMetaPatch): boolean {
  return "lead_status" in patch || "follow_up_at" in patch;
}

/**
 * Shared optimistic-update path for lead meta (star, status, follow-up,
 * tags): syncs local list state immediately, persists via server action,
 * then refreshes so server-rendered bits catch up.
 */
export function useLeadMetaUpdater(
  conversationId: string,
  onChange?: (patch: LeadMetaPatch) => void
) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const apply = (patch: LeadMetaPatch) => {
    onChange?.(patch);
    startTransition(async () => {
      const result = await updateLead(conversationId, patch);
      if (!result.ok) console.error(result.error);
      else if (leadPatchMovesQueues(patch)) refreshAdminCounts();
      router.refresh();
    });
  };

  return { apply, isPending };
}

interface DmLeadManageBarProps {
  conversation: Pick<DmConversation, "id" | "starred" | "follow_up_at" | "lead_status">;
  /** Optimistic local sync — the action call itself is owned by this bar. */
  onChange?: (patch: LeadMetaPatch) => void;
}

/** Compact star / pipeline-status / follow-up controls for one lead. */
export function DmLeadManageBar({ conversation, onChange }: DmLeadManageBarProps) {
  const { apply, isPending } = useLeadMetaUpdater(conversation.id, onChange);

  const followUpValue = conversation.follow_up_at ? "set" : "none";
  const followUpDue = conversation.follow_up_at && isFollowUpDue(conversation.follow_up_at);

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", isPending && "opacity-70")}>
      <button
        type="button"
        onClick={() => apply({ starred: !conversation.starred })}
        title={conversation.starred ? "Remove star (s)" : "Star (s)"}
        className="rounded-full p-1 transition-colors hover:bg-muted"
      >
        <Star
          className={cn(
            "h-4 w-4",
            conversation.starred ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
          )}
        />
      </button>

      <Select
        value={conversation.lead_status}
        onValueChange={(v) => apply({ lead_status: v as DmLeadStatus })}
      >
        <SelectTrigger className="h-7 w-28 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LEAD_STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={followUpValue}
        onValueChange={(v) => {
          if (v === "none") apply({ follow_up_at: null });
          else if (v === "tomorrow") apply({ follow_up_at: followUpTomorrow() });
          else if (v === "3d") apply({ follow_up_at: inDaysAt9(3) });
          else if (v === "nextweek") apply({ follow_up_at: nextMondayAt9() });
          // "set" is display-only — picking a preset replaces it.
        }}
      >
        <SelectTrigger className="h-7 w-32 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {conversation.follow_up_at && (
            <SelectItem value="set">⏰ {formatFollowUp(conversation.follow_up_at)}</SelectItem>
          )}
          <SelectItem value="none">ไม่ติดตาม</SelectItem>
          <SelectItem value="tomorrow">พรุ่งนี้ 9:00</SelectItem>
          <SelectItem value="3d">อีก 3 วัน</SelectItem>
          <SelectItem value="nextweek">สัปดาห์หน้า (จ.)</SelectItem>
        </SelectContent>
      </Select>

      {conversation.follow_up_at && (
        <span
          className={cn(
            "flex items-center gap-1 text-xs",
            followUpDue ? "font-medium text-red-600 dark:text-red-400" : "text-muted-foreground"
          )}
        >
          {followUpDue ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
          {followUpDue ? "ถึงกำหนดแล้ว" : formatFollowUp(conversation.follow_up_at)}
        </span>
      )}
    </div>
  );
}
