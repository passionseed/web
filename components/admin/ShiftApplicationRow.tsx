"use client";

import { Fragment, useEffect, useState } from "react";
import { Check, ChevronDown, ChevronRight, Loader2, UserPlus } from "lucide-react";

import {
  CopyJoinMessageButton,
  CopyKickoffMessageButton,
  discordStatus,
  ShiftJoinLinkPanel,
} from "@/components/admin/ShiftJoinLinkPanel";
import {
  ParentConsentBadge,
  ShiftParentConsentPanel,
  type SendParentLink,
} from "@/components/admin/ShiftParentConsentPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  DIRECT_SOURCE,
  formatBangkokDateTime,
  truncateText,
} from "@/lib/shift/applicationStats";
import { SHIFT_AVAILABILITY, SHIFT_FOUND_VIA, SHIFT_GRADES } from "@/lib/shift/application";
import type { AdminShiftApplication as Application } from "@/lib/admin/queue-tools/shift-applications";
import { blocksPaidAdmission, parentConsentState } from "@/lib/shift/parentConsent";
import { cn } from "@/lib/utils";
import type { ShiftApplicationStatus } from "@/types/shift";

export interface ApplicationPatch {
  status?: ShiftApplicationStatus;
  paid?: boolean;
  admin_note?: string | null;
}

const STATUS_OPTIONS: { value: ShiftApplicationStatus; label: string; className: string }[] = [
  { value: "new", label: "New", className: "text-sky-600 dark:text-sky-400" },
  { value: "accepted", label: "Accepted", className: "text-emerald-600 dark:text-emerald-400" },
  { value: "waitlist", label: "Waitlist", className: "text-amber-600 dark:text-amber-400" },
  { value: "declined", label: "Declined", className: "text-muted-foreground" },
];

const COLUMN_COUNT = 10;

/** DOM id of an application's main row, for deep-link scrolling. */
export function applicationRowId(id: string): string {
  return `shift-application-row-${id}`;
}

function optionLabel(options: readonly { value: string; label: string }[], value: string) {
  return options.find((o) => o.value === value)?.label ?? value;
}

interface RowProps {
  application: Application;
  selected?: boolean;
  onSelectedChange?: (id: string, selected: boolean) => void;
  inTracker: boolean;
  /** Opened from a deep link (?id=): starts expanded and stays marked. */
  highlighted?: boolean;
  onPatch: (id: string, patch: ApplicationPatch) => Promise<boolean>;
  onAddToTracker: (application: Application) => Promise<void>;
  onCreateJoinLink: (id: string) => Promise<string | null>;
  onSendParentLink: SendParentLink;
}

