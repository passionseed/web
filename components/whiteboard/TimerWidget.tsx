"use client";

import { Timer, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { BoardTimer } from "@/lib/supabase/whiteboards";
import { formatClock, secondsLeft } from "@/lib/whiteboard/core";

import { boardApi, type BoardEvent } from "./useWhiteboardSync";

const PRESETS = [1, 3, 5, 10, 15, 25];

function chime() {
  try {
    const ctx = new AudioContext();
    [0, 0.25, 0.5].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = [660, 880, 990][i];
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.45);
    });
  } catch {
    // No audio: the toast still shows.
  }
}

/** Shared countdown for workshops: editors start and stop it, everyone sees it. */
export function TimerWidget({
  boardId,
  initial,
  canControl,
  channel,
}: {
  boardId: string;
  initial: BoardTimer;
  canControl: boolean;
  channel: { send: (event: string, payload: unknown) => void; on: (event: BoardEvent, fn: (p: unknown) => void) => () => void };
}) {
  const [timer, setTimer] = useState(initial);
  const [left, setLeft] = useState(() => secondsLeft(initial.endsAt));
  const [custom, setCustom] = useState("");
  const rang = useRef<string | null>(left === 0 ? initial.endsAt : null);
  const { send, on } = channel;

  useEffect(() => on("timer", (p) => setTimer(p as BoardTimer)), [on]);

  useEffect(() => {
    const tick = () => {
      const s = secondsLeft(timer.endsAt);
      setLeft(s);
      if (s === 0 && timer.endsAt && rang.current !== timer.endsAt) {
        rang.current = timer.endsAt;
        chime();
        toast("หมดเวลา! · Time's up");
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [timer.endsAt]);

  const set = async (seconds: number | null) => {
    try {
      const { timer: next } = await boardApi<{ timer: BoardTimer }>(`/api/whiteboards/${boardId}/timer`, {
        method: "PUT",
        body: JSON.stringify({ seconds }),
      });
      setTimer(next);
      send("timer", next);
    } catch {
      toast.error("ตั้งเวลาไม่สำเร็จ · Could not set timer");
    }
  };

  const running = left > 0;
  const progress = running && timer.seconds ? left / timer.seconds : 0;

  if (!canControl && !running) return null;

  return (
    <Popover>
      <PopoverTrigger asChild disabled={!canControl}>
        <button
          type="button"
          title="Timer"
          className={`wb-pill overflow-hidden px-2.5 text-sm tabular-nums ${
            running ? (left <= 10 ? "!border-red-400 !text-red-600" : "!border-orange-300 !text-orange-700") : ""
          }`}
        >
          {running && (
            <span className="absolute inset-y-0 left-0 bg-orange-200/50" style={{ width: `${progress * 100}%` }} />
          )}
          <Timer className="relative h-4 w-4" />
          {running && <span className="relative font-semibold">{formatClock(left)}</span>}
        </button>
      </PopoverTrigger>
      {canControl && (
        <PopoverContent align="end" className="w-60 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">จับเวลาให้ทุกคน · Timer for everyone</p>
          <div className="grid grid-cols-3 gap-1.5">
            {PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => void set(m * 60)}
                className="rounded-md border px-2 py-1.5 text-sm hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10"
              >
                {m} min
              </button>
            ))}
          </div>
          <form
            className="mt-2 flex gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              const minutes = Number(custom);
              if (minutes > 0 && minutes <= 1440) void set(Math.round(minutes * 60));
              setCustom("");
            }}
          >
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="นาที · minutes"
              inputMode="decimal"
              className="min-w-0 flex-1 rounded-md border px-2 py-1.5 text-sm"
            />
            <button type="submit" className="rounded-md bg-orange-500 px-3 text-sm text-white">
              Start
            </button>
          </form>
          {running && (
            <button
              type="button"
              onClick={() => void set(null)}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              <X className="h-4 w-4" /> หยุด · Stop
            </button>
          )}
        </PopoverContent>
      )}
    </Popover>
  );
}
