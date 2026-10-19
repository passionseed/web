"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCheck } from "lucide-react";

import { markAttendanceAction, roundStepsAction } from "@/app/admin/shift/rounds/actions";
import { AdminEmptyState, AdminLoading } from "@/components/admin/shared/AdminStates";
import { Button } from "@/components/ui/button";
import { formatThaiDate } from "@/lib/content/shift-cohort";
import {
  ATTENDANCE_LABEL,
  allPresentWrites,
  cellKey,
  markLabel,
  marksFromRows,
  nextAttendance,
  sessionColumns,
  tallyDay,
  type Mark,
  type SessionPhase,
} from "@/lib/shift-round/admin/attendance";
import { describeError, roundName, sessionTimeLabel } from "@/lib/shift-round/admin/format";
import type { AdminError, AdminResult, AttendanceStatus } from "@/lib/shift-round/admin/types";
import { cn } from "@/lib/utils";

import { ActionError, LoadError } from "./shared";
import { useAdminQuery } from "./useAdminData";
import { useRound } from "./useRound";

/**
 * Session attendance (v2 spec 3): students x session days. A tap cycles
 * ยังไม่เช็ก -> มา -> ชดเชย -> ขาด and shows at once; writes go out one at a
 * time through shift_round_admin_mark_attendance, and a failed write puts the
 * cells back to what the server last confirmed.
 */

interface Write {
  day: number;
  marks: { entry_id: string; status: AttendanceStatus | null }[];
}

const PHASE_LABEL: Record<SessionPhase, string> = {
  done: "จบแล้ว",
  live: "กำลังเซสชัน",
  upcoming: "ยังไม่ถึง",
};

const MARK_STYLE: Record<AttendanceStatus | "unset", string> = {
  present: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
  makeup: "border-sky-500/40 bg-sky-500/15 text-sky-200",
  absent: "border-destructive/50 bg-destructive/15 text-red-200",
  unset: "border-dashed border-border text-muted-foreground",
};

