"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import styles from "@/components/hackathon/elemental/join/join.module.css";
import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import type { ElementKey } from "@/components/hackathon/elemental/media";
import { QUIZ_QUESTIONS, scoreQuiz } from "@/lib/hackathon/elemental/quiz";

import { trackElemental } from "../track";

/**
 * The quiz itself: an intro, then one question per screen. Picking an answer
 * moves on; the result opens at its own shareable URL. Answers stay in this
 * component and are never sent anywhere; only "started" and the element are counted.
 */
export function ElementalQuiz({ source }: { source?: string }) {
  const router = useRouter();
  const [picks, setPicks] = useState<ElementKey[]>([]);
  const [started, setStarted] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  const index = picks.length;
  const total = QUIZ_QUESTIONS.length;

  function start() {
    setStarted(true);
    trackElemental({ step: "quiz_start", source });
  }

  function pick(el: ElementKey) {
    const next = [...picks, el];
    setDirection("forward");
    if (next.length < total) {
      setPicks(next);
      return;
    }
    const result = scoreQuiz(next);
    trackElemental({ step: "quiz_done", detail: result, source });
    setPicks(next);
    router.push(`/hackathon/elemental/quiz/${result}?me=1`);
  }

  function back() {
    setDirection("back");
    if (picks.length === 0) setStarted(false);
    else setPicks(picks.slice(0, -1));
  }

  if (!started) {
    return (
      <section className="mx-auto flex min-h-[100dvh] max-w-xl flex-col justify-center px-6 py-16">
        <p className="text-sm tracking-widest" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
          [ELEMENTAL QUIZ]
        </p>
        <h1 className="mt-4 text-balance text-6xl sm:text-7xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.1 }}>
          เธอคือธาตุอะไร
        </h1>
        <p className="mt-5 text-pretty text-lg" style={{ color: EL.inkSoft }}>
          ดิน น้ำ ลม ไฟ หรือธาตุที่มองไม่เห็น 8 ข้อ 1 นาที แล้วดูว่าทีมของเธอยังขาดธาตุไหน
        </p>
        <button
          type="button"
          onClick={start}
          className={`${styles.choice} mt-10 inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-lg font-semibold`}
          style={{ backgroundColor: EL.ink, color: EL.cream }}
        >
          เริ่มเลย <ArrowRight className="h-5 w-5" />
        </button>
        <p className="mt-4 text-sm" style={{ color: EL.inkSoft }}>
          ไม่ต้องล็อกอิน ไม่เก็บชื่อ คำตอบไม่ถูกส่งไปไหน
        </p>
      </section>
    );
  }

  const done = index >= total;
  const q = QUIZ_QUESTIONS[Math.min(index, total - 1)];

  return (
    <section className="mx-auto flex min-h-[100dvh] max-w-xl flex-col px-6 py-8">
      <div className="flex items-center gap-4">
        <button type="button" onClick={back} disabled={done} aria-label="ย้อนกลับ" className="rounded-full p-2" style={{ color: EL.inkSoft }}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: "rgba(29,33,31,0.12)" }}>
          <div className={`${styles.progress} h-full`} style={{ width: `${(index / total) * 100}%`, backgroundColor: EL.flame }} />
        </div>
        <span className="text-sm tabular-nums" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
          {Math.min(index + 1, total)}/{total}
        </span>
      </div>

      <div key={index} className={`${direction === "forward" ? styles.stepForward : styles.stepBack} flex flex-1 flex-col justify-center py-10`}>
        <h2 className="text-balance text-3xl sm:text-4xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300, lineHeight: 1.3 }}>
          {q.th}
        </h2>
        <div className="mt-8 grid gap-3">
          {q.answers.map((a) => (
            <button
              key={a.element}
              type="button"
              disabled={done}
              onClick={() => pick(a.element)}
              className={`${styles.choice} rounded-2xl border bg-white/60 px-5 py-4 text-left text-lg hover:border-[#ec6424]`}
              style={{ borderColor: "rgba(29,33,31,0.18)" }}
            >
              {a.th}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
