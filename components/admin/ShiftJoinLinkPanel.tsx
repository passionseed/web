"use client";

import { useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBangkokDateTime } from "@/lib/shift/applicationStats";
import { isDiscordOAuthJoinError } from "@/lib/shift/discordErrors";
import { joinConfirmMessage } from "@/lib/shift/paymentMessage";
import type { ShiftApplicationRow as Application } from "@/types/shift";

/**
 * Post-payment step: copy the welcome message (with the student's personal
 * /shift/join link), then watch them link Discord and land in the server.
 */

type DiscordStatus = { label: string; variant: "default" | "secondary" | "destructive" | "outline" };

export function discordStatus(app: Application): DiscordStatus | null {
  if (!app.paid_at) return null;
  if (!app.linked_at) return { label: "Not linked", variant: "outline" };
  if (app.discord_joined_at && !app.discord_error) return { label: "In Discord", variant: "default" };
  if (app.discord_error === "not_in_server") return { label: "Linked, not in server", variant: "secondary" };
  if (isDiscordOAuthJoinError(app.discord_error)) return { label: "Join via invite", variant: "secondary" };
  if (app.discord_error) return { label: "Discord error", variant: "destructive" };
  return { label: "Linked", variant: "secondary" };
}

type CreateLink = (id: string) => Promise<string | null>;

/** Copies the welcome message with the student's personal join link, ready
 *  to paste into LINE or Discord. */
export function CopyJoinMessageButton({
  application: app,
  onCreateLink,
  compact = false,
}: {
  application: Application;
  onCreateLink: CreateLink;
  compact?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    setPending(true);
    const url = await onCreateLink(app.id);
    setPending(false);
    if (!url) return;
    const message = joinConfirmMessage({ cohortName: app.cohort, nickname: app.nickname, joinUrl: url });
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success(`Copied ${app.nickname}'s join message. Paste it in their chat.`);
    } catch {
      toast.message(message);
    }
  }

  const Icon = pending ? Loader2 : copied ? Check : Copy;
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={copy}
      disabled={pending}
      className={compact ? "h-7 px-2" : undefined}
      aria-label={`Copy join message for ${app.nickname}`}
    >
      <Icon className={`h-4 w-4 ${pending ? "animate-spin" : ""} ${compact ? "" : "mr-2"}`} />
      {!compact && "Copy join message"}
    </Button>
  );
}

export function ShiftJoinLinkPanel({
  application: app,
  onCreateLink,
}: {
  application: Application;
  onCreateLink: CreateLink;
}) {
  const status = discordStatus(app);

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Discord join</div>
        {status && <Badge variant={status.variant}>{status.label}</Badge>}
      </div>

      {!app.paid_at ? (
        <p className="text-sm text-muted-foreground">Mark paid to get the join link.</p>
      ) : (
        <>
          {app.discord_username && (
            <p className="text-sm">
              Discord: <span className="font-medium">@{app.discord_username}</span>
              {app.linked_at && (
                <span className="text-muted-foreground"> · linked {formatBangkokDateTime(app.linked_at)}</span>
              )}
            </p>
          )}
          {app.discord_error && app.discord_error !== "not_in_server" && (
            <p className="break-words text-xs text-destructive">
              {isDiscordOAuthJoinError(app.discord_error)
                ? "Discord is linked. Ask the student to join through the server invite, then reopen their join link and click receive role. For automatic joins, the bot token must belong to the same Discord app as Supabase OAuth."
                : app.discord_error}
            </p>
          )}
          <CopyJoinMessageButton application={app} onCreateLink={onCreateLink} />
        </>
      )}
    </div>
  );
}
