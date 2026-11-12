"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { BookOpen, FileText, Film, ImageIcon, ListChecks, Music, Paperclip, Sparkles, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { personalizeLeadCopyAction, replyToLead, sendQuickReplyButtons } from "@/app/admin/dm-leads/actions";
import { uploadDmAttachment } from "@/lib/dm-leads/upload-image-client";
import {
  contextFromConversation,
  getQuickReplies,
  type QuickReply,
} from "@/lib/dm-leads/quick-replies";
import { QUICK_REPLY_SETS } from "@/lib/dm-leads/quick-reply-buttons";
import { DmLeadScripts } from "@/components/admin/DmLeadScripts";
import { PlanGeneratorModal } from "@/components/admin/PlanGeneratorModal";
import type { MetaAttachmentType } from "@/lib/meta/graph";
import type { DmConversation } from "@/types/dm-leads";
import type { DmLeadBucket, FieldCoverage } from "@/lib/dm-leads/playbook";

const TONE_STYLES: Record<string, string> = {
  cta: "border-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70",
  guide: "border-sky-300 bg-sky-50 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:hover:bg-sky-950/70",
  qualify:
    "border-violet-300 bg-violet-50 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:hover:bg-violet-950/70",
};

export const DM_REPLY_TEXTAREA_ID = "dm-reply-textarea";