export function AttendanceBoard({ roundId, now: fixedNow }: { roundId: string; now?: Date }) {
  const round = useRound(roundId);
  const steps = useAdminQuery(() => roundStepsAction(roundId), [roundId]);
  const [now] = useState(() => fixedNow ?? new Date());
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  /** The steps payload the marks were loaded from; the grid waits for it so no cell shows a stale "—". */
  const [loadedFrom, setLoadedFrom] = useState<unknown>(null);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<AdminError | null>(null);
  const confirmed = useRef<Record<string, Mark>>({});
  const queue = useRef<Write[]>([]);
  const sending = useRef(false);

  useEffect(() => {
    if (!steps.data) return;
    const server = marksFromRows(steps.data.rows);
    confirmed.current = { ...server };
    if (!sending.current && queue.current.length === 0) setMarks(server);
    setLoadedFrom(steps.data);
  }, [steps.data]);

  const pump = useCallback(async () => {
    if (sending.current) return;
    sending.current = true;
    while (queue.current.length > 0) {
      const job = queue.current[0];
      let result: AdminResult<unknown>;
      try {
        result = await markAttendanceAction(roundId, job.day, job.marks);
      } catch (e) {
        result = { ok: false, error: { code: "retryable", category: "retryable", message: String(e) } };
      }
      queue.current.shift();
      if (result.ok) {
        for (const m of job.marks) confirmed.current[cellKey(m.entry_id, job.day)] = m.status;
      } else {
        // Roll back, except cells a later queued write changes again.
        const later = new Set(queue.current.flatMap((j) => j.marks.map((m) => cellKey(m.entry_id, j.day))));
        const rollback: Record<string, Mark> = {};
        for (const m of job.marks) {
          const key = cellKey(m.entry_id, job.day);
          if (!later.has(key)) rollback[key] = confirmed.current[key] ?? null;
        }
        const failed = result.error;
        setMarks((prev) => ({ ...prev, ...rollback }));
        setError(failed);
      }
      setPending(queue.current.length);
    }
    sending.current = false;
  }, [roundId]);

  const write = (day: number, writes: Write["marks"]) => {
    if (writes.length === 0) return;
    setError(null);
    setMarks((prev) => {
      const next = { ...prev };
      for (const w of writes) next[cellKey(w.entry_id, day)] = w.status;
      return next;
    });
    queue.current.push({ day, marks: writes });
    setPending(queue.current.length);
    void pump();
  };

  const r = round.data;
  if (round.error) return <LoadError error={round.error} onRetry={round.reload} retrying={round.loading} title="Could not load this round" />;
  if (steps.error) return <LoadError error={steps.error} onRetry={steps.reload} retrying={steps.loading} title="โหลดรายชื่อไม่ได้" />;
  if (!r || !steps.data || loadedFrom === null) {
    return <AdminLoading rows={5} rowClassName="h-10" label="กำลังโหลดเช็กชื่อ" />;
  }

  const columns = sessionColumns(r, now);
  const rows = [...steps.data.rows].sort(
    (a, b) =>
      (a.squad_name ?? "￿").localeCompare(b.squad_name ?? "￿", "th") || a.handle.localeCompare(b.handle, "th"),
  );
  const ids = rows.map((row) => row.entry_id);

  if (columns.length === 0) {
    return <AdminEmptyState title="รอบนี้ไม่มีเซสชัน" description="ตั้งวันที่มีเซสชันได้ที่ Settings ของรอบ" />;
  }
  if (rows.length === 0) {
    return <AdminEmptyState title="ยังไม่มีนักเรียนในรอบนี้" description="นักเรียนจะขึ้นที่นี่หลังเข้าร่วมรอบในแอป" />;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {roundName(r)} · เซสชัน {sessionTimeLabel(r)} (เวลาไทย) · กดช่องเพื่อเปลี่ยน ยังไม่เช็ก → มา → ชดเชย → ขาด ·
        ชดเชยนับเป็นเข้าเซสชัน (ขั้น 9) · &quot;มาครบ&quot; ใส่ &quot;มา&quot; ให้ทุกคนที่ยังไม่เช็กในวันนั้น
      </p>
      <ActionError message={error ? `บันทึกไม่สำเร็จ จึงย้อนกลับ: ${describeError(error)}` : null} />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[560px] text-sm">
          <caption className="sr-only">เช็กชื่อเซสชันของ {roundName(r)}</caption>
          <thead>
            <tr className="text-left align-bottom">
              <th scope="col" className="px-3 py-2 text-xs font-normal text-muted-foreground">
                นักเรียน
              </th>
              {columns.map((c) => {
                const fill = allPresentWrites(ids, c.day, marks);
                return (
                  <th key={c.day} scope="col" className={cn("px-2 py-2 text-center font-normal", c.phase === "upcoming" && "opacity-70")}>
                    <div className="font-medium">วันที่ {c.day}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatThaiDate(c.date)} · {PHASE_LABEL[c.phase]}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1 h-7 px-2 text-xs"
                      disabled={fill.length === 0 || c.phase === "upcoming"}
                      title={c.phase === "upcoming" ? "เช็กได้เมื่อเซสชันเริ่ม" : undefined}
                      onClick={() => write(c.day, fill)}
                      aria-label={`มาครบ วันที่ ${c.day}`}
                    >
                      <CheckCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> มาครบ
                    </Button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.entry_id} className="border-t">
                <th scope="row" className="px-3 py-1.5 text-left font-normal">
                  <span className="font-medium">{row.handle}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{row.squad_name ?? "ไม่มีสควอด"}</span>
                </th>
                {columns.map((c) => {
                  const mark = marks[cellKey(row.entry_id, c.day)] ?? null;
                  return (
                    <td key={c.day} className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        // The server opens marks when the session starts (not_started before that).
                        disabled={c.phase === "upcoming"}
                        onClick={() => write(c.day, [{ entry_id: row.entry_id, status: nextAttendance(mark) }])}
                        aria-label={`${row.handle} วันที่ ${c.day}: ${markLabel(mark)}`}
                        className={cn(
                          "inline-flex h-8 min-w-16 items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          MARK_STYLE[mark ?? "unset"],
                          c.phase === "upcoming" && "cursor-not-allowed opacity-50",
                        )}
                      >
                        {mark ? ATTENDANCE_LABEL[mark] : "—"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t text-xs text-muted-foreground">
              <th scope="row" className="px-3 py-2 text-left font-normal">
                รวม
              </th>
              {columns.map((c) => {
                const t = tallyDay(ids, c.day, marks);
                return (
                  <td key={c.day} className="px-2 py-2 text-center tabular-nums">
                    มา {t.present} · ชดเชย {t.makeup} · ขาด {t.absent}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-muted-foreground" role="status">
        {pending > 0 ? "กำลังบันทึก…" : "บันทึกแล้วทุกช่อง"}
      </p>
    </div>
  );
}
