"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Download, RefreshCw, X } from "lucide-react";

import { roundStepsAction } from "@/app/admin/shift/rounds/actions";
import { AdminEmptyState, AdminLoading } from "@/components/admin/shared/AdminStates";
import { Button } from "@/components/ui/button";
import { closingChecklist, mentorFlags, quietDays, type FlagCode, type MentorFlag } from "@/lib/shift-round/admin/checks";
import { DEFAULT_MISSIONS, formatIct, ictDate, roundName } from "@/lib/shift-round/admin/format";
import {
  compareRisk,
  emptyCountsFor,
  isClosed,
  stepsCsv,
  stepsDone,
  studentSteps,
  type StepCell,
  type StepState,
} from "@/lib/shift-round/admin/steps";
import type { AdminRoundListItem, AdminStepsRow } from "@/lib/shift-round/admin/types";
import { cn } from "@/lib/utils";

import { EmptyValue, LoadError, NativeSelect, Pill, Section } from "./shared";
import { useAdminQuery } from "./useAdminData";

/**
 * Round dashboard, v2 spec 3: "ต้องดูแล" (the curriculum's mentor checks,
 * automated), the "9 ขั้น" table sorted by risk, and after close the full
 * checklist. CSV export carries handles only.
 */

interface StudentView {
  row: AdminStepsRow;
  steps: StepCell[];
  flags: MentorFlag[];
  quiet: number;
  done: number;
  missed: number;
}

const STATE_TONE: Record<StepState, string> = {
  done: "text-emerald-300",
  partial: "text-sky-300",
  todo: "text-muted-foreground",
  missed: "text-red-300",
};

const STATE_WORD: Record<StepState, string> = {
  done: "ครบแล้ว",
  partial: "กำลังทำ",
  todo: "ยังไม่เริ่ม",
  missed: "ตามไม่ทัน",
};

const FLAG_TONE: Record<FlagCode, "warn" | "bad"> = {
  no_idea: "warn",
  no_people: "warn",
  silent: "bad",
  missing_steps: "warn",
};

