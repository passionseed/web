"use client";

import { useDraggable } from "@dnd-kit/core";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { shortDate } from "@/lib/hackathon/elemental/bangkok-date";
import {
  daysSinceTouch,
  ELEMENT_LABEL,
  isNextStepOverdue,
  isStale,
  neighbourStage,
  STAGE_LABEL,
  type PipelineItem,
  type PipelineStage,
} from "@/lib/hackathon/elemental/pipeline";
import { cn } from "@/lib/utils";

export const formatBaht = (n: number) => `฿${n.toLocaleString("en-US")}`;

/** Final stages need no touching. */
export const isOpenStage = (s: PipelineStage) => s !== "signed" && s !== "no";

export function MerchTag() {
  return <span className="rounded border px-1 py-px text-[10px] leading-none text-muted-foreground">merch</span>;
}

function CardBody({ item, today }: { item: PipelineItem; today: string }) {
  const overdue = isNextStepOverdue(item, today);
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 break-words text-sm font-medium leading-snug">{item.name}</span>
        {item.amount_thb != null && item.amount_thb > 0 && (
          <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-foreground">
            {item.in_kind && <MerchTag />}
            {formatBaht(item.amount_thb)}
          </span>
        )}
      </div>
      {item.organisation && <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.organisation}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {item.element && (
          <span className="rounded border px-1.5 py-px text-[11px] text-foreground/90">{ELEMENT_LABEL[item.element]}</span>
        )}
        <span className="truncate">{item.owner ?? "No owner"}</span>
      </div>
      {(item.next_step || item.next_step_due) && (
        <p className={cn("mt-2 text-xs leading-snug", overdue ? "text-destructive" : "text-muted-foreground")}>
          {item.next_step_due && (
            <span className="tabular-nums">{overdue ? `Overdue ${shortDate(item.next_step_due)}` : shortDate(item.next_step_due)}</span>
          )}
          {item.next_step_due && item.next_step && ": "}
          {item.next_step}
        </p>
      )}
    </>
  );
}

/** Days since anyone touched it, red once a live conversation goes stale. */
export function TouchAge({ item, today }: { item: PipelineItem; today: string }) {
  const days = daysSinceTouch(item, today);
  const stale = isStale(item, today);
  return (
    <span
      className={cn("text-[11px] tabular-nums", stale ? "text-destructive" : "text-muted-foreground")}
      title={stale ? `Not touched for ${days} days` : `Last touched ${days === 0 ? "today" : `${days}d ago`}`}
    >
      {days === 0 ? "today" : `${days}d`}
      <span className="sr-only">{stale ? ", stale" : " since last touch"}</span>
    </span>
  );
}

/** A deal card. Long-press (touch) or drag (mouse) to move it to another column. */
export function PipelineCard({
  item,
  today,
  selected,
  onOpen,
  onMove,
  onTouch,
  dragging,
}: {
  item: PipelineItem;
  today: string;
  selected?: boolean;
  onOpen: (id: string) => void;
  /** `from` says which arrow was used, so the board can put focus back on it. */
  onMove: (id: string, stage: PipelineStage, from?: "left" | "right") => void;
  onTouch: (id: string) => void;
  dragging?: boolean;
}) {
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: item.id, disabled: item.id.startsWith("temp-") });
  const left = neighbourStage(item.stage, -1);
  const right = neighbourStage(item.stage, 1);
  const pending = item.id.startsWith("temp-");

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      data-card-id={item.id}
      className={cn(
        "group relative rounded-md border bg-background/70 p-2.5 transition-colors hover:border-foreground/25",
        !item.owner && "border-dashed",
        selected && "border-primary/70",
        (isDragging || dragging) && "opacity-40",
        pending && "opacity-60",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(item.id)}
        disabled={pending}
        data-open=""
        className="block w-full text-left focus-visible:outline-none"
        aria-label={`Open ${item.name}`}
      >
        <CardBody item={item} today={today} />
      </button>
      <div className="mt-1.5 flex items-center gap-1">
        <TouchAge item={item} today={today} />
        {isOpenStage(item.stage) && !pending && (
          <button
            type="button"
            onClick={() => onTouch(item.id)}
            className="ml-1 min-h-9 rounded px-1.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground md:min-h-0 md:py-1"
            aria-label={`Touched ${item.name} today`}
          >
            Touched
          </button>
        )}
        <span className="ml-auto flex gap-1">
          {left && (
            <button
              type="button"
              onClick={() => onMove(item.id, left, "left")}
              disabled={pending}
              data-move="left"
              className="grid min-h-9 min-w-9 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground md:min-h-0 md:min-w-0 md:p-1"
              aria-label={`Move ${item.name} to ${STAGE_LABEL[left]}`}
              title={`Move to ${STAGE_LABEL[left]}`}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
          {right && (
            <button
              type="button"
              onClick={() => onMove(item.id, right, "right")}
              disabled={pending}
              data-move="right"
              className="grid min-h-9 min-w-9 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground md:min-h-0 md:min-w-0 md:p-1"
              aria-label={`Move ${item.name} to ${STAGE_LABEL[right]}`}
              title={`Move to ${STAGE_LABEL[right]}`}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </span>
      </div>
    </div>
  );
}

/** The card as it follows the pointer while dragging. */
export function PipelineCardGhost({ item, today }: { item: PipelineItem; today: string }) {
  return (
    <div className="w-60 rounded-md border border-foreground/30 bg-background p-2.5 shadow-lg">
      <CardBody item={item} today={today} />
    </div>
  );
}
