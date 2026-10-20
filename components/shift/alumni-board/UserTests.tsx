"use client";

import { useState } from "react";

import { addTestAction, deleteTestAction } from "@/app/shift/alumni/board/actions";
import { formatBangkok, needsTestNudge, type GoalFields, type UserTest } from "@/lib/shift/alumniBoard";

import board from "./board.module.css";
import { useBoardAction } from "./useBoardAction";

function DeleteTest({ id }: { id: string }) {
  const { pending, run } = useBoardAction();
  return (
    <button
      type="button"
      className={`${board.ghost} ${board.small}`}
      disabled={pending}
      onClick={() => {
        if (window.confirm("ลบรายการนี้?")) run(() => deleteTestAction(id));
      }}
    >
      ลบ
    </button>
  );
}

/** 🧪 Who tried the project: a role, never a name, and what we learned. */
export function UserTestsCard({
  total,
  thisRound,
  recent,
  goal,
}: {
  total: number;
  thisRound: number;
  recent: UserTest[];
  goal: Partial<GoalFields> | null;
}) {
  const { pending, run } = useBoardAction();
  const [who, setWho] = useState("");
  const [learned, setLearned] = useState("");
  return (
    <section id="tests" className={board.card}>
      <h2 className={board.subtitle}>🧪 ลองกับคนจริง</h2>
      <p className={`${board.muted} mt-1`}>
        ลองกับคนจริงแล้ว <b>{total}</b> คน · รอบนี้ <b>{thisRound}</b> คน
      </p>
      {needsTestNudge(goal, total) && <p className="mt-2">ยังไม่มีคนลองใช้เลย ลองให้ 1 คนลองภายในสัปดาห์นี้?</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => addTestAction(who, learned),
            () => {
              setWho("");
              setLearned("");
            },
          );
        }}
      >
        <label className={board.label} htmlFor="test-who">
          ใครลองใช้? <span className={board.hint}>ใส่บทบาท ไม่ต้องใส่ชื่อจริง เช่น ครูประถม, เพื่อนม.5</span>
        </label>
        <input
          id="test-who"
          className={board.input}
          required
          maxLength={80}
          autoComplete="off"
          value={who}
          onChange={(e) => setWho(e.target.value)}
        />
        <label className={board.label} htmlFor="test-learned">
          ได้เรียนรู้อะไร? <span className={board.hint}>ไม่ใส่ก็ได้</span>
        </label>
        <textarea
          id="test-learned"
          className={board.input}
          maxLength={500}
          value={learned}
          onChange={(e) => setLearned(e.target.value)}
        />
        <button type="submit" className={`${board.button} mt-4`} disabled={pending}>
          บันทึก
        </button>
      </form>
      {recent.length > 0 && (
        <ul className={board.list}>
          {recent.map((t) => (
            <li key={t.id} className={board.divider}>
              <b>{t.who}</b>
              {t.learned && <p className={board.pre}>💡 {t.learned}</p>}
              <div className={`${board.row} mt-1`}>
                <span className={board.muted}>{formatBangkok(t.created_at)}</span>
                <DeleteTest id={t.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
