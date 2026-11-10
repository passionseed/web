import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { CanvasChat } from "@/components/admin/shift-canvases/CanvasChat";
import { BeliefMarks, EvidenceCounts } from "@/components/admin/shift-canvases/ShiftCanvasTable";
import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
import { adminMetadata } from "@/lib/admin/metadata";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { markdownToSafeHtml } from "@/lib/security/sanitize-html";
import { readShiftCanvas } from "@/lib/supabase/shift-canvases";
import { progressOf } from "@/lib/whiteboard/shift-overview";

export const dynamic = "force-dynamic";
export const metadata = adminMetadata("/admin/shift/canvases");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A URL segment decoded, or null when it is not valid percent-encoding. */
function decoded(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

export default async function AdminShiftCanvasPage({ params }: { params: Promise<{ boardId: string; frameId: string }> }) {
  await requireAdmin();
  const { boardId, frameId: rawFrameId } = await params;
  const frameId = decoded(rawFrameId);
  if (!UUID.test(boardId) || !frameId || frameId.length > 100) notFound();
  const canvas = await readShiftCanvas(boardId, frameId);
  if (!canvas) notFound();
  const { row, markdown } = canvas;
  const progress = progressOf(row.zones);

  return (
    <div className="space-y-4">
      <ShiftAdminTabs />
      <Link
        href="/admin/shift/canvases"
        className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All canvases
      </Link>
      <AdminPageHeader
        eyebrow="SHIFT canvas"
        title={row.title || "Untitled canvas"}
        description={`${row.ownerName}${row.teamNames.length ? ` with ${row.teamNames.join(", ")}` : ""} · on ${row.boardTitle}`}
        actions={
          <a
            href={`/whiteboard/${row.boardId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-sm hover:bg-muted"
          >
            Open board
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        }
      />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section aria-label="Canvas contents" className="space-y-3 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <BeliefMarks progress={progress} />
            <EvidenceCounts progress={progress} />
            <span className="text-sm tabular-nums text-muted-foreground">
              {progress.days ? `${progress.daysLogged}/${progress.days} days logged` : null}
              {` · ${row.versions} versions`}
            </span>
          </div>
          <div className="admin-markdown text-sm" dangerouslySetInnerHTML={{ __html: markdownToSafeHtml(markdown) }} />
        </section>
        <div className="lg:sticky lg:top-4">
          <CanvasChat scope={{ boardId: row.boardId, frameId: row.frameId }} subject="this canvas" />
        </div>
      </div>
    </div>
  );
}
