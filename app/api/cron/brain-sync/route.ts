import { NextRequest, NextResponse } from "next/server";

import { brainToken, updateBrainPage } from "@/lib/brain/github";
import {
  loadUnsentBrainEvents,
  markBrainEventFailed,
  markBrainEventsSent,
  type OutboxRow,
} from "@/lib/brain/outbox";
import { findPii } from "@/lib/brain/pii";
import { applyEdits, renderEvent, type PageEdit } from "@/lib/brain/render";
import { parseBrainEvent } from "@/lib/brain/schema";

/** Events pushed per run; the rest wait for the next run. */
const BATCH = 50;

interface PageWork {
  edits: PageEdit[];
  rows: OutboxRow[];
  summaries: string[];
}

function commitMessage(work: PageWork): string {
  const ids = work.rows.map((row) => row.id);
  if (ids.length === 1) return `[web-sync] ${work.summaries[0]} (event ${ids[0]})`;
  const shown = work.summaries.slice(0, 3).join("; ");
  const more = ids.length > 3 ? `; and ${ids.length - 3} more` : "";
  return `[web-sync] ${ids.length} app events: ${shown}${more}\n\nEvents: ${ids.join(", ")}`;
}

/**
 * Pushes `brain_events` into passionseed/company-brain with fixed templates.
 * Skips cleanly when BRAIN_GITHUB_TOKEN is not set.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = brainToken();
  if (!token) return NextResponse.json({ ok: true, skipped: "BRAIN_GITHUB_TOKEN not set" });

  try {
    const rows = await loadUnsentBrainEvents(BATCH);
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
    const pages = new Map<string, PageWork>();
    const rejected: string[] = [];

    for (const row of rows) {
      const event = parseBrainEvent({ type: row.type, payload: row.payload });
      if (!event) {
        await markBrainEventFailed(row, "invalid event", true);
        rejected.push(row.id);
        continue;
      }
      const rendered = renderEvent({ ...event, id: row.id, created_at: row.created_at }, today);
      const pii = findPii([rendered.summary, ...rendered.edits.flatMap((e) => e.text)].join("\n"));
      if (pii) {
        await markBrainEventFailed(row, `pii guard: ${pii}`, true);
        rejected.push(row.id);
        continue;
      }
      for (const edit of rendered.edits) {
        const work = pages.get(edit.path) ?? { edits: [], rows: [], summaries: [] };
        work.edits.push(edit);
        if (!work.rows.includes(row)) {
          work.rows.push(row);
          work.summaries.push(rendered.summary);
        }
        pages.set(edit.path, work);
      }
    }

    // An event is sent only when every page it touches committed. Edits are
    // idempotent, so a retry after a partial failure does not duplicate lines.
    const failed = new Map<string, { row: OutboxRow; error: string }>();
    for (const [path, work] of pages) {
      try {
        await updateBrainPage(
          token,
          path,
          (content) => {
            const next = applyEdits(content, path, work.edits, today);
            const pii = findPii(next.split("\n").filter((l) => !content.includes(l)).join("\n"));
            if (pii) throw new Error(`pii guard on ${path}: ${pii}`);
            return next;
          },
          commitMessage(work),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[brain sync] ${path} failed:`, message);
        for (const row of work.rows) failed.set(row.id, { row, error: message });
      }
    }

    for (const { row, error } of failed.values()) await markBrainEventFailed(row, error);
    const sent = rows
      .filter((row) => !failed.has(row.id) && !rejected.includes(row.id))
      .map((row) => row.id);
    await markBrainEventsSent(sent);

    return NextResponse.json({
      ok: true,
      sent: sent.length,
      failed: failed.size,
      rejected: rejected.length,
    });
  } catch (error) {
    console.error("[brain sync] failed:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
