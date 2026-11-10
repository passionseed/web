import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { SHIFT_CARDS, shortTitle } from "@/lib/whiteboard/shift-cards";
import { type CanvasProgress, progressOf } from "@/lib/whiteboard/shift-overview";
import type { ShiftCanvasRow } from "@/lib/supabase/shift-canvases";

import { PersonLine } from "./PersonLine";

/** Where the canvas pages live: in the admin console, or the staff pages. */
export type CanvasBase = "/admin/shift/canvases" | "/shift/canvases";

export const canvasHref = (base: CanvasBase, row: Pick<ShiftCanvasRow, "boardId" | "frameId">) =>
  `${base}/${row.boardId}/${encodeURIComponent(row.frameId)}`;

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
export function ShiftCanvasTable({ canvases, base }: { canvases: ShiftCanvasRow[]; base: CanvasBase }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Canvas</TableHead>
            <TableHead>Student and team</TableHead>
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
                  <Link href={canvasHref(base, row)} className="font-medium hover:underline">
                    {row.title || "Untitled canvas"}
                  </Link>
                  <p className="text-xs text-muted-foreground">{row.boardTitle}</p>
                </TableCell>
                <TableCell className="min-w-56">
                  {row.ownerPerson ? <PersonLine person={row.ownerPerson} /> : <span className="text-sm">Unknown</span>}
                  {row.team.length > 0 ? (
                    <ul className="mt-2 space-y-1.5 border-l pl-3" aria-label="Teammates">
                      {row.team.map((p) => (
                        <li key={p.userId}>
                          <PersonLine person={p} compact />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">No teammates</p>
                  )}
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
