"use client";

import { useState } from "react";
import { Check, Copy, Loader2, MessageSquare, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBangkokDateTime } from "@/lib/shift/applicationStats";
import { isDiscordOAuthJoinError } from "@/lib/shift/discordErrors";
import { firstMeetLabel, getShiftCohortByName } from "@/lib/content/shift-cohort";
import { joinConfirmMessage, kickoffMessage } from "@/lib/shift/paymentMessage";
import type { AdminShiftApplication as Application } from "@/lib/admin/queue-tools/shift-applications";

/**
 * Applicants link Discord from the apply page. After payment: copy the
 * welcome message (with the student's personal /shift/join link) for anyone
 * who has not linked yet, then watch them land in the server.
 * The join token is never in the list data; the link is fetched only when an
 * admin copies a message.
 */

type DiscordStatus = { label: string; variant: "default" | "secondary" | "destructive" | "outline" };

export function discordStatus(
  app: Pick<Application, "status" | "paid_at" | "linked_at" | "discord_joined_at" | "discord_error">,
): DiscordStatus | null {
  // Unpaid and unlinked is the normal state of a fresh application: no badge.
  if (!app.linked_at) return app.paid_at ? { label: "Not linked", variant: "outline" } : null;
  if (app.status === "declined") {
    return app.discord_joined_at
      ? { label: "Declined, role still on", variant: "destructive" }
      : { label: "Role removed", variant: "outline" };
  }
  if (app.discord_joined_at && !app.discord_error) return { label: "In Discord", variant: "default" };
  if (app.discord_error === "not_in_server") return { label: "Linked, not in server", variant: "secondary" };
  if (isDiscordOAuthJoinError(app.discord_error)) return { label: "Join via invite", variant: "secondary" };
  if (app.discord_error) return { label: "Discord error", variant: "destructive" };
  return { label: "Linked", variant: "secondary" };
}

type CreateLink = (id: string) => Promise<string | null>;

type MessageButtonProps = {
  application: Application;
  onCreateLink: CreateLink;
  compact?: boolean;
};

/** Fetches the student's personal join link, builds a message around it, and
 *  copies it, ready to paste into LINE or Discord. */
function CopyMessageButton({
  application: app,
  onCreateLink,
  compact = false,
  label,
  icon: IdleIcon,
  build,
}: MessageButtonProps & { label: string; icon: LucideIcon; build: (joinUrl: string) => string }) {
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    setPending(true);
    const url = await onCreateLink(app.id);
    setPending(false);
    if (!url) return;
    const message = build(url);
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success(`Copied ${app.nickname}'s ${label.toLowerCase()}. Paste it in their chat.`);
    } catch {
      toast.message(message);
    }
  }

  const Icon = pending ? Loader2 : copied ? Check : IdleIcon;
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={copy}
      disabled={pending}
      className={compact ? "h-7 px-2" : undefined}
      aria-label={`Copy ${label.toLowerCase()} for ${app.nickname}`}
      title={label}
    >
      <Icon className={`h-4 w-4 ${pending ? "animate-spin" : ""} ${compact ? "" : "mr-2"}`} />
      {!compact && `Copy ${label.toLowerCase()}`}
    </Button>
  );
}

/** The welcome message sent once the slip checks out. */
export function CopyJoinMessageButton(props: MessageButtonProps) {
  const app = props.application;
  return (
    <CopyMessageButton
      {...props}
      label="Join message"
      icon={Copy}
      build={(joinUrl) => joinConfirmMessage({ cohortName: app.cohort, nickname: app.nickname, joinUrl })}
    />
  );
}

/** The day-before message: when the round meets, the join link, and the
 *  three Day 1 idea questions. */
export function CopyKickoffMessageButton(props: MessageButtonProps) {
  const app = props.application;
  const cohort = getShiftCohortByName(app.cohort);
  return (
    <CopyMessageButton
      {...props}
      label="Kickoff message"
      icon={MessageSquare}
      build={(joinUrl) =>
        kickoffMessage({
          cohortName: app.cohort,
          nickname: app.nickname,
          joinUrl,
          meetLabel: cohort ? firstMeetLabel(cohort) : null,
          startTime: cohort?.sessionTime.split("–")[0] ?? "19:00",
        })
      }
    />
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

      {!app.paid_at && !app.linked_at ? (
        <p className="text-sm text-muted-foreground">
          Not linked yet. Applicants link Discord right after applying; mark paid to copy the welcome message.
        </p>
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
          {app.paid_at ? (
            <div className="flex flex-wrap gap-2">
              <CopyJoinMessageButton application={app} onCreateLink={onCreateLink} />
              <CopyKickoffMessageButton application={app} onCreateLink={onCreateLink} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Mark paid to copy the welcome and kickoff messages.</p>
          )}
        </>
      )}
    </div>
  );
}
