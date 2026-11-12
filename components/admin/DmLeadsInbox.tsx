"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Flame, Inbox, Keyboard, Maximize2, Minimize2, RefreshCw, Star } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { isEditable } from "@/lib/dom/is-editable";
import { isWithinMessagingWindow } from "@/lib/dm-leads/messaging-window";
import { contextFromConversation, getQuickReplies } from "@/lib/dm-leads/quick-replies";
import { deriveSignalsFromMessages } from "@/lib/dm-leads/signals";
import { COHORT_META } from "@/lib/dm-leads/scoring";
import { getThread, syncLeadMessages, updateLead, type LeadMetaPatch } from "@/app/admin/dm-leads/actions";
import { refreshAdminCounts } from "@/components/admin/console/live-counts";
import { Kbd } from "@/components/admin/shared/Kbd";
import { pageShortcutsPaused } from "@/components/admin/shared/page-shortcuts";
import { DmLeadDetailPane } from "@/components/admin/DmLeadDetailPane";
import { DM_REPLY_TEXTAREA_ID } from "@/components/admin/DmLeadReplyForm";
import { DM_LEAD_SEARCH_INPUT_ID } from "@/components/admin/DmLeadFilters";
import {
  followUpTomorrow,
  isFollowUpDue,
  leadPatchMovesQueues,
} from "@/components/admin/DmLeadManageBar";
import type {
  DmConversationWithBucket,
  DmConversationWithMessages,
  DmLeadStage,
} from "@/types/dm-leads";

const STAGE_LABEL: Record<DmLeadStage, string> = {
  unknown: "Unknown",
  exploring: "Exploring",
  building: "Building",
  job_seeking: "Job seeking",
};

const STAGE_VARIANT: Record<DmLeadStage, "secondary" | "default" | "outline"> = {
  unknown: "outline",
  exploring: "secondary",
  building: "default",
  job_seeking: "default",
};

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function instagramHandle(username: string | null): string | null {
  const handle = username?.trim().replace(/^@+/, "");
  return handle ? `@${handle}` : null;
}

function MessagingWindowBadge({ lastInboundMessageAt }: { lastInboundMessageAt: string | null }) {
  const isOpen = isWithinMessagingWindow(lastInboundMessageAt);

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 px-1.5 py-0 text-[10px]",
        isOpen
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300"
      )}
      title={
        isOpen
          ? "ยังตอบได้ใน Meta 24-hour messaging window"
          : "เกิน Meta 24-hour messaging window แล้ว"
      }
    >
      <span
        aria-hidden="true"
        className={cn("h-1.5 w-1.5 rounded-full", isOpen ? "bg-emerald-500" : "bg-red-500")}
      />
      {isOpen ? "ตอบได้ <24h" : "เกิน 24h"}
    </Badge>
  );
}

/**
 * Split-pane DM inbox optimized for big-screen, keyboard-first triage:
 *   j/k or ↑/↓  move between leads
 *   Enter       jump into the reply box
 *   1–4         insert a quick-reply suggestion
 *   ⌘/Ctrl+↵    send (then auto-advance to the next lead)
 *   o           open the lead's full page
 *   /           focus search
 *   Esc         leave the input you're typing in
 */
const VIM_MODE_STORAGE_KEY = "dm-leads-vim-mode";
const HALF_PAGE = 5;

