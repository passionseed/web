"use client";

import { shortDate } from "@/lib/hackathon/elemental/bangkok-date";
import {
  BOARD_STAGES,
  daysSinceTouch,
  isNextStepOverdue,
  isStale,
  STAGE_LABEL,
  type ColumnSummary,
  type PipelineItem,
  type PipelineKind,
  type PipelineStage,
} from "@/lib/hackathon/elemental/pipeline";
import { cn } from "@/lib/utils";

import { formatBaht, MerchTag } from "./PipelineCard";

/**
 * The dense list: one row per card, overdue first, then by next-step date.
 * Rows are 32px on a desktop and tap-sized on a phone, where the less
 * urgent columns fold away so the page never scrolls sideways. Above it,
 * one line per stage with its count and, for sponsors, cash and weighted
 * cash, the same totals the board's column headers show.
 */
function StageTotals({ summaries, kind }: { summaries: Record<PipelineStage, ColumnSummary>; kind: PipelineKind }) {
  const stages = BOARD_STAGES.filter((s) => summaries[s].count > 0);
  if (stages.length === 0) return null;
  return (
    <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums text-muted-foreground" aria-label="Stage totals">
      {stages.map((s) => {
        const sum = summaries[s];
        return (
          <li key={s}>
            <span className="text-foreground">{STAGE_LABEL[s]}</span> {sum.count}
            {kind === "sponsor" && sum.baht > 0 && <> · {formatBaht(sum.baht)}</>}
            {kind === "sponsor" && s !== "signed" && sum.baht > 0 && <> · weighted {formatBaht(sum.weighted)}</>}
          </li>
        );
      })}
    </ul>
  );
}

export function PipelineTable({
  items,
  summaries,
  kind,
  today,
  selectedId,
  onSelect,
  onOpen,
}: {
  /** Already filtered and sorted. */
  items: PipelineItem[];
  /** Per-stage totals of the filtered cards of this kind. */
  summaries: Record<PipelineStage, ColumnSummary>;
  kind: PipelineKind;
  today: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  if (items.length === 0) return null;
  const money = kind !== "speaker";
  return (
    <>
      <StageTotals summaries={summaries} kind={kind} />
      <div className="-mx-4 overflow-x-auto sm:-mx-5">
        <table className="w-full table-fixed border-collapse text-[13px] leading-tight">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th scope="col" className="w-[36%] py-1.5 pl-4 pr-2 font-normal sm:w-[22%] sm:pl-5">
                Name
              </th>
              <th scope="col" className="hidden py-1.5 pr-2 font-normal lg:table-cell lg:w-[14%]">
                Organisation
              </th>
              <th scope="col" className="w-[28%] py-1.5 pr-2 font-normal sm:w-[10%]">
                Stage
              </th>
              {money && (
                <th scope="col" className="hidden py-1.5 pr-2 text-right font-normal sm:table-cell sm:w-[11%]">
                  Amount
                </th>
              )}
              <th scope="col" className="hidden py-1.5 pr-2 font-normal sm:table-cell sm:w-[8%]">
                Owner
              </th>
              <th scope="col" className="hidden py-1.5 pr-2 text-right font-normal md:table-cell md:w-[6%]" title="Days since anyone touched it">
                Days
              </th>
              <th scope="col" className="py-1.5 pr-4 font-normal sm:pr-5">
                Next step
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const overdue = isNextStepOverdue(it, today);
              const stale = isStale(it, today);
              // One number for both the count and the red: days since anyone touched it.
              const days = daysSinceTouch(it, today);
              const selected = selectedId === it.id;
              const pending = it.id.startsWith("temp-");
              return (
                <tr
                  key={it.id}
                  data-row-id={it.id}
                  aria-selected={selected}
                  onClick={() => {
                    if (pending) return;
                    onSelect(it.id);
                    onOpen(it.id);
                  }}
                  className={cn(
                    "h-11 cursor-pointer border-b tabular-nums hover:bg-muted/40 md:h-8",
                    selected && "bg-muted/60 shadow-[inset_2px_0_0_hsl(var(--primary))]",
                    pending && "opacity-60",
                  )}
                >
                  <td className="truncate py-1 pl-4 pr-2 sm:pl-5">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(it.id);
                        onOpen(it.id);
                      }}
                      className={cn("max-w-full truncate text-left font-medium focus-visible:underline focus-visible:outline-none", !it.owner && "underline decoration-dashed decoration-muted-foreground/60 underline-offset-4")}
                    >
                      {it.name}
                    </button>
                  </td>
                  <td className="hidden truncate py-1 pr-2 text-muted-foreground lg:table-cell">{it.organisation}</td>
                  <td className="truncate py-1 pr-2">
                    {STAGE_LABEL[it.stage]}
                    {/* Phones have no Days column, so a stale card says so here. */}
                    {stale && <span className="text-destructive md:hidden"> · {days}d</span>}
                  </td>
                  {money && (
                    <td className="hidden py-1 pr-2 text-right sm:table-cell">
                      {it.amount_thb ? (
                        <span className="inline-flex items-center gap-1">
                          {it.in_kind && <MerchTag />}
                          {formatBaht(it.amount_thb)}
                        </span>
                      ) : null}
                    </td>
                  )}
                  <td className={cn("hidden truncate py-1 pr-2 sm:table-cell", !it.owner && "text-muted-foreground")}>
                    {it.owner ?? "None"}
                  </td>
                  <td className={cn("hidden py-1 pr-2 text-right md:table-cell", stale ? "text-destructive" : "text-muted-foreground")}>
                    {days}
                  </td>
                  <td className={cn("truncate py-1 pr-4 sm:pr-5", overdue ? "text-destructive" : "text-muted-foreground")}>
                    {it.next_step_due && <span className="mr-1.5">{shortDate(it.next_step_due)}</span>}
                    <span className={cn(!overdue && "text-foreground/90")}>{it.next_step}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