function downloadText(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function StudentLink({ roundId, row }: { roundId: string; row: AdminStepsRow }) {
  return (
    <span className="min-w-0">
      <Link href={`/admin/shift/rounds/${roundId}/entrants/${row.entry_id}`} className="font-medium hover:underline">
        {row.handle}
      </Link>
      {row.display_name && <span className="ml-1 text-xs text-muted-foreground">{row.display_name}</span>}
    </span>
  );
}

function StepTd({ cell }: { cell: StepCell }) {
  return (
    <td className={cn("px-1.5 py-1.5 text-center tabular-nums", STATE_TONE[cell.state])} title={`${cell.n} · ${cell.title.th}`}>
      <span aria-hidden="true">{cell.text}</span>
      <span className="sr-only">{`ขั้น ${cell.n} ${cell.text === "✓" ? "" : `${cell.text} `}${STATE_WORD[cell.state]}`}</span>
    </td>
  );
}

function StepLegend({ steps }: { steps: StepCell[] }) {
  return (
    <ol className="grid gap-x-4 gap-y-0.5 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-3" aria-label="ขั้นทั้งหมด">
      {steps.map((s) => (
        <li key={s.n}>
          <span className="tabular-nums">{s.n}</span> · {s.title.th}
        </li>
      ))}
    </ol>
  );
}

function NeedsAttention({
  roundId,
  students,
  upcoming,
}: {
  roundId: string;
  students: StudentView[];
  upcoming: boolean;
}) {
  const flagged = students.filter((s) => s.flags.length > 0);
  return (
    <Section title={`ต้องดูแล${flagged.length ? ` (${flagged.length})` : ""}`}>
      <p className="text-xs text-muted-foreground">
        เช็กอัตโนมัติจากหลักสูตร: หลังเซสชันแรกยังไม่เลือกไอเดีย · ตั้งแต่วันที่ 3 ยังไม่มีบันทึกคุยกับคนหรือคนลอง ·
        ไม่มีบันทึก 2 วันเต็ม · ตั้งแต่วันที่ 6 บอกขั้นที่ยังขาด
      </p>
      {upcoming ? (
        <p className="text-sm text-muted-foreground">รอบยังไม่เริ่ม เช็กจะเริ่มเองตั้งแต่วันแรก</p>
      ) : flagged.length === 0 ? (
        <AdminEmptyState title="ตอนนี้ยังไม่มีใครต้องดูแล" description="ทุกคนผ่านเช็กของวันนี้" className="py-6" />
      ) : (
        <ul className="divide-y rounded-md border" aria-label="นักเรียนที่ต้องดูแล">
          {flagged.map((s) => (
            <li key={s.row.entry_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
              <StudentLink roundId={roundId} row={s.row} />
              <span className="text-xs text-muted-foreground">{s.row.squad_name ?? "ไม่มีสควอด"}</span>
              <span className="flex flex-wrap gap-1">
                {s.flags.map((f) => (
                  <Pill key={f.code} tone={FLAG_TONE[f.code]}>
                    {f.label}
                  </Pill>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function ClosingChecklist({
  roundId,
  students,
  round,
  now,
}: {
  roundId: string;
  students: StudentView[];
  round: AdminRoundListItem;
  now: Date;
}) {
  const lists = students
    .map((s) => ({ s, list: closingChecklist(s.row, round, now) }))
    .sort((a, b) => b.list.missing.length - a.list.missing.length || a.s.row.handle.localeCompare(b.s.row.handle, "th"));
  const complete = lists.filter((l) => l.list.missing.length === 0).length;
  const total = lists[0]?.list.total ?? 0;
  return (
    <Section title={total ? `เช็กลิสต์ ${total} ขั้น หลังปิดรอบ` : "เช็กลิสต์หลังปิดรอบ"}>
      <p className="text-sm text-muted-foreground">
        ครบทุกขั้น {complete} จาก {lists.length} คน
      </p>
      {lists.length === 0 ? (
        <AdminEmptyState title="ไม่มีนักเรียนในรอบนี้" className="py-6" />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[560px] text-sm">
            <caption className="sr-only">เช็กลิสต์ทุกขั้นของนักเรียนแต่ละคน หลังปิดรอบ</caption>
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-normal">นักเรียน</th>
                {lists[0].list.steps.map((step) => (
                  <th key={step.n} className="px-1.5 py-2 text-center font-normal" title={step.title.th}>
                    {step.n}
                  </th>
                ))}
                <th className="px-3 py-2 font-normal">ผล</th>
              </tr>
            </thead>
            <tbody>
              {lists.map(({ s, list }) => (
                <tr key={s.row.entry_id} className="border-t">
                  <td className="px-3 py-1.5">
                    <StudentLink roundId={roundId} row={s.row} />
                  </td>
                  {list.steps.map((step) => (
                    <td key={step.n} className="px-1.5 py-1.5 text-center" title={`${step.n} · ${step.title.th}`}>
                      {step.done ? (
                        <Check className="mx-auto h-4 w-4 text-emerald-300" aria-label={`ขั้น ${step.n} ครบ`} />
                      ) : (
                        <X className="mx-auto h-4 w-4 text-red-300" aria-label={`ขั้น ${step.n} ไม่ครบ`} />
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-1.5">
                    {list.missing.length === 0 ? (
                      <Pill tone="good">ครบทุกขั้น</Pill>
                    ) : (
                      <Pill tone="warn">{`ขาดขั้น ${list.missing.join(", ")}`}</Pill>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

export function StepsBoard({
  roundId,
  round,
  now: fixedNow,
}: {
  roundId: string;
  round: AdminRoundListItem;
  /** Tests pass a fixed clock. */
  now?: Date;
}) {
  const { data, error, loading, reload } = useAdminQuery(() => roundStepsAction(roundId), [roundId]);
  const [now, setNow] = useState(() => fixedNow ?? new Date());
  const [squad, setSquad] = useState("all");

  const students = useMemo<StudentView[]>(() => {
    return (data?.rows ?? [])
      .map((row) => {
        const steps = studentSteps(row.counts, { round, now });
        return {
          row,
          steps,
          flags: mentorFlags(row, round, now),
          quiet: quietDays(row, round, now),
          done: stepsDone(steps),
          missed: steps.filter((s) => s.state === "missed").length,
        };
      })
      .sort((a, b) =>
        compareRisk(
          { flags: a.flags.length, missed: a.missed, done: a.done, quietDays: a.quiet, handle: a.row.handle },
          { flags: b.flags.length, missed: b.missed, done: b.done, quietDays: b.quiet, handle: b.row.handle },
        ),
      );
  }, [data, round, now]);

  const squads = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of students) if (s.row.squad_id) seen.set(s.row.squad_id, s.row.squad_name ?? s.row.squad_id);
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], "th"));
  }, [students]);
  const visible = students.filter((s) =>
    squad === "all" ? true : squad === "none" ? !s.row.squad_id : s.row.squad_id === squad,
  );

  const template = students[0]?.steps ?? studentSteps(emptyCountsFor(round.missions?.length ? round.missions : DEFAULT_MISSIONS));
  const closed = isClosed(round, now);
  const upcoming = now.getTime() < Date.parse(round.starts_at);

  const refresh = () => {
    setNow(fixedNow ?? new Date());
    void reload();
  };

  const exportCsv = () => {
    const csv = stepsCsv(
      [...visible]
        .sort((a, b) => a.row.handle.localeCompare(b.row.handle, "th"))
        .map((s) => ({ handle: s.row.handle, squad_name: s.row.squad_name, steps: s.steps, counts: s.row.counts })),
    );
    downloadText(`${roundName(round).replace(/[[\]]/g, "")}-steps-${ictDate(now)}.csv`, csv);
  };

  if (error) {
    return <LoadError error={error} onRetry={refresh} retrying={loading} title="โหลด 9 ขั้นไม่ได้" />;
  }
  if (loading && !data) return <AdminLoading rows={3} rowClassName="h-16" label="กำลังโหลด 9 ขั้น" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect aria-label="กรองตามสควอด" value={squad} onChange={(e) => setSquad(e.target.value)}>
          <option value="all">ทุกสควอด</option>
          <option value="none">ไม่มีสควอด</option>
          {squads.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </NativeSelect>
        <span className="text-sm text-muted-foreground">
          {visible.length} จาก {students.length} คน · ข้อมูลเมื่อ {formatIct(now.toISOString())}
        </span>
        <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={cn("mr-1 h-4 w-4", loading && "animate-spin")} aria-hidden="true" /> รีเฟรช
        </Button>
      </div>

      {closed ? (
        <ClosingChecklist roundId={roundId} students={visible} round={round} now={now} />
      ) : (
        <NeedsAttention roundId={roundId} students={visible} upcoming={upcoming} />
      )}

      <Section
        title={`${template.length} ขั้น`}
        aside={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={visible.length === 0}>
            <Download className="mr-1 h-4 w-4" aria-hidden="true" /> ดาวน์โหลด CSV
          </Button>
        }
      >
        <p className="text-xs text-muted-foreground">
          ขั้น 1-{template.length - 2} จากภารกิจของรอบ · ขั้น {template.length - 1} วันที่มีบันทึก/ทั้งหมด · ขั้น{" "}
          {template.length} เข้าเซสชัน/ที่จัดไปแล้ว · เรียงจากคนที่น่าห่วงก่อน · CSV มีแค่ชื่อเล่นในแอป
        </p>
        {students.length === 0 ? (
          <AdminEmptyState title="ยังไม่มีนักเรียนในรอบนี้" description="นักเรียนจะขึ้นที่นี่หลังเข้าร่วมรอบในแอป" className="py-6" />
        ) : visible.length === 0 ? (
          <AdminEmptyState title="ไม่มีนักเรียนในสควอดนี้" className="py-6" />
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[720px] text-sm">
              <caption className="sr-only">ความคืบหน้าทุกขั้นของนักเรียน เรียงจากคนที่น่าห่วงก่อน</caption>
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-normal">นักเรียน</th>
                  <th className="px-3 py-2 font-normal">สควอด</th>
                  {template.map((step) => (
                    <th key={step.n} className="px-1.5 py-2 text-center font-normal" title={step.title.th}>
                      {step.n}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-normal">ครบ</th>
                  <th className="px-3 py-2 font-normal">บันทึกล่าสุด</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => (
                  <tr
                    key={s.row.entry_id}
                    className={cn("border-t", s.flags.length > 0 && !closed && "bg-amber-500/5")}
                    aria-label={s.row.handle}
                  >
                    <td className="px-3 py-1.5">
                      <StudentLink roundId={roundId} row={s.row} />
                    </td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">{s.row.squad_name ?? <EmptyValue />}</td>
                    {s.steps.map((cell) => (
                      <StepTd key={cell.n} cell={cell} />
                    ))}
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {s.done}/{s.steps.length}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-xs text-muted-foreground">{formatIct(s.row.last_log_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <StepLegend steps={template} />
      </Section>
    </div>
  );
}