export function DmLeadsInbox({ conversations }: { conversations: DmConversationWithBucket[] }) {
  const router = useRouter();
  const [items, setItems] = useState(conversations);
  const [selectedId, setSelectedId] = useState<string | null>(conversations[0]?.id ?? null);
  const [replyBody, setReplyBody] = useState("");
  const [vimMode, setVimModeState] = useState(false);
  const [editorMode, setEditorMode] = useState<"normal" | "insert">("normal");
  const [fullscreen, setFullscreen] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [, refreshMessagingWindows] = useState(0);
  const pendingG = useRef(false);
  const threadCache = useRef(new Map<string, DmConversationWithMessages>());

  const handleSyncChat = async (conversationId: string) => {
    setSyncingId(conversationId);
    // Phase 1: Fast local hydration (<30ms)
    try {
      const fastThread = await getThread(conversationId);
      if (fastThread) {
        const lastInbound = deriveSignalsFromMessages(fastThread.dm_messages).lastInboundMessageAt;
        threadCache.current.set(conversationId, fastThread);
        setItems((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? { ...c, ...fastThread, last_inbound_message_at: lastInbound }
              : c
          )
        );
      }
    } catch (error) {
      // Not fatal: the Graph API sync below reloads the thread anyway.
      console.warn("Fast thread hydration failed:", error);
    }

    // Phase 2: Live Graph API Sync
    const retry = { label: "Retry", onClick: () => void handleSyncChat(conversationId) };
    try {
      const res = await syncLeadMessages(conversationId);
      if (!res.ok) {
        toast.error(res.error || "Could not sync this chat", { action: retry });
      } else if (res.error) {
        toast.warning(res.error);
      }
      // Even a partial sync can return the stored thread; show it either way.
      if (res.conversation) {
        const updated = res.conversation;
        const lastInboundMessageAt = deriveSignalsFromMessages(
          updated.dm_messages
        ).lastInboundMessageAt;
        threadCache.current.set(conversationId, updated);
        setItems((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? { ...c, ...updated, last_inbound_message_at: lastInboundMessageAt }
              : c
          )
        );
      }
    } catch (error) {
      console.error("Failed to sync chat:", error);
      toast.error("Could not sync this chat. Check your connection.", { action: retry });
    } finally {
      setSyncingId(null);
    }
  };

  // Persist the vim-mode preference across sessions. Loaded after mount to
  // avoid a server/client hydration mismatch.
  useEffect(() => {
    if (localStorage.getItem(VIM_MODE_STORAGE_KEY) === "1") setVimModeState(true);
  }, []);

  // A thread can cross the 24-hour boundary while this triage view stays open.
  useEffect(() => {
    const timer = window.setInterval(() => refreshMessagingWindows((value) => value + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const setVimMode = (on: boolean) => {
    setVimModeState(on);
    localStorage.setItem(VIM_MODE_STORAGE_KEY, on ? "1" : "0");
  };

  // Track NORMAL/INSERT from focus so the mode line reflects reality.
  useEffect(() => {
    if (!vimMode) return;
    const onFocusIn = (e: FocusEvent) =>
      setEditorMode(isEditable(e.target) ? "insert" : "normal");
    const onFocusOut = () => setEditorMode("normal");
    window.addEventListener("focusin", onFocusIn);
    window.addEventListener("focusout", onFocusOut);
    return () => {
      window.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("focusout", onFocusOut);
    };
  }, [vimMode]);

  // Re-sync when the server revalidates (e.g. after a reply is sent).
  useEffect(() => setItems(conversations), [conversations]);

  const selectedIndex = items.findIndex((c) => c.id === selectedId);
  const selected = selectedIndex >= 0 ? items[selectedIndex] : (items[0] ?? null);

  // Fresh reply box per conversation.
  useEffect(() => setReplyBody(""), [selected?.id]);

  // Prefetch neighboring threads so j/k and send-then-advance feel instant
  // instead of showing "Loading…" for ~2s on every new lead.
  useEffect(() => {
    const neighborIds = [
      items[selectedIndex + 1]?.id,
      items[selectedIndex - 1]?.id,
    ].filter((id): id is string => Boolean(id) && !threadCache.current.has(id!));

    if (neighborIds.length === 0) return;
    let cancelled = false;
    for (const id of neighborIds) {
      getThread(id).then((result) => {
        if (cancelled || !result) return;
        threadCache.current.set(id, result);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [selectedIndex, items]);

  const suggestions = useMemo(
    () => (selected ? getQuickReplies(contextFromConversation(selected)) : []),
    [selected]
  );

  const selectByIndex = (index: number) => {
    if (items.length === 0) return;
    const clamped = Math.max(0, Math.min(items.length - 1, index));
    setSelectedId(items[clamped].id);
  };

  // Keep the selected row visible while keyboard-navigating.
  useEffect(() => {
    if (!selected) return;
    document
      .getElementById(`dm-lead-item-${selected.id}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  useEffect(() => {
    const focusReply = () => document.getElementById(DM_REPLY_TEXTAREA_ID)?.focus();

    const handler = (e: KeyboardEvent) => {
      // A dialog or popover owns the keyboard (its Escape must not also leave
      // fullscreen, and "s" or "f" must not change the lead underneath).
      if (pageShortcutsPaused(e)) return;
      if (e.key === "Escape") {
        if (e.target instanceof HTMLElement && isEditable(e.target)) {
          e.target.blur();
          return;
        }
        if (fullscreen) {
          setFullscreen(false);
          return;
        }
      }
      if (isEditable(e.target)) return;

      // Vim half-page jumps — must run before the modifier bail-out.
      if (vimMode && e.ctrlKey && (e.key === "d" || e.key === "u")) {
        e.preventDefault();
        selectByIndex(selectedIndex + (e.key === "d" ? HALF_PAGE : -HALF_PAGE));
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Bindings available in both modes.
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          selectByIndex(selectedIndex + 1);
          return;
        case "ArrowUp":
          e.preventDefault();
          selectByIndex(selectedIndex - 1);
          return;
        case "Enter":
          e.preventDefault();
          focusReply();
          return;
        case "1":
        case "2":
        case "3":
        case "4": {
          const suggestion = suggestions[Number(e.key) - 1];
          if (suggestion) {
            e.preventDefault();
            setReplyBody(suggestion.body);
            focusReply();
          }
          return;
        }
        case "o":
          if (selected) router.push(`/admin/dm-leads/${selected.id}`);
          return;
        case "/":
          e.preventDefault();
          document.getElementById(DM_LEAD_SEARCH_INPUT_ID)?.focus();
          return;
        case "z":
          e.preventDefault();
          setFullscreen((v) => !v);
          return;
        case "r":
        case "R":
          if (selected) {
            e.preventDefault();
            handleSyncChat(selected.id);
          }
          return;
      }

      if (!vimMode) return;

      // Vim-mode bindings.
      switch (e.key) {
        case "j":
          e.preventDefault();
          selectByIndex(selectedIndex + 1);
          break;
        case "k":
          e.preventDefault();
          selectByIndex(selectedIndex - 1);
          break;
        case "i":
          e.preventDefault();
          focusReply();
          break;
        case "s":
          e.preventDefault();
          if (selected) applyMeta({ starred: !selected.starred });
          break;
        case "f":
          e.preventDefault();
          if (selected) {
            applyMeta({ follow_up_at: selected.follow_up_at ? null : followUpTomorrow() });
          }
          break;
        case "G":
          e.preventDefault();
          selectByIndex(items.length - 1);
          break;
        case "g":
          e.preventDefault();
          if (pendingG.current) {
            pendingG.current = false;
            selectByIndex(0);
          } else {
            pendingG.current = true;
            setTimeout(() => {
              pendingG.current = false;
            }, 500);
          }
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vimMode, fullscreen, items, selectedIndex, selected, suggestions, router]);

  const handleSelect = (conversation: DmConversationWithBucket) => {
    // Below lg the detail pane is hidden — go to the full page instead.
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setSelectedId(conversation.id);
    } else {
      router.push(`/admin/dm-leads/${conversation.id}`);
    }
  };

  // Superhuman-style: send → mark replied locally → advance to the next lead.
  // Skip the auto-advance when an attachment was sent, so the admin actually
  // sees the image/video/file land in the thread instead of it rendering
  // one lead too late.
  const handleSent = (hadAttachment: boolean) => {
    if (!selected) return;
    refreshAdminCounts();
    setItems((prev) =>
      prev.map((c) =>
        c.id === selected.id ? { ...c, last_message_direction: "outbound" as const } : c
      )
    );
    if (hadAttachment) return;
    const next = items[selectedIndex + 1] ?? items[selectedIndex - 1];
    if (next && next.id !== selected.id) setSelectedId(next.id);
  };

  /**
   * Optimistic local sync for manage-bar patches (star, status, tags, …).
   * The bar saves and refreshes the queue counts itself.
   */
  const syncMeta = (patch: LeadMetaPatch) => {
    if (!selected) return;
    setItems((prev) => prev.map((c) => (c.id === selected.id ? { ...c, ...patch } : c)));
  };

  /** Keyboard path: sync locally AND persist (the bar persists its own). */
  const applyMeta = (patch: LeadMetaPatch) => {
    if (!selected) return;
    syncMeta(patch);
    updateLead(selected.id, patch).then((r) => {
      if (!r.ok) router.refresh();
      else if (leadPatchMovesQueues(patch)) refreshAdminCounts();
    });
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border py-16 text-muted-foreground">
        <Inbox className="h-8 w-8" />
        <p className="text-sm">ไม่พบ lead ที่ตรงกับตัวกรองนี้</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        fullscreen
          ? "fixed inset-0 z-50 flex flex-col gap-2 bg-background p-3"
          : "space-y-2"
      )}
    >
      <div
        className={cn(
          "grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]",
          fullscreen ? "min-h-0 flex-1" : "lg:h-[calc(100vh-14rem)]"
        )}
      >
        <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border">
          <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <span>
              {selectedIndex + 1} / {items.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFullscreen((v) => !v)}
                title="Fullscreen (z), Esc to exit"
                className="flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold transition-colors hover:text-foreground"
              >
                {fullscreen ? (
                  <Minimize2 className="h-3 w-3" />
                ) : (
                  <Maximize2 className="h-3 w-3" />
                )}
                {fullscreen ? "EXIT" : "FULL"}
              </button>
              <button
                type="button"
                onClick={() => setVimMode(!vimMode)}
                title="Toggle vim mode"
                className={cn(
                  "flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold transition-colors",
                  vimMode
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "hover:text-foreground"
                )}
              >
                <Keyboard className="h-3 w-3" />
                VIM {vimMode ? "ON" : "OFF"}
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 divide-y overflow-y-auto">
            {items.map((c) => {
              const isSelected = c.id === selected?.id;
              const myTurn = c.last_message_direction === "inbound";
              return (
                <div
                  key={c.id}
                  id={`dm-lead-item-${c.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelect(c)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
                      e.preventDefault();
                      handleSelect(c);
                    }
                  }}
                  className={cn(
                    "w-full cursor-pointer px-3 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
                    isSelected
                      ? "bg-accent ring-2 ring-inset ring-foreground/20"
                      : "hover:bg-muted/60",
                    c.pathlab_pay_ready && !isSelected && "bg-red-50/60 dark:bg-red-950/10"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    {c.starred && (
                      <Star
                        className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400"
                        aria-label="Starred"
                      />
                    )}
                    {c.pathlab_pay_ready && (
                      <Flame className="h-3.5 w-3.5 shrink-0 text-red-500" aria-label="Hot lead" />
                    )}
                    {myTurn && (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full bg-amber-500"
                        title="Your turn to reply"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {c.display_name || c.username || c.platform_user_id}
                      </div>
                      {c.display_name && c.username && (
                        <div className="truncate text-[11px] text-muted-foreground">
                          {instagramHandle(c.username)}
                        </div>
                      )}
                    </div>
                    {c.tier === "high_value" ? (
                      <span
                        className="shrink-0 rounded bg-red-500/15 px-1 py-0.2 text-[10px] font-semibold text-red-600 dark:text-red-400"
                        title="High-Value Target (Propensity Score ≥ 85%)"
                      >
                        🔥 HVT {Math.round((c.propensity_score ?? 0) * 100)}%
                      </span>
                    ) : c.tier === "high_intent" ? (
                      <span
                        className="shrink-0 rounded bg-amber-500/15 px-1 py-0.2 text-[10px] font-medium text-amber-600 dark:text-amber-400"
                        title="High-Intent Lead (Propensity Score ≥ 50%)"
                      >
                        🎯 {Math.round((c.propensity_score ?? 0) * 100)}%
                      </span>
                    ) : null}
                    {c.engagement_index !== undefined && c.engagement_index >= 40 && (
                      <span
                        className="shrink-0 rounded bg-sky-500/10 px-1 py-0.2 font-mono text-[9px] text-sky-700 dark:text-sky-300"
                        title={`Engagement Index (RFM-E): ${c.engagement_index}/100`}
                      >
                        ⚡{c.engagement_index}
                      </span>
                    )}
                    {c.follow_up_at && (
                      <Bell
                        className={cn(
                          "h-3 w-3 shrink-0",
                          isFollowUpDue(c.follow_up_at)
                            ? "text-red-500"
                            : "text-muted-foreground"
                        )}
                        aria-label={
                          isFollowUpDue(c.follow_up_at) ? "Follow-up due" : "Follow-up set"
                        }
                      />
                    )}
                    <div className="ml-auto flex items-center gap-1 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(c.last_message_at)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSyncChat(c.id);
                        }}
                        disabled={syncingId === c.id}
                        title="โหลดข้อความล่าสุด (Load newest content)"
                        aria-label="Load newest content"
                        className="rounded p-0.5 text-muted-foreground/70 transition-colors hover:bg-background/80 hover:text-foreground disabled:opacity-50"
                      >
                        <RefreshCw
                          className={cn(
                            "h-3 w-3",
                            syncingId === c.id && "animate-spin text-foreground"
                          )}
                        />
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge variant={STAGE_VARIANT[c.stage]} className="px-1.5 py-0 text-[10px]">
                      {STAGE_LABEL[c.stage]}
                    </Badge>
                    {c.cohort && c.cohort !== "casual_browser" && COHORT_META[c.cohort] && (
                      <span
                        className={cn(
                          "shrink-0 rounded border px-1 text-[9px] font-medium",
                          COHORT_META[c.cohort].badgeClass
                        )}
                        title={COHORT_META[c.cohort].description}
                      >
                        {COHORT_META[c.cohort].label}
                      </span>
                    )}
                    <MessagingWindowBadge
                      lastInboundMessageAt={c.last_inbound_message_at}
                    />
                    {c.lead_status !== "new" && (
                      <Badge
                        variant={c.lead_status === "converted" ? "default" : "outline"}
                        className="px-1.5 py-0 text-[10px] capitalize"
                      >
                        {c.lead_status}
                      </Badge>
                    )}
                    {c.grade_level && <span className="shrink-0">{c.grade_level}</span>}
                    <span className="shrink-0">{c.platform === "instagram" ? "IG" : "FB"}</span>
                    {c.interests[0] && (
                      <span className="truncate">· {c.interests[0]}</span>
                    )}
                    {c.admin_tags[0] && (
                      <span className="shrink-0 rounded bg-muted px-1 text-[10px]">
                        {c.admin_tags[0]}
                        {c.admin_tags.length > 1 ? ` +${c.admin_tags.length - 1}` : ""}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="hidden min-h-0 lg:block">
          {selected && (
            <DmLeadDetailPane
              conversation={selected}
              body={replyBody}
              onBodyChange={setReplyBody}
              onSent={handleSent}
              onMetaChange={syncMeta}
              threadCache={threadCache}
              isSyncing={syncingId === selected.id}
            />
          )}
        </div>
      </div>

      <div className="hidden items-center gap-3 text-xs text-muted-foreground lg:flex">
        {vimMode && (
          <span
            className={cn(
              "rounded px-1.5 py-0.5 font-mono text-[10px] font-bold text-white",
              editorMode === "insert" ? "bg-amber-500" : "bg-emerald-600"
            )}
          >
            {editorMode === "insert" ? "INSERT" : "NORMAL"}
          </span>
        )}
        {vimMode ? (
          <>
            <span className="flex items-center gap-1">
              <Kbd>j</Kbd>/<Kbd>k</Kbd> เลือก lead
            </span>
            <span className="flex items-center gap-1">
              <Kbd>gg</Kbd>/<Kbd>G</Kbd> แรก/สุดท้าย
            </span>
            <span className="flex items-center gap-1">
              <Kbd>^d</Kbd>/<Kbd>^u</Kbd> ±{HALF_PAGE}
            </span>
            <span className="flex items-center gap-1">
              <Kbd>i</Kbd> ไปที่ช่องตอบ
            </span>
            <span className="flex items-center gap-1">
              <Kbd>s</Kbd> ติดดาว
            </span>
            <span className="flex items-center gap-1">
              <Kbd>f</Kbd> ติดตามพรุ่งนี้/ยกเลิก
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>/<Kbd>↓</Kbd> เลือก lead
            </span>
            <span className="flex items-center gap-1">
              <Kbd>Enter</Kbd> ไปที่ช่องตอบ
            </span>
          </>
        )}
        <span className="flex items-center gap-1">
          <Kbd>1</Kbd>–<Kbd>4</Kbd> แทรก quick reply
        </span>
        <span className="flex items-center gap-1">
          <Kbd>⌘↵</Kbd> ส่งแล้วไป lead ถัดไป
        </span>
        <span className="flex items-center gap-1">
          <Kbd>o</Kbd> เปิดหน้าเต็ม
        </span>
        <span className="flex items-center gap-1">
          <Kbd>/</Kbd> ค้นหา
        </span>
        <span className="flex items-center gap-1">
          <Kbd>z</Kbd> เต็มจอ
        </span>
        <span className="flex items-center gap-1">
          <Kbd>Esc</Kbd> {vimMode ? "normal mode" : "ออกจากช่องพิมพ์"}
        </span>
      </div>
    </div>
  );
}