export function ShiftApplicationRow(props: RowProps) {
  const { application: app, onPatch, selected = false, onSelectedChange, highlighted = false } = props;
  const [expanded, setExpanded] = useState(highlighted);
  // A new deep link to a row that is already on screen opens it too.
  useEffect(() => {
    if (highlighted) setExpanded(true);
  }, [highlighted]);
  const discord = discordStatus(app);
  // Under 20 the seat waits on the parent (PDPA); unmarking paid is always allowed.
  const paidLocked = app.paid_at === null && blocksPaidAdmission(parentConsentState(app));
  const detailId = `shift-application-${app.id}`;

  return (
    <Fragment>
      <TableRow
        id={applicationRowId(app.id)}
        className={cn(
          "cursor-pointer",
          expanded && "bg-muted/40",
          highlighted && "bg-primary/10 shadow-[inset_3px_0_0_hsl(var(--primary))] hover:bg-primary/15",
        )}
        data-state={selected ? "selected" : undefined}
        data-highlighted={highlighted || undefined}
        // Mouse shortcut; keyboard users use the expand button in the first cell.
        onClick={() => setExpanded((v) => !v)}
      >
        <TableCell className="w-8 pr-0" onClick={(e) => e.stopPropagation()}>
          {onSelectedChange && (
            <Checkbox
              checked={selected}
              onCheckedChange={(v) => onSelectedChange(app.id, v === true)}
              aria-label={`Select ${app.nickname}`}
            />
          )}
        </TableCell>
        <TableCell className="w-6 pr-0">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={expanded ? detailId : undefined}
            aria-label={`${expanded ? "Hide" : "Show"} details for ${app.nickname}`}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground active:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </TableCell>
        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
          {formatBangkokDateTime(app.created_at)}
        </TableCell>
        <TableCell className="font-medium">{app.nickname}</TableCell>
        <TableCell>{optionLabel(SHIFT_GRADES, app.grade)}</TableCell>
        <TableCell className="max-w-[140px] truncate">{app.target_track ?? "-"}</TableCell>
        <TableCell className="max-w-[280px] text-sm">{truncateText(app.problem, 80)}</TableCell>
        <TableCell className="text-xs">
          {app.found_via && (
            <span className="block font-medium">{optionLabel(SHIFT_FOUND_VIA, app.found_via)}</span>
          )}
          <span className={app.found_via ? "text-muted-foreground" : undefined}>
            {app.source ?? DIRECT_SOURCE}
          </span>
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <StatusSelect
            value={app.status}
            onChange={(status) => onPatch(app.id, { status })}
          />
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <Switch
              checked={app.paid_at !== null}
              onCheckedChange={(paid) => onPatch(app.id, { paid })}
              disabled={paidLocked}
              title={paidLocked ? "Needs the parent's consent first" : undefined}
              aria-label={`Mark ${app.nickname} paid`}
            />
            <ParentConsentBadge application={app} />
            {discord && (
              <Badge variant={discord.variant} className="whitespace-nowrap text-[10px]">
                {discord.label}
              </Badge>
            )}
            {app.paid_at && !app.linked_at && (
              <CopyJoinMessageButton application={app} onCreateLink={props.onCreateJoinLink} compact />
            )}
            {app.paid_at && (
              <CopyKickoffMessageButton application={app} onCreateLink={props.onCreateJoinLink} compact />
            )}
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow
          id={detailId}
          className={cn("bg-muted/20 hover:bg-muted/20", highlighted && "bg-primary/5 hover:bg-primary/5")}
        >
          <TableCell colSpan={COLUMN_COUNT} className="p-4">
            <ApplicationDetail {...props} />
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
}

function StatusSelect({
  value,
  onChange,
}: {
  value: ShiftApplicationStatus;
  onChange: (status: ShiftApplicationStatus) => void;
}) {
  const current = STATUS_OPTIONS.find((o) => o.value === value);
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ShiftApplicationStatus)}>
      <SelectTrigger className={cn("h-8 w-[120px] text-xs", current?.className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value} className={o.className}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap break-words text-sm">{value}</div>
    </div>
  );
}

function ApplicationDetail({
  application: app,
  inTracker,
  onPatch,
  onAddToTracker,
  onCreateJoinLink,
  onSendParentLink,
}: RowProps) {
  const [adding, setAdding] = useState(false);

  async function addToTracker() {
    setAdding(true);
    await onAddToTracker(app);
    setAdding(false);
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <DetailField label="Full name" value={app.full_name} />
          <DetailField label="Instagram" value={`@${app.ig_handle}`} />
          <DetailField label="Discord" value={app.discord_handle ?? "-"} />
          <DetailField label="Parent contact" value={app.parent_contact ?? "-"} />
          <DetailField
            label="Availability"
            value={optionLabel(SHIFT_AVAILABILITY, app.availability)}
          />
          <DetailField label="Consent" value={app.consent ? "Yes" : "No"} />
          {app.paid_at && (
            <DetailField label="Paid at" value={formatBangkokDateTime(app.paid_at)} />
          )}
        </div>
        <DetailField label="Problem" value={app.problem} />
        <Button size="sm" variant="outline" onClick={addToTracker} disabled={adding || inTracker}>
          {adding ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : inTracker ? (
            <Check className="mr-2 h-4 w-4" />
          ) : (
            <UserPlus className="mr-2 h-4 w-4" />
          )}
          {inTracker ? "In tracker" : "Add to tracker"}
        </Button>
      </div>
      <div className="space-y-4">
        <ShiftParentConsentPanel application={app} onSendLink={onSendParentLink} />
        <ShiftJoinLinkPanel application={app} onCreateLink={onCreateJoinLink} />
        <AdminNoteEditor
          key={app.admin_note ?? ""}
          initial={app.admin_note ?? ""}
          onSave={(note) => onPatch(app.id, { admin_note: note || null })}
        />
      </div>
    </div>
  );
}

function AdminNoteEditor({
  initial,
  onSave,
}: {
  initial: string;
  onSave: (note: string) => Promise<boolean>;
}) {
  const [note, setNote] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = note.trim() !== initial.trim();

  async function save() {
    setSaving(true);
    await onSave(note.trim());
    setSaving(false);
  }

  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">Admin note</div>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={5}
        maxLength={2000}
        placeholder="Call notes, payment slip, squad ideas..."
      />
      <Button size="sm" onClick={save} disabled={!dirty || saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save note
      </Button>
    </div>
  );
}
