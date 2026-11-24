"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight, CloudUpload, Mic } from "lucide-react";

import type { StoryScript } from "@/lib/radar-stories/types";
import { listLocalTakes } from "@/lib/radar-stories/voice-idb";

export interface ReelProgressRow {
  id: string;
  series: StoryScript["series"];
  titleTh: string;
  hookTh: string;
  totalLines: number;
  pickedCount: number;
  recordedCount: number;
  unpickedCount: number;
  staleCount: number;
  missingCount: number;
  nextLineIndex: number;
}

type FilterKey = "all" | "todo" | "stale" | "done";

const SERIES_STYLE: Record<StoryScript["series"], { label: string; cls: string }> = {
  lost: { label: "lost", cls: "bg-violet-500/20 text-violet-200 border-violet-400/30" },
  round1: { label: "round1", cls: "bg-sky-500/20 text-sky-200 border-sky-400/30" },
  career: { label: "career", cls: "bg-amber-500/20 text-amber-200 border-amber-400/30" },
};

export function VoiceReelList({
  rows,
  migrationMissing,
}: {
  rows: ReelProgressRow[];
  migrationMissing: boolean;
}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [pendingByStory, setPendingByStory] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    void listLocalTakes().then((locals) => {
      if (!active) return;
      const counts: Record<string, number> = {};
      for (const item of locals) {
        counts[item.storyId] = (counts[item.storyId] ?? 0) + 1;
      }
      setPendingByStory(counts);
    });
    return () => {
      active = false;
    };
  }, []);

  const totals = useMemo(() => {
    let lines = 0;
    let picked = 0;
    let recorded = 0;
    let stale = 0;
    let doneReels = 0;
    for (const r of rows) {
      lines += r.totalLines;
      picked += r.pickedCount;
      recorded += r.recordedCount;
      stale += r.staleCount;
      if (r.totalLines > 0 && r.pickedCount === r.totalLines) doneReels++;
    }
    const pendingLocal = Object.values(pendingByStory).reduce((a, b) => a + b, 0);
    return { lines, picked, recorded, stale, doneReels, pendingLocal };
  }, [rows, pendingByStory]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter === "done") return r.totalLines > 0 && r.pickedCount === r.totalLines;
      if (filter === "stale") return r.staleCount > 0;
      if (filter === "todo") return r.pickedCount < r.totalLines;
      return true;
    });
  }, [rows, filter]);

  const pct = totals.lines > 0 ? Math.round((totals.picked / totals.lines) * 100) : 0;

  return (
    <div
      className="min-h-[100dvh] bg-zinc-950 text-zinc-100"
      style={{
        fontFamily: "var(--font-bai-jamjuree), var(--font-noto-sans-thai), sans-serif",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto max-w-2xl px-4 py-5">
        {/* Header */}
        <header className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/30">
                <Mic className="h-4 w-4" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-white">Radar Voice Studio</h1>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              อัดเสียง P&apos;Seed สำหรับ Story Reels · 48 kHz 16-bit WAV
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
          >
            Admin
          </Link>
        </header>

        {migrationMissing ? (
          <div className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-xs text-amber-100">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
              ยังไม่ได้รัน migration ของตาราง radar_voice_takes
            </div>
            <p className="mt-1 leading-relaxed text-amber-100/80">
              รัน <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono">supabase db push</code> เพื่อสร้างตารางและ private bucket <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono">radar-voice</code> ก่อนเริ่มอัปโหลดเทค
            </p>
          </div>
        ) : null}

        {/* Overall progress card */}
        <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <p className="text-xs text-zinc-400">ความคืบหน้าทั้งหมด ({rows.length} Reels)</p>
              <p className="mt-0.5 text-2xl font-bold text-white tabular-nums">
                {totals.picked} / {totals.lines}{" "}
                <span className="text-sm font-medium text-zinc-400">บรรทัดเลือกแล้ว</span>
              </p>
            </div>
            <span className="font-mono text-lg font-bold text-emerald-400 tabular-nums">{pct}%</span>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-emerald-400 transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400 tabular-nums">
            <span>เสร็จครบ: <strong className="text-zinc-200">{totals.doneReels}/{rows.length}</strong> Reels</span>
            <span>อัดแล้ว: <strong className="text-zinc-200">{totals.recorded}</strong></span>
            {totals.stale > 0 ? (
              <span className="text-orange-300">
                ข้อความเปลี่ยน (เก่า): <strong>{totals.stale}</strong>
              </span>
            ) : null}
          </div>

          {totals.pendingLocal > 0 ? (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
              <CloudUpload className="h-4 w-4 shrink-0" />
              <span>มี {totals.pendingLocal} เทคในเครื่องที่รออัปโหลด เปิด Reel เพื่อส่งอัตโนมัติ</span>
            </div>
          ) : null}
        </section>

        {/* Filter pills */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {(
            [
              { key: "all", label: `ทั้งหมด (${rows.length})` },
              { key: "todo", label: `ยังไม่ครบ (${rows.filter((r) => r.pickedCount < r.totalLines).length})` },
              { key: "stale", label: `เก่า (${rows.filter((r) => r.staleCount > 0).length})` },
              { key: "done", label: `ครบแล้ว (${totals.doneReels})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                filter === tab.key
                  ? "border-white bg-white text-zinc-950"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Reel list */}
        <ul className="mt-3 space-y-2.5">
          {filtered.map((row) => {
            const complete = row.totalLines > 0 && row.pickedCount === row.totalLines;
            const pickedPct = row.totalLines > 0 ? (row.pickedCount / row.totalLines) * 100 : 0;
            const unpickedPct = row.totalLines > 0 ? (row.unpickedCount / row.totalLines) * 100 : 0;
            const stalePct = row.totalLines > 0 ? (row.staleCount / row.totalLines) * 100 : 0;
            const pendingCount = pendingByStory[row.id] ?? 0;
            const seriesBadge = SERIES_STYLE[row.series];
            const href =
              row.nextLineIndex > 0
                ? `/studio/radar-voice/${row.id}?line=${row.nextLineIndex}`
                : `/studio/radar-voice/${row.id}`;

            return (
              <li key={row.id}>
                <Link
                  href={href}
                  className={`block rounded-2xl border p-4 transition active:scale-[0.99] ${
                    complete
                      ? "border-emerald-500/30 bg-emerald-500/[0.06] hover:border-emerald-400/50"
                      : "border-zinc-800 bg-zinc-900/75 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] uppercase ${seriesBadge.cls}`}
                        >
                          {seriesBadge.label}
                        </span>
                        <span className="font-mono text-[11px] text-zinc-500">{row.id}</span>
                        {pendingCount > 0 ? (
                          <span className="rounded-md bg-sky-500/20 px-1.5 py-0.5 text-[10px] text-sky-200">
                            รอส่ง {pendingCount}
                          </span>
                        ) : null}
                      </div>
                      <h2 className="mt-1.5 text-base font-semibold leading-snug text-white">
                        {row.titleTh}
                      </h2>
                      <p className="mt-0.5 truncate text-xs text-zinc-400">Hook: {row.hookTh}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 pt-1">
                      {complete ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : null}
                      <ChevronRight className="h-5 w-5 text-zinc-500" />
                    </div>
                  </div>

                  {/* Multi-segment progress bar */}
                  <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                    {pickedPct > 0 ? (
                      <div className="bg-emerald-400" style={{ width: `${pickedPct}%` }} />
                    ) : null}
                    {unpickedPct > 0 ? (
                      <div className="bg-amber-400" style={{ width: `${unpickedPct}%` }} />
                    ) : null}
                    {stalePct > 0 ? (
                      <div className="bg-orange-500" style={{ width: `${stalePct}%` }} />
                    ) : null}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[11px] text-zinc-400 tabular-nums">
                    <span className={complete ? "text-emerald-300" : "text-zinc-200"}>
                      เลือก {row.pickedCount}/{row.totalLines}
                    </span>
                    <span>อัดแล้ว {row.recordedCount}/{row.totalLines}</span>
                    {row.staleCount > 0 ? (
                      <span className="text-orange-300">เก่า {row.staleCount}</span>
                    ) : null}
                    {row.missingCount > 0 ? (
                      <span className="text-zinc-500">เหลือ {row.missingCount}</span>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
