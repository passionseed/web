"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import styles from "@/components/hackathon/elemental/join/join.module.css";
import type { ElementKey } from "@/components/hackathon/elemental/media";
import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ElementIcon } from "@/components/hackathon/poster/elemental/element-icons";
import { QUIZ_ELEMENTS, QUIZ_QUESTIONS, QUIZ_RESULTS, scoreQuiz } from "@/lib/hackathon/elemental/quiz";

import { trackElemental } from "../track";

/** How long the five icons cycle before the result opens. */
const REVEAL_MS = 1400;
const line = "rgba(243,239,230,0.18)";

/**
 * The quiz itself: an intro, then one question per screen, then a short
 * reveal. Picking an answer moves on; the result opens at its own shareable
 * URL. Answers stay in this component and are never sent anywhere; only
 * "started" and the element are counted. Dark ground and cream type, like
 * Instagram slide 2 and the result cards.
 *
 * The answers carry no icons on purpose: showing which element an answer
 * belongs to would steer people to the element they want.
 */
export function ElementalQuiz({ source }: { source?: string }) {
  const router = useRouter();
  const [picks, setPicks] = useState<ElementKey[]>([]);
  const [started, setStarted] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [result, setResult] = useState<ElementKey | null>(null);

  const index = picks.length;
  const total = QUIZ_QUESTIONS.length;

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => router.push(`/hackathon/elemental/quiz/${result}?me=1`), REVEAL_MS);
    return () => clearTimeout(t);
  }, [result, router]);

  function start() {
    setStarted(true);
    trackElemental({ step: "quiz_start", source });
  }

  function pick(el: ElementKey) {
    const next = [...picks, el];
    setDirection("forward");
    setPicks(next);
    if (next.length < total) return;
    const scored = scoreQuiz(next);
    trackElemental({ step: "quiz_done", detail: scored, source });
    setResult(scored);
  }

  function back() {
    setDirection("back");
    if (picks.length === 0) setStarted(false);
    else setPicks(picks.slice(0, -1));
  }

  let screen;
  if (result) screen = <Reveal />;
  else if (!started) screen = <Intro onStart={start} />;
  else {
    const q = QUIZ_QUESTIONS[index];
    // A faint icon behind each question, a different element each time. It never matches an answer.
    const mark = QUIZ_ELEMENTS[index % QUIZ_ELEMENTS.length];
    screen = (
      <section className="relative mx-auto flex min-h-[100dvh] max-w-xl flex-col overflow-hidden px-6 py-8">
        <div className="pointer-events-none absolute -bottom-6 -right-12 opacity-[0.05]" aria-hidden="true">
          <ElementIcon element={mark} size={260} color={EL.cream} />
        </div>
        <div className="relative flex items-center gap-4">
          <button type="button" onClick={back} aria-label="ย้อนกลับ" className="rounded-full p-2" style={{ color: EL.creamSoft }}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <PixelProgress done={index} total={total} />
          <span className="text-sm tabular-nums" style={{ fontFamily: EL_FONT.mono, color: EL.creamSoft }}>
            {index + 1}/{total}
          </span>
        </div>

        <div key={index} className={`${direction === "forward" ? styles.stepForward : styles.stepBack} relative flex flex-1 flex-col justify-center py-10`}>
          <h2 className="text-balance text-3xl sm:text-4xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300, lineHeight: 1.3 }}>
            {q.th}
          </h2>
          <div className="mt-8 grid gap-3">
            {q.answers.map((a) => (
              <button
                key={a.element}
                type="button"
                onClick={() => pick(a.element)}
                className={`${styles.choice} rounded-2xl border px-5 py-4 text-left text-lg hover:border-[#ec6424] active:border-[#ec6424]`}
                style={{ borderColor: line, backgroundColor: "rgba(243,239,230,0.04)" }}
              >
                {a.th}
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="min-h-[100dvh]" style={{ backgroundColor: EL.char, color: EL.cream }}>
      {screen}
    </div>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <section className="mx-auto flex min-h-[100dvh] max-w-xl flex-col justify-center px-6 py-16">
      <div className="flex items-end gap-4 sm:gap-6">
        {QUIZ_ELEMENTS.map((el, i) => (
          <div key={el} className={`${styles.pop} flex flex-col items-center gap-2`} style={{ animationDelay: `${i * 90}ms` }}>
            <ElementIcon element={el} size={52} id={`intro-${el}`} />
            <span className="text-xs" style={{ color: EL.creamSoft }}>
              {el === "aether" ? "มองไม่เห็น" : QUIZ_RESULTS[el].th}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-10 text-sm tracking-widest" style={{ fontFamily: EL_FONT.mono, color: EL.creamSoft }}>
        [ELEMENTAL QUIZ]
      </p>
      <h1 className="mt-3 text-balance text-6xl sm:text-7xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.1 }}>
        เธอคือธาตุอะไร
      </h1>
      <p className="mt-5 text-pretty text-lg" style={{ color: EL.creamSoft }}>
        ดิน น้ำ ลม ไฟ หรือธาตุที่มองไม่เห็น 8 ข้อ 1 นาที แล้วดูว่าทีมของเธอยังขาดธาตุไหน
      </p>
      <button
        type="button"
        onClick={onStart}
        className={`${styles.choice} mt-10 inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-lg font-semibold`}
        style={{ backgroundColor: EL.flame, color: EL.char }}
      >
        เริ่มเลย <ArrowRight className="h-5 w-5" />
      </button>
      <p className="mt-4 text-sm" style={{ color: EL.creamSoft }}>
        ไม่ต้องล็อกอิน ไม่เก็บชื่อ คำตอบไม่ถูกส่งไปไหน
      </p>
    </section>
  );
}

/** Progress as a row of pixels, one per question, lit in each element's colour as you go. */
function PixelProgress({ done, total }: { done: number; total: number }) {
  return (
    <div className="flex flex-1 gap-1.5" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`${styles.progress} h-2.5 flex-1`}
          style={{ backgroundColor: i < done ? [EL.toxicRust, EL.toxicCyan, EL.toxicYellow, EL.flame, EL.aetherViolet][i % 5] : "rgba(243,239,230,0.14)" }}
        />
      ))}
    </div>
  );
}

/** The five icons light up one after another while the result loads. */
function Reveal() {
  const [lit, setLit] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setLit((n) => n + 1), 140);
    return () => clearInterval(t);
  }, []);
  return (
    <section className="mx-auto flex min-h-[100dvh] max-w-xl flex-col items-center justify-center px-6" role="status">
      <div className="flex gap-5">
        {QUIZ_ELEMENTS.map((el, i) => (
          <div key={el} style={{ opacity: lit % QUIZ_ELEMENTS.length === i ? 1 : 0.2, transition: "opacity 120ms ease" }}>
            <ElementIcon element={el} size={48} id={`reveal-${el}`} />
          </div>
        ))}
      </div>
      <p className="mt-8 text-xl" style={{ fontFamily: EL_FONT.display }}>
        กำลังอ่านธาตุของเธอ
      </p>
    </section>
  );
}
