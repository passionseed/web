import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { SHIFT_CARDS, shortTitle } from "@/lib/whiteboard/shift-cards";
import { type CanvasProgress, progressOf } from "@/lib/whiteboard/shift-overview";
import type { ShiftCanvasRow } from "@/lib/supabase/shift-canvases";

export const canvasHref = (row: Pick<ShiftCanvasRow, "boardId" | "frameId">) =>
  `/admin/shift/canvases/${row.boardId}/${encodeURIComponent(row.frameId)}`;

/** Problem, Target, Idea and Ship, lit when written. */
export function BeliefMarks({ progress }: { progress: CanvasProgress }) {
  return (
    <span className="flex gap-1">
      {progress.beliefs.map(({ kind, written }) => (
        <span
          key={kind}
          title={`${shortTitle(kind)}: ${written ? "written" : "empty"}`}
          className={cn("rounded px-1 text-base leading-6", written ? "bg-muted" : "opacity-25 grayscale")}
        >
          <span aria-hidden="true">{SHIFT_CARDS[kind].emoji}</span>
          <span className="sr-only">
            {shortTitle(kind)} {written ? "written" : "empty"}
          </span>
        </span>
      ))}
    </span>
  );
}

/** Interviews, examples, tests and pivots, as counts. */
export function EvidenceCounts({ progress }: { progress: CanvasProgress }) {
  const counts = [
    ["interview", progress.interviews],
    ["reference", progress.references],
    ["test", progress.tests],
    ["pivot", progress.pivots],
  ] as const;
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1 text-sm tabular-nums">
      {counts.map(([kind, n]) => (
        <span key={kind} title={shortTitle(kind)} className={cn(n === 0 && "text-muted-foreground")}>
          <span aria-hidden="true">{SHIFT_CARDS[kind].emoji}</span> {n}
          <span className="sr-only"> {shortTitle(kind)}</span>
        </span>
      ))}
    </span>
  );
}

/** Every SHIFT canvas, newest activity first. */
export function ShiftCanvasTable({ canvases }: { canvases: ShiftCanvasRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Canvas</TableHead>
            <TableHead>Owner and team</TableHead>
            <TableHead>Beliefs</TableHead>
            <TableHead>Evidence and changes</TableHead>
            <TableHead className="text-right">Days</TableHead>
            <TableHead className="text-right">Versions</TableHead>
            <TableHead>Last edit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {canvases.map((row) => {
            const progress = progressOf(row.zones);
            return (
              <TableRow key={`${row.boardId}:${row.frameId}`}>
                <TableCell className="min-w-48">
                  <Link href={canvasHref(row)} className="font-medium hover:underline">
                    {row.title || "Untitled canvas"}
                  </Link>
                  <p className="text-xs text-muted-foreground">{row.boardTitle}</p>
                </TableCell>
                <TableCell className="min-w-40 text-sm">
                  {row.ownerName}
                  <p className="text-xs text-muted-foreground">
                    {row.teamNames.length ? `+ ${row.teamNames.join(", ")}` : "No teammates"}
                  </p>
                </TableCell>
                <TableCell>
                  <BeliefMarks progress={progress} />
                </TableCell>
                <TableCell className="min-w-44">
                  <EvidenceCounts progress={progress} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {progress.days ? `${progress.daysLogged}/${progress.days}` : "–"}
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.versions}</TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {row.lastEdited ? formatDistanceToNow(row.lastEdited, { addSuffix: true }) : "Never"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
