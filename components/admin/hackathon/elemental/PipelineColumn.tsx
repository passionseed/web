"use client";

import { useState, type FormEvent } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NEEDS_NEXT_STEP,
  STAGE_LABEL,
  type ColumnSummary,
  type PipelineItem,
  type PipelineKind,
  type PipelineStage,
} from "@/lib/hackathon/elemental/pipeline";
import type { Owner } from "@/lib/hackathon/elemental/targets";
import { cn } from "@/lib/utils";

import { OwnerSelect } from "./OwnerSelect";
import { formatBaht, PipelineCard } from "./PipelineCard";

export type QuickAddExtra = { owner: Owner | null; next_step: string | null; next_step_due: string | null };

/** One stage column: header with count, cash and weighted cash, quick add, then the cards. */
export function PipelineColumn({
  stage,
  kind,
  items,
  summary,
  today,
  draggingId,
  selectedId,
  defaultOwner,
  onOpen,
  onMove,
  onTouch,
  onQuickAdd,
  onCollapse,
}: {
  stage: PipelineStage;
  kind: PipelineKind;
  items: PipelineItem[];
  summary: ColumnSummary;
  today: string;
  draggingId: string | null;
  selectedId: string | null;
  defaultOwner: Owner | null;
  onOpen: (id: string) => void;
  onMove: (id: string, stage: PipelineStage, from?: "left" | "right") => void;
  onTouch: (id: string) => void;
  onQuickAdd: (name: string, stage: PipelineStage, extra: QuickAddExtra) => void;
  /** Shown on the No pile: fold it back. */
  onCollapse?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  // Undefined until someone picks, so it follows the owner chip chosen on the page.
  const [pickedOwner, setOwner] = useState<Owner | null | undefined>(undefined);
  const owner = pickedOwner === undefined ? defaultOwner : pickedOwner;
  const [nextStep, setNextStep] = useState("");
  const [due, setDue] = useState("");
  const needsPlan = NEEDS_NEXT_STEP.includes(stage);
  const ready = name.trim() !== "" && (!needsPlan || (nextStep.trim() !== "" && due !== ""));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = name.trim();
    if (!v || !ready) return;
    onQuickAdd(v, stage, {
      owner,
      next_step: needsPlan ? nextStep.trim() : null,
      next_step_due: needsPlan ? due : null,
    });
    setName("");
    setNextStep("");
    setDue("");
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-[15.5rem] shrink-0 flex-col rounded-lg border bg-muted/20 transition-colors",
        isOver && "border-primary/50 bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-sm font-medium">{STAGE_LABEL[stage]}</h3>
            <span className="text-xs tabular-nums text-muted-foreground">{summary.count}</span>
          </div>
          {kind === "sponsor" && stage !== "no" && (
            <div className="text-xs tabular-nums text-muted-foreground">
              {formatBaht(summary.baht)}
              {stage !== "signed" && summary.baht > 0 && <> · weighted {formatBaht(summary.weighted)}</>}
            </div>
          )}
        </div>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            className="ml-auto min-h-9 rounded px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground md:min-h-0 md:px-1.5 md:py-1"
          >
            Hide
          </button>
        )}
        {stage !== "no" && (
        <button
          type="button"
          onClick={() => setAdding((a) => !a)}
          className="grid min-h-9 min-w-9 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground md:min-h-0 md:min-w-0 md:p-1.5"
          aria-label={`Add to ${STAGE_LABEL[stage]}`}
          aria-expanded={adding}
        >
          <Plus className="h-4 w-4" />
        </button>
        )}
      </div>

      {adding && (
        <form
          onSubmit={submit}
          className="space-y-1.5 border-b p-2"
          onKeyDown={(e) => {
            if (e.key === "Escape") setAdding(false);
          }}
        >
          <div className="flex gap-1.5">
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              aria-label={`New name in ${STAGE_LABEL[stage]}`}
              maxLength={200}
              className="h-9 text-base md:h-8 md:text-sm"
            />
            <Button type="submit" size="sm" className="h-9 md:h-8" disabled={!ready}>
              Add
            </Button>
          </div>
          <OwnerSelect value={owner} onChange={setOwner} label={`Owner of the new card in ${STAGE_LABEL[stage]}`} className="h-9 md:h-8" />
          {needsPlan && (
            <>
              <Input
                value={nextStep}
                onChange={(e) => setNextStep(e.target.value)}
                placeholder="Next step"
                aria-label="Next step"
                maxLength={500}
                className="h-9 text-base md:h-8 md:text-sm"
              />
              <Input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                aria-label="Next step by"
                className="h-9 text-base md:h-8 md:text-sm"
              />
            </>
          )}
        </form>
      )}

      <div className="flex min-h-24 flex-col gap-2 p-2">
        {items.length === 0 && !adding && (
          <p className="px-1 py-3 text-center text-xs text-muted-foreground">Nothing here</p>
        )}
        {items.map((item) => (
          <PipelineCard
            key={item.id}
            item={item}
            today={today}
            selected={selectedId === item.id}
            onOpen={onOpen}
            onMove={onMove}
            onTouch={onTouch}
            dragging={draggingId === item.id}
          />
        ))}
      </div>
    </div>
  );
}

/** The "No" pile, collapsed to a narrow drop target until opened. */
export function NoPileCollapsed({ onOpen, count }: { onOpen: () => void; count: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: "no" });
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-20 shrink-0 flex-col items-center justify-start gap-1 rounded-lg border border-dashed px-2 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground",
        isOver && "border-primary/50 bg-primary/5",
      )}
      aria-label={`Show the No pile, ${count}`}
    >
      <span>No</span>
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