/** Client-side guess only, for preview rendering — the upload route is the source of truth. */
function guessAttachmentKind(file: File): MetaAttachmentType {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

interface DmLeadReplyFormProps {
  conversation: Pick<
    DmConversation,
    | "id"
    | "platform"
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
  bucket?: DmLeadBucket;
  coverage?: FieldCoverage;
  /** Controlled body — when provided, onBodyChange must be too. */
  body?: string;
  onBodyChange?: (body: string) => void;
  /** Controlled attached file (pasted image or picked video/audio/file). */
  attachedFile?: File | null;
  onAttachedFileChange?: (file: File | null) => void;
  /** Called after a reply is successfully sent. Passes whether it included an attachment. */
  onSent?: (hadAttachment: boolean) => void;
  /**
   * When provided, overrides the built-in send handler (e.g. for optimistic
   * UI). Receives the attached file, if any, so the caller can upload it.
   */
  onSend?: (attachedFile: File | null) => void;
  /** Externally controlled pending state — used together with onSend. */
  isPending?: boolean;
  /** Externally controlled error — used together with onSend. */
  error?: string | null;
}

export function DmLeadReplyForm({
  conversation,
  bucket,
  coverage,
  body: controlledBody,
  onBodyChange,
  attachedFile: controlledAttachedFile,
  onAttachedFileChange,
  onSent,
  onSend,
  isPending: controlledIsPending,
  error: controlledError,
}: DmLeadReplyFormProps) {
  const [internalBody, setInternalBody] = useState("");
  const [internalAttachedFile, setInternalAttachedFile] = useState<File | null>(null);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [internalIsPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const body = controlledBody ?? internalBody;
  const setBody = (value: string) => {
    if (onBodyChange) onBodyChange(value);
    else setInternalBody(value);
  };
  const attachedFile = controlledAttachedFile ?? internalAttachedFile;
  const setAttachedFile = (file: File | null) => {
    if (onAttachedFileChange) onAttachedFileChange(file);
    else setInternalAttachedFile(file);
  };
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!attachedFile || guessAttachmentKind(attachedFile) !== "image") {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(attachedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [attachedFile]);
  const error = onSend ? controlledError ?? null : internalError;
  const isPending = onSend ? controlledIsPending ?? false : internalIsPending;

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData?.items ?? []);
    const imageItem = items.find((item) => item.type.startsWith("image/"));
    if (!imageItem) return;
    const file = imageItem.getAsFile();
    if (!file) return;
    e.preventDefault();
    setAttachedFile(file);
  };

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) setAttachedFile(file);
  };

  const suggestions = useMemo(
    () => getQuickReplies(contextFromConversation(conversation)),
    [conversation]
  );
  const [personalizingId, setPersonalizingId] = useState<string | null>(null);

  /**
   * Rewrites the chosen suggestion only when the operator picks it. Doing all
   * of them up front cost one serialized LLM round trip per suggestion before
   * the operator had asked for anything.
   */
  const insertSuggestion = async (suggestion: QuickReply) => {
    setPersonalizingId(suggestion.id);
    try {
      const result = await personalizeLeadCopyAction({
        conversationId: conversation.id,
        template: suggestion.body,
        kind: "quick_reply",
      });
      setBody(result.body);
    } finally {
      setPersonalizingId(null);
    }
  };

  const handleSend = () => {
    if (onSend) {
      onSend(attachedFile);
      return;
    }
    setInternalError(null);
    startTransition(async () => {
      let attachmentUrl: string | undefined;
      let attachmentType: MetaAttachmentType | undefined;
      if (attachedFile) {
        const uploaded = await uploadDmAttachment(attachedFile, conversation.id);
        if (!uploaded.ok) {
          setInternalError(uploaded.error);
          return;
        }
        attachmentUrl = uploaded.url;
        attachmentType = uploaded.attachmentType;
      }
      const result = await replyToLead(conversation.id, body, attachmentUrl, attachmentType);
      if (!result.ok) {
        setInternalError(result.error);
        return;
      }
      const hadAttachment = Boolean(attachedFile);
      setBody("");
      setAttachedFile(null);
      onSent?.(hadAttachment);
    });
  };

  // Quick-reply button sets are self-contained: they always send directly
  // (not through onSend's optimistic-UI path), since they bypass the
  // text/attachment composer entirely. Works the same whether this form is
  // controlled or not.
  const [quickReplyPending, setQuickReplyPending] = useState<string | null>(null);
  const [quickReplyError, setQuickReplyError] = useState<string | null>(null);
  const handleSendQuickReplySet = (setId: string) => {
    const set = QUICK_REPLY_SETS.find((s) => s.id === setId);
    if (!set) return;
    setQuickReplyError(null);
    setQuickReplyPending(setId);
    startTransition(async () => {
      const result = await sendQuickReplyButtons(conversation.id, set.prompt, set.options);
      setQuickReplyPending(null);
      if (!result.ok) {
        setQuickReplyError(result.error);
        return;
      }
      onSent?.(false);
    });
  };

  return (
    <div className="space-y-2">
      {/* Unified Reply Assistant Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-lg border bg-muted/30 px-2.5 py-1.5">
        {/* Left: Quick replies suggestions */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3 text-amber-500" /> แนะนำ:
          </span>
          {suggestions.map((s, i) => (
            <button
              key={s.id}
              type="button"
              title={s.body}
              onClick={() => void insertSuggestion(s)}
              disabled={isPending || personalizingId !== null}
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-50",
                TONE_STYLES[s.tone]
              )}
            >
              <span className="mr-1 opacity-50">{i + 1}.</span>
              {s.label}
              {personalizingId === s.id && <span className="ml-1 opacity-60">…</span>}
            </button>
          ))}
        </div>

        {/* Right: Integrated Tool Actions */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* 1. Scripts & Objections Popover */}
          {bucket && coverage && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6.5 gap-1 rounded-full px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  <BookOpen className="h-3 w-3" />
                  สคริปต์ &amp; ตอบข้อโต้แย้ง ▾
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-88 max-h-[420px] overflow-y-auto p-3 text-xs shadow-lg">
                <DmLeadScripts
                  bucket={bucket}
                  coverage={coverage}
                  conversationId={conversation.id}
                  onInsert={(text) => {
                    setBody(text);
                    document.getElementById(DM_REPLY_TEXTAREA_ID)?.focus();
                  }}
                />
              </PopoverContent>
            </Popover>
          )}

          {/* 2. Interactive Quick Reply Buttons Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6.5 gap-1 rounded-full px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                disabled={quickReplyPending !== null}
              >
                <ListChecks className="h-3 w-3" />
                {quickReplyPending ? "กำลังส่ง…" : "ส่งปุ่มถาม ▾"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              {QUICK_REPLY_SETS.map((set) => (
                <DropdownMenuItem
                  key={set.id}
                  onClick={() => handleSendQuickReplySet(set.id)}
                  className="cursor-pointer text-xs flex flex-col items-start py-1.5"
                >
                  <span className="font-semibold text-foreground">{set.label}</span>
                  <span className="text-[10px] text-muted-foreground line-clamp-1">
                    {set.prompt} ({set.options.map((o) => o.title).join(" / ")})
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 3. Plan Generator Modal Button */}
          <PlanGeneratorModal
            conversation={conversation}
            onInsertReply={(text) => setBody(text)}
            triggerVariant="outline"
            triggerClassName="h-6.5 text-[11px] gap-1 px-2 rounded-full border-sky-500/30 bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 dark:text-sky-300 font-medium"
            compact={true}
          />
        </div>
      </div>
      {quickReplyError && <p className="text-sm text-destructive">{quickReplyError}</p>}
      {attachedFile && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Pasted image preview" className="h-16 w-16 rounded object-cover" />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-background">
              {guessAttachmentKind(attachedFile) === "video" && <Film className="h-4 w-4" />}
              {guessAttachmentKind(attachedFile) === "audio" && <Music className="h-4 w-4" />}
              {guessAttachmentKind(attachedFile) === "file" && <FileText className="h-4 w-4" />}
            </span>
          )}
          <span className="min-w-0 flex-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 truncate">
              <ImageIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{attachedFile.name}</span>
            </span>
            <span className="opacity-70">Will send as a separate message</span>
          </span>
          <button
            type="button"
            onClick={() => setAttachedFile(null)}
            disabled={isPending}
            className="ml-auto shrink-0 rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-50"
            aria-label="Remove attached file"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div className="relative">
        <Textarea
          id={DM_REPLY_TEXTAREA_ID}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (
              (e.metaKey || e.ctrlKey) &&
              e.key === "Enter" &&
              (body.trim() || attachedFile) &&
              !isPending
            ) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a reply, paste an image, or attach a file (⌘/Ctrl + Enter to send)"
          rows={3}
          disabled={isPending}
          className="pr-9"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*,application/pdf"
          className="hidden"
          onChange={handleFilePicked}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}
          title="Attach a file"
          className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-50"
        >
          <Paperclip className="h-4 w-4" />
        </button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end">
        <Button size="sm" onClick={handleSend} disabled={isPending || (!body.trim() && !attachedFile)}>
          {isPending ? "Sending…" : "Send ⌘↵"}
        </Button>
      </div>
    </div>
  );
}
