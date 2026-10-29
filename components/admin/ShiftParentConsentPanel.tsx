"use client";

import { useState } from "react";
import { Copy, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ageOn } from "@/lib/seedstack/consent";
import { formatBangkokDateTime } from "@/lib/shift/applicationStats";
import { parentConsentState, type ParentConsentState } from "@/lib/shift/parentConsent";
import type { ShiftApplicationRow as Application } from "@/types/shift";

/**
 * PDPA parent consent on the admin page: a badge beside the paid switch and
 * a detail panel to resend or copy the parent's link. Under 20, "mark paid"
 * stays locked until the parent agrees.
 */

export type SendParentLink = (id: string, send: "email" | "copy") => Promise<string | null>;

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const BADGES: Partial<Record<ParentConsentState, { label: string; variant: BadgeVariant }>> = {
  waiting: { label: "Waiting parent", variant: "outline" },
  agreed: { label: "Parent agreed", variant: "secondary" },
  declined: { label: "Parent declined", variant: "destructive" },
  withdrawn: { label: "Parent withdrew", variant: "destructive" },
};

const STATE_TEXT: Record<ParentConsentState, string> = {
  not_needed: "Not needed (20 or older)",
  legacy: "Applied before the consent flow: no parent record",
  waiting: "Waiting for the parent",
  agreed: "Agreed",
  declined: "Declined",
  withdrawn: "Withdrawn: decide the seat, refund and Discord role",
};

export function ParentConsentBadge({ application }: { application: Application }) {
  const badge = BADGES[parentConsentState(application)];
  if (!badge) return null;
  return (
    <Badge variant={badge.variant} className="whitespace-nowrap text-[10px]">
      {badge.label}
    </Badge>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap break-words text-sm">{value}</div>
    </div>
  );
}

export function ShiftParentConsentPanel({
  application: app,
  onSendLink,
}: {
  application: Application;
  onSendLink: SendParentLink;
}) {
  const [busy, setBusy] = useState<"email" | "copy" | null>(null);
  const state = parentConsentState(app);

  async function send(kind: "email" | "copy") {
    setBusy(kind);
    const url = await onSendLink(app.id, kind);
    setBusy(null);
    if (kind === "email" && url !== null) toast.success("Parent link emailed");
    if (kind === "copy" && url) {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Parent link copied. The previous link no longer works.");
      } catch {
        toast.message("Copy this link", { description: url });
      }
    }
  }

  const answeredAt = app.parent_consented_at ?? app.parent_declined_at;

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent consent (PDPA)</div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Birth date"
          value={app.birth_date ? `${app.birth_date} (age ${ageOn(app.birth_date)})` : "-"}
        />
        <Field label="Status" value={STATE_TEXT[state]} />
        <Field label="Parent email" value={app.parent_email ?? "-"} />
        <Field
          label="Email sent"
          value={app.parent_email_sent_at ? formatBangkokDateTime(app.parent_email_sent_at) : "Not sent"}
        />
        {answeredAt && (
          <>
            <Field
              label="Signed by"
              value={`${app.parent_name ?? "-"}${app.parent_relationship ? ` (${app.parent_relationship})` : ""}`}
            />
            <Field label="Answered" value={formatBangkokDateTime(answeredAt)} />
            <Field label="From IP" value={app.parent_consent_ip ?? "-"} />
            <Field label="AI tracking (SeedStack)" value={app.parent_ai_consented_at ? "Agreed" : "Not agreed"} />
          </>
        )}
      </div>
      {state !== "not_needed" && state !== "agreed" && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => send("email")} disabled={busy !== null || !app.parent_email}>
            {busy === "email" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
            Email parent link
          </Button>
          <Button size="sm" variant="outline" onClick={() => send("copy")} disabled={busy !== null}>
            {busy === "copy" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
            Copy link for LINE
          </Button>
        </div>
      )}
    </div>
  );
}
