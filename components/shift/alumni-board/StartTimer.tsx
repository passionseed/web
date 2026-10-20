"use client";

import { useEffect, useState } from "react";

import { finishTimerAction, startTimerAction } from "@/app/shift/alumni/board/actions";
import {
  cheerFor,
  formatBangkokClock,
  START_MINUTES,
  startSecondsLeft,
  type Start,
} from "@/lib/shift/alumniBoard";

import board from "./board.module.css";
import { useBoardAction } from "./useBoardAction";

const pad = (n: number) => String(n).padStart(2, "0");

/** Counts down from what the server says is left, so a phone with the wrong clock still shows 10:00. */
function Clock({ start }: { start: Start }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const end = Date.now() + startSecondsLeft(start) * 1000;
    const tick = () => setLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [start]);
  if (left === null) return null;
  return (
    <p className={board.clock} role="timer" aria-live="off">
      {left ? `⏱️ ${pad(Math.floor(left / 60))}:${pad(left % 60)}` : `🎉 ครบ ${START_MINUTES} นาทีแล้ว!`}
    </p>
  );
}

function FinishForm({ start }: { start: Start }) {
  const { pending, run } = useBoardAction();
  const [note, setNote] = useState("");
  const endsAt = new Date(Date.parse(start.started_at) + START_MINUTES * 60_000).toISOString();
  return (
    <>
      <Clock start={start} />
      <p className={board.muted}>
        เริ่มแล้ว เวลา {formatBangkokClock(start.started_at)} · ครบ {START_MINUTES} นาทีตอน {formatBangkokClock(endsAt)}
      </p>
      <label className={board.label} htmlFor="start-note">
        ทำได้อะไรบ้าง? <span className={board.hint}>ไม่เขียนก็ได้</span>
      </label>
      <input
        id="start-note"
        className={board.input}
        maxLength={500}
        autoComplete="off"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className={`${board.row} ${board.actions}`}>
        <button
          type="button"
          className={board.button}
          disabled={pending}
          onClick={() => run(() => finishTimerAction(start.id, note, false))}
        >
          ✅ เสร็จ
        </button>
        <button
          type="button"
          className={board.ghost}
          disabled={pending}
          onClick={() => run(() => finishTimerAction(start.id, note, true), () => setNote(""))}
        >
          🔁 ทำต่ออีก {START_MINUTES} นาที
        </button>
      </div>
    </>
  );
}

/** "Start 10 minutes": the big button on the first step, or the running timer. */
export function StartTimer({ open, cheer, count }: { open: Start | null; cheer: Start | null; count: number }) {
  const { pending, run } = useBoardAction();
  return (
    <div className="mt-3">
      {cheer && <p className={board.cheer}>{cheerFor(cheer.id)}</p>}
      {open ? (
        <FinishForm key={open.id} start={open} />
      ) : (
        <button
          type="button"
          className={`${board.button} ${board.wide} mt-2`}
          disabled={pending}
          onClick={() => run(startTimerAction)}
        >
          ⏱️ เริ่ม {START_MINUTES} นาที
        </button>
      )}
      <p className={`${board.muted} mt-3`}>เริ่มไปแล้ว {count} ครั้งในรอบนี้</p>
    </div>
  );
}
