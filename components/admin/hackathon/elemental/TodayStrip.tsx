"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { shortDate } from "@/lib/hackathon/elemental/bangkok-date";
import { OWNERS } from "@/lib/hackathon/elemental/targets";
import {
  filterTodayRows,
  unmappedOwnerCount,
  type OwnerFilter,
  type TodayRow,
} from "@/lib/hackathon/elemental/today";
import { cn } from "@/lib/utils";

import { setOwnerPref, useOwnerPref } from "./owner-pref";
import { focusPipeline } from "./pipeline-focus";

const CAP = 7;

const SOURCE_LABEL: Record<TodayRow["source"], string> = {
  slips: "Slips",
  followup: "Follow-up",
  task: "Task",
  voice: "Voices",
};

const FILTERS: { value: OwnerFilter; label: string }[] = [
  ...OWNERS.map((o) => ({ value: o, label: o })),
  { value: "all", label: "All" },
];

function when(row: TodayRow, today: string): string | null {
  if (!row.due) return null;
  if (row.overdue) return `Overdue, ${shortDate(row.due)}`;
  return row.due === today ? "Today" : shortDate(row.due);
}

function Row({ row, today }: { row: TodayRow; today: string }) {
  const due = when(row, today);
  const body = (
    <>
      <span className="w-[4.5rem] shrink-0 text-xs text-muted-foreground">{SOURCE_LABEL[row.source]}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate group-hover:underline">{row.title}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {[row.detail, row.owner === "team" ? null : (row.owner ?? row.ownerLabel ?? "No owner")].filter(Boolean).join(" · ")}
        </span>
      </span>
      {due && (
        <span className={cn("shrink-0 text-xs tabular-nums", row.overdue ? "text-destructive" : "text-muted-foreground")}>
          {due}
        </span>
      )}
      {row.external && <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
    </>
  );
  const cls = "group flex min-h-11 items-center gap-3 py-1.5 text-sm md:min-h-9";
  return (
    <li>
      {row.external ? (
        <a href={row.href} target="_blank" rel="noopener noreferrer" className={cls}>
          {body}
        </a>
      ) : row.href.startsWith("#") ? (
        <a
          href={row.href}
          className={cls}
          onClick={(e) => {
            // Opens the card (or tab) even when the address already has this hash.
            if (focusPipeline(row.href)) e.preventDefault();
          }}
        >
          {body}
        </a>
      ) : (
        <Link href={row.href} className={cls}>
          {body}
        </Link>
      )}
    </li>
  );
}

/** What needs a person today, from every source, filtered by owner. First on the page. */
export function TodayStrip({ rows, today, partial }: { rows: TodayRow[]; today: string; partial: boolean }) {
  const owner = useOwnerPref();
  const [expanded, setExpanded] = useState(false);
  const shown = filterTodayRows(rows, owner);
  const visible = expanded ? shown : shown.slice(0, CAP);
  const more = shown.length - visible.length;
  const unmapped = owner === "all" ? 0 : unmappedOwnerCount(rows);

  return (
    <section aria-labelledby="today-title" className="min-w-0 rounded-lg border bg-card/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 id="today-title" className="text-base font-medium tracking-tight">
          Today <span className="text-sm font-normal tabular-nums text-muted-foreground">{shown.length}</span>
        </h2>
        <ToggleGroup
          type="single"
          value={owner}
          onValueChange={(v) => v && setOwnerPref(v as OwnerFilter)}
          aria-label="Whose list"
          className="inline-flex gap-0 rounded-md border bg-muted/30 p-0.5"
        >
          {FILTERS.map((f) => (
            <ToggleGroupItem
              key={f.value}
              value={f.value}
              className={cn(
                "h-9 min-w-0 rounded px-3 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground md:h-7 md:px-2.5",
                "data-[state=on]:bg-background data-[state=on]:font-medium data-[state=on]:text-foreground data-[state=on]:shadow-sm",
              )}
            >
              {f.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {shown.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {partial ? "Nothing due from what loaded. Some sources did not load, see below." : "Nothing due today. Good."}
        </p>
      ) : (
        <ul className="mt-2 divide-y">
          {visible.map((r) => (
            <Row key={r.key} row={r} today={today} />
          ))}
        </ul>
      )}
      {unmapped > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {unmapped === 1 ? "1 task is" : `${unmapped} tasks are`} assigned in Linear to a name that matches no owner
          here.{" "}
          <button
            type="button"
            onClick={() => setOwnerPref("all")}
            className="underline underline-offset-2 hover:text-foreground"
          >
            Show All
          </button>
        </p>
      )}
      {(more > 0 || expanded) && shown.length > CAP && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 min-h-9 text-sm text-muted-foreground hover:text-foreground"
          aria-expanded={expanded}
        >
          {expanded ? "Show fewer" : `+${more} more`}
        </button>
      )}
    </section>
  );
}
