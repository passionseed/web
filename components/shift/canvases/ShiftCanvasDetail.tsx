import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

import { markdownToSafeHtml } from "@/lib/security/sanitize-html";
import type { TrendRow } from "@/lib/shift/canvas-snapshots";
import type { ShiftCanvasRow } from "@/lib/supabase/shift-canvases";
import { progressOf } from "@/lib/whiteboard/shift-overview";

import { CanvasChat } from "./CanvasChat";
import { CanvasTrend } from "./CanvasTrend";
import { PersonLine } from "./PersonLine";
import { BeliefMarks, type CanvasBase, EvidenceCounts } from "./ShiftCanvasTable";

import "./canvas-markdown.css";

/** One SHIFT canvas: who it belongs to, its progress by day and contents, and Claude about it. */
export function ShiftCanvasDetail({
  row,
  markdown,
  trend,
  base,
}: {
  row: ShiftCanvasRow;
  markdown: string;
  trend: TrendRow[];
  base: CanvasBase;
}) {
  const progress = progressOf(row.zones);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={base} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All canvases
        </Link>
        <a
          href={`/whiteboard/${row.boardId}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-sm hover:bg-muted"
        >
          Open board
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>

      <section aria-label="Student and team" className="flex flex-wrap gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
        {row.ownerPerson ? <PersonLine person={row.ownerPerson} /> : <span className="text-sm">Owner unknown</span>}
        {row.team.map((p) => (
          <PersonLine key={p.userId} person={p} />
        ))}
      </section>

      <CanvasTrend rows={trend} />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section aria-label="Canvas contents" className="space-y-3 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <BeliefMarks progress={progress} />
            <EvidenceCounts progress={progress} />
            <span className="text-sm tabular-nums text-muted-foreground">
              {progress.days ? `${progress.daysLogged}/${progress.days} days logged · ` : ""}
              {row.versions} versions
            </span>
          </div>
          <div className="canvas-markdown text-sm" dangerouslySetInnerHTML={{ __html: markdownToSafeHtml(markdown) }} />
        </section>
        <div className="lg:sticky lg:top-4">
          <CanvasChat scope={{ boardId: row.boardId, frameId: row.frameId }} subject="this canvas" />
        </div>
      </div>
    </div>
  );
}
