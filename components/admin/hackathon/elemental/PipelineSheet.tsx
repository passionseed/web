"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  AMOUNT_PRESETS,
  ELEMENT_LABEL,
  KIND_LABEL,
  neighbourStage,
  PIPELINE_ELEMENTS,
  PIPELINE_KINDS,
  PIPELINE_STAGES,
  STAGE_LABEL,
  type PipelineItem,
  type PipelineKind,
  type PipelineStage,
  type PipelineUpdateInput,
} from "@/lib/hackathon/elemental/pipeline";
import { cn } from "@/lib/utils";

import { OwnerSelect } from "./OwnerSelect";
import { isOpenStage } from "./PipelineCard";
import { diff, planKey, toDraft, withPlanFrom, type AmountChoice, type Draft } from "./pipeline-draft";

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * Edit every field of one card. The parent keys it on the card and on each
 * opening, so every opening starts from a fresh draft, and keeps it mounted
 * while closing so it slides out.
 */
export function PipelineSheet({
  item,
  open,
  onOpenChange,
  onSave,
  onMove,
  onTouch,
  onDelete,
}: {
  item: PipelineItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, patch: PipelineUpdateInput) => Promise<boolean>;
  /** Moves through the board, so a move that needs a next step or a reason asks for it first. */
  onMove: (id: string, stage: PipelineStage) => void;
  onTouch: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(item ? toDraft(item) : null);
  // A move or "Touched today" answered from this sheet saves a new next step
  // and date on the card; take them into the draft so Save neither blocks
  // nor writes the old ones back.
  const plan = item ? planKey(item) : "";
  const [seenPlan, setSeenPlan] = useState(plan);
  if (plan !== seenPlan) {
    setSeenPlan(plan);
    if (item) setDraft((d) => (d ? withPlanFrom(d, item) : d));
  }
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 4000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  if (!item || !draft) return null;

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const patch = diff(item, draft);
  const invalid = "error" in patch;
  const dirty = !invalid && Object.keys(patch).length > 0;
  const left = neighbourStage(item.stage, -1);
  const right = neighbourStage(item.stage, 1);

  const save = async () => {
    if ("error" in patch) {
      setError(patch.error as string);
      return;
    }
    if (!dirty) return;
    setSaving(true);
    setError(null);
    const ok = await onSave(item.id, patch);
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle className="pr-6 text-base font-medium">{item.name}</SheetTitle>
          <SheetDescription className="text-xs">
            {KIND_LABEL[item.kind].replace(/s$/, "")} · {STAGE_LABEL[item.stage]}
            {item.updated_by && <> · last saved by {item.updated_by}</>}
          </SheetDescription>
          {isOpenStage(item.stage) && (
            <div>
              <Button type="button" variant="outline" size="sm" className="mt-2 h-9 md:h-8" onClick={() => onTouch(item.id)}>
                Touched today
              </Button>
            </div>
          )}
        </SheetHeader>

        <div className="space-y-4 px-5 py-4">
          <Field label="Stage" htmlFor="pl-stage">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                disabled={!left}
                onClick={() => left && onMove(item.id, left)}
                aria-label={left ? `Move to ${STAGE_LABEL[left]}` : "No stage to the left"}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Select value={item.stage} onValueChange={(v) => onMove(item.id, v as PipelineStage)}>
                <SelectTrigger id="pl-stage" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STAGE_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                disabled={!right}
                onClick={() => right && onMove(item.id, right)}
                aria-label={right ? `Move to ${STAGE_LABEL[right]}` : "No stage to the right"}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Kind" htmlFor="pl-kind">
              <Select value={draft.kind} onValueChange={(v) => set("kind", v as PipelineKind)}>
                <SelectTrigger id="pl-kind" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {KIND_LABEL[k].replace(/s$/, "")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Element" htmlFor="pl-element">
              <Select value={draft.element} onValueChange={(v) => set("element", v as Draft["element"])}>
                <SelectTrigger id="pl-element" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {PIPELINE_ELEMENTS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {ELEMENT_LABEL[e]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Name" htmlFor="pl-name">
            <Input id="pl-name" value={draft.name} maxLength={200} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Organisation" htmlFor="pl-org">
            <Input id="pl-org" value={draft.organisation} maxLength={200} onChange={(e) => set("organisation", e.target.value)} />
          </Field>
          <Field label="Owner" htmlFor="pl-owner">
            <OwnerSelect id="pl-owner" value={draft.owner} onChange={(v) => set("owner", v)} />
          </Field>
          <fieldset className="space-y-1.5">
            <legend className="text-xs text-muted-foreground">Amount (baht)</legend>
            <ToggleGroup
              type="single"
              value={draft.amount_choice}
              onValueChange={(v) => v && set("amount_choice", v as AmountChoice)}
              aria-label="Amount"
              className="flex flex-wrap justify-start gap-1.5"
            >
              {[...AMOUNT_PRESETS.map((n) => ({ v: String(n), label: n.toLocaleString("en-US") })), { v: "other", label: "Other" }, { v: "none", label: "None" }].map(
                (o) => (
                  <ToggleGroupItem
                    key={o.v}
                    value={o.v}
                    className={cn(
                      "h-9 rounded-md border px-3 text-sm font-normal tabular-nums text-muted-foreground hover:text-foreground md:h-8",
                      "data-[state=on]:border-primary/60 data-[state=on]:bg-transparent data-[state=on]:text-foreground",
                    )}
                  >
                    {o.label}
                  </ToggleGroupItem>
                ),
              )}
            </ToggleGroup>
            {draft.amount_choice === "other" && (
              <Input
                aria-label="Other amount in baht"
                inputMode="numeric"
                value={draft.amount_other}
                onChange={(e) => set("amount_other", e.target.value)}
                placeholder="2500"
                className="tabular-nums"
              />
            )}
            <ToggleGroup
              type="single"
              value={draft.in_kind ? "merch" : "cash"}
              onValueChange={(v) => v && set("in_kind", v === "merch")}
              aria-label="Cash or merchandise"
              className="inline-flex gap-0 rounded-md border bg-muted/30 p-0.5"
            >
              {[
                { v: "cash", label: "Cash" },
                { v: "merch", label: "Merchandise" },
              ].map((o) => (
                <ToggleGroupItem
                  key={o.v}
                  value={o.v}
                  className={cn(
                    "h-9 min-w-0 rounded px-3 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground md:h-7",
                    "data-[state=on]:bg-background data-[state=on]:font-medium data-[state=on]:text-foreground data-[state=on]:shadow-sm",
                  )}
                >
                  {o.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">Merchandise counts on its own and never fills the cash prize pool.</p>
          </fieldset>
          <Field label="Why they fit" htmlFor="pl-why">
            <Textarea id="pl-why" rows={3} value={draft.why_fit} maxLength={2000} onChange={(e) => set("why_fit", e.target.value)} />
          </Field>
          <Field
            label="Reach"
            htmlFor="pl-reach"
            hint="A public page or channel, like a website or a Facebook page. Never a personal phone number."
          >
            <Input id="pl-reach" value={draft.reach} maxLength={500} onChange={(e) => set("reach", e.target.value)} />
          </Field>
          <div className="grid grid-cols-[1fr_9.5rem] gap-3">
            <Field label="Next step" htmlFor="pl-next">
              <Input id="pl-next" value={draft.next_step} maxLength={500} onChange={(e) => set("next_step", e.target.value)} />
            </Field>
            <Field label="By" htmlFor="pl-due">
              <Input id="pl-due" type="date" value={draft.next_step_due} onChange={(e) => set("next_step_due", e.target.value)} />
            </Field>
          </div>
          <Field label="Notes" htmlFor="pl-notes">
            <Textarea id="pl-notes" rows={4} value={draft.notes} maxLength={5000} onChange={(e) => set("notes", e.target.value)} />
          </Field>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t px-5 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={confirmDelete ? "text-destructive" : "text-muted-foreground"}
            onClick={() => {
              if (confirmDelete) onDelete(item.id);
              else setConfirmDelete(true);
            }}
          >
            {confirmDelete ? "Tap again to delete" : "Delete"}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={(!dirty && !invalid) || saving}>
              {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
