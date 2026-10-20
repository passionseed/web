"use client";

import { useState } from "react";

import { joinBoardAction } from "@/app/shift/alumni/board/actions";
import { RSVP_COHORTS } from "@/lib/shift/alumniRsvp";

import board from "./board.module.css";
import { useBoardAction } from "./useBoardAction";

/** One step in for an account that never RSVP'd: nickname and round, then the board opens. */
export function JoinBoard({ suggested }: { suggested: { nickname: string; cohort: string } | null }) {
  const { pending, run } = useBoardAction();
  const [nickname, setNickname] = useState(suggested?.nickname ?? "");
  const [cohort, setCohort] = useState(suggested?.cohort ?? "");
  return (
    <section className={board.card}>
      <h1 className={board.title}>เข้าบอร์ดศิษย์เก่า SHIFT</h1>
      <p className={`${board.muted} mt-1`}>ตั้งเป้า เจอทีม เล่าความคืบหน้า ใส่ชื่อเล่นกับรุ่นครั้งเดียวแล้วเริ่มได้เลย</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => joinBoardAction({ nickname, cohort }));
        }}
      >
        <label className={board.label} htmlFor="join-nickname">
          ชื่อเล่น
        </label>
        <input
          id="join-nickname"
          className={board.input}
          required
          maxLength={30}
          autoComplete="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        <label className={board.label} htmlFor="join-cohort">
          รุ่น
        </label>
        <select
          id="join-cohort"
          className={board.input}
          required
          value={cohort}
          onChange={(e) => setCohort(e.target.value)}
        >
          <option value="" disabled>
            เลือกรุ่น
          </option>
          {RSVP_COHORTS.map((c) => (
            <option key={c.value} value={c.value} className="text-black">
              {c.label}
            </option>
          ))}
        </select>
        <button type="submit" className={`${board.button} mt-4`} disabled={pending}>
          เข้าบอร์ด
        </button>
      </form>
    </section>
  );
}
