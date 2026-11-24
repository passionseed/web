"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import type { Reel, ReelShot } from "@/lib/content/elemental-reels";
import { MODE_LABEL, SHOT_LABEL, filterRows, shotListRows, type FilmMode } from "@/lib/reels/studio";
import { useStoredState } from "@/lib/reels/useStoredState";
import { cn } from "@/lib/utils";

const TAKES_KEY = "reel-studio:takes:v1";
const MODES: readonly FilmMode[] = ["all", "face", "voice"];
const SWIPE_PX = 50;
const FONT = { fontFamily: "var(--font-noto-sans-thai), system-ui, sans-serif" } as const;

/** Keeps the phone screen on while filming, where the browser allows it. */
function useWakeLock() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        const next = await navigator.wakeLock.request("screen");
        if (cancelled) void next.release();
        else lock = next;
      } catch {
        // Denied (low battery, background tab): filming still works.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, []);
}

function ShotBadge({ shot, className }: { shot: ReelShot; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-md border-2 border-foreground px-3 py-1 text-base font-bold tracking-wide",
        shot === "FACE" && "bg-foreground text-background",
        shot === "CODE" && "border-dashed",
        className,
      )}
    >
      {SHOT_LABEL[shot]}
    </span>
  );
}

function FilmView({ reel }: { reel: Reel }) {
  const [mode, setMode] = useState<FilmMode>("all");
  const [position, setPosition] = useState(0);
  const [takes, setTakes] = useStoredState<Record<string, boolean>>(TAKES_KEY, {});
  const touch = useRef<{ x: number; y: number } | null>(null);

  const rows = filterRows(reel.rows, mode);
  const row = rows[Math.min(position, rows.length - 1)];
  const faceRows = reel.rows.map((r, index) => ({ r, index })).filter(({ r }) => r.shot === "FACE");
  const faceDone = faceRows.filter(({ index }) => takes[`${reel.id}:${index}`]).length;
  const rowDone = row ? Boolean(takes[`${reel.id}:${row.index}`]) : false;

  const go = useCallback(
    (delta: number) => setPosition((p) => Math.max(0, Math.min(rows.length - 1, p + delta))),
    [rows.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const toggleTake = () => {
    if (!row) return;
    const key = `${reel.id}:${row.index}`;
    setTakes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const voLines = row ? row.vo.split("\n").filter(Boolean) : [];

  return (
    <>
      <p className="px-3 pb-1 text-xl font-bold tabular-nums" style={FONT}>
        {row ? Math.min(position, rows.length - 1) + 1 : 0} / {rows.length}
      </p>
      <div className="flex gap-2 overflow-x-auto px-3 pb-2" role="group" aria-label="ตัวกรองบรรทัด">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => {
              setMode(m);
              setPosition(0);
            }}
            className={cn(
              "min-h-11 shrink-0 rounded-md border-2 border-foreground px-4 text-base font-semibold",
              mode === m ? "bg-foreground text-background" : "bg-background text-foreground",
            )}
          >
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>

      <div
        className="relative min-h-0 flex-1 overflow-hidden border-y border-border"
        onTouchStart={(e) => {
          const t = e.touches[0];
          touch.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
          const start = touch.current;
          touch.current = null;
          if (!start) return;
          const t = e.changedTouches[0];
          const dx = t.clientX - start.x;
          const dy = t.clientY - start.y;
          if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
        }}
      >
        {row ? (
          <div className="flex h-full flex-col gap-4 overflow-hidden px-4 py-4" style={FONT}>
            <div className="flex items-center gap-3">
              <ShotBadge shot={row.shot} />
              <span className="text-base text-muted-foreground">{row.time}</span>
              {rowDone && <span className="ml-auto text-base font-bold">เสร็จแล้ว</span>}
            </div>
            {voLines.length > 0 ? (
              <div className="space-y-3 text-[32px] font-medium leading-[1.65] sm:text-[36px]">
                {voLines.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            ) : (
              <p className="text-[26px] leading-[1.6] text-muted-foreground">ไม่มีเสียงพูด</p>
            )}
            <div className="mt-auto space-y-2 text-base leading-relaxed">
              {row.text && (
                <p>
                  <span className="font-bold">ข้อความบนจอ </span>
                  {row.text}
                </p>
              )}
              <p className="text-muted-foreground">
                <span className="font-bold text-foreground">ภาพ </span>
                {row.picture}
              </p>
            </div>
          </div>
        ) : (
          <p className="p-4 text-lg" style={FONT}>
            ไม่มีบรรทัดในตัวกรองนี้
          </p>
        )}
        <button
          type="button"
          aria-label="ย้อนกลับ"
          onClick={() => go(-1)}
          className="absolute inset-y-0 left-0 w-1/2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        />
        <button
          type="button"
          aria-label="ถัดไป"
          onClick={() => go(1)}
          className="absolute inset-y-0 right-0 w-1/2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        />
      </div>

      <div className="flex items-center gap-3 px-3 py-3" style={FONT}>
        <button
          type="button"
          aria-pressed={rowDone}
          disabled={!row}
          onClick={toggleTake}
          className={cn(
            "min-h-14 flex-1 rounded-md border-2 border-foreground px-4 text-lg font-bold",
            rowDone ? "bg-foreground text-background" : "bg-background text-foreground",
          )}
        >
          {rowDone ? "เทคนี้เสร็จแล้ว" : "เทคนี้เสร็จ"}
        </button>
        <p className="text-base font-semibold" aria-live="polite">
          หน้ากล้อง {faceDone} / {faceRows.length}
        </p>
      </div>
    </>
  );
}

function ShotListView({ reel }: { reel: Reel }) {
  const items = shotListRows(reel);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6" style={FONT}>
      <p className="mb-3 text-base text-muted-foreground">
        ช็อตที่ต้องเตรียม: อัดหน้าจอ {items.filter((r) => r.shot === "SCREEN").length}, ทำในตัดต่อ{" "}
        {items.filter((r) => r.shot === "CODE").length}
      </p>
      <ol className="space-y-3">
        {items.map((r) => (
          <li key={r.index} className="rounded-md border border-border p-3">
            <div className="flex items-center gap-3">
              <ShotBadge shot={r.shot} />
              <span className="text-base text-muted-foreground">{r.time}</span>
            </div>
            <p className="mt-2 text-base leading-relaxed">{r.picture}</p>
            {r.text && <p className="mt-1 text-base leading-relaxed text-muted-foreground">ข้อความบนจอ: {r.text}</p>}
          </li>
        ))}
      </ol>
      <h2 className="mt-6 text-lg font-bold">เครดิต</h2>
      {reel.credits.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-base">
          {reel.credits.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-base text-muted-foreground">ไม่มีเครดิตข้อมูลสำหรับคลิปนี้</p>
      )}
      <h2 className="mt-6 text-lg font-bold">ไอเดียที่ให้ทีมสร้าง</h2>
      <p className="mt-2 text-base leading-relaxed">{reel.build}</p>
    </div>
  );
}

export function ReelStudio({ reel }: { reel: Reel }) {
  const [view, setView] = useState<"film" | "shots">("film");
  useWakeLock();

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background text-foreground" style={FONT}>
      <header className="flex items-center gap-2 px-3 py-2">
        <Link
          href="/admin/hackathon/reels"
          className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-base font-semibold"
        >
          รายการ
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold">{reel.title}</h1>
        <button
          type="button"
          onClick={() => setView(view === "film" ? "shots" : "film")}
          className="min-h-11 shrink-0 rounded-md border border-border px-3 text-base font-semibold"
        >
          {view === "film" ? "ช็อตลิสต์" : "โหมดถ่าย"}
        </button>
      </header>
      {view === "film" ? <FilmView reel={reel} /> : <ShotListView reel={reel} />}
    </div>
  );
}
