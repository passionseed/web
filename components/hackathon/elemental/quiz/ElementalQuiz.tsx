"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import styles from "@/components/hackathon/elemental/join/join.module.css";
import { elementLabel, type ElementKey } from "@/components/hackathon/elemental/media";
import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { QUIZ_ELEMENTS, QUIZ_QUESTIONS, QUIZ_RESULTS, scoreQuiz } from "@/lib/hackathon/elemental/quiz";
import { quizLayers } from "@/lib/hackathon/elemental/quiz-music";
import { sfxBack, sfxBuild, sfxElement, sfxPick, sfxStart } from "@/lib/hackathon/elemental/quiz-sfx";

import { hitClass, hitStyle } from "./hit";
import { IconAssemble, IconFlash, IconFx } from "./PixelArt";
import { PlayableIcon } from "./PlayableIcon";
import { QuestionScene } from "./QuestionScene";
import fx from "./quiz.module.css";
import { play, setMusicLayers, startMusic, stop, stopMusic } from "./sound";
import { SoundToggle } from "./SoundToggle";

import { trackElemental } from "../track";

/** How long a picked answer stays lit before the next question: long enough to see, short enough to repeat eight times. */
const PICK_MS = 100;
/** How long the icon takes to build itself, then how long it holds, landed, before the result opens. */
const BUILD_MS = 700;
const HOLD_MS = 800;

const nameOf = (el: ElementKey) => elementLabel(QUIZ_RESULTS[el].th);


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
  const [picks, setPicks] = useState<ElementKey[]>([]);
  const [started, setStarted] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [result, setResult] = useState<ElementKey | null>(null);
  const [chosen, setChosen] = useState<ElementKey | null>(null);
  // Set the instant an answer is tapped, so a second tap in the same frame can't pick twice.
  const pending = useRef(false);
  const pickTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(
    () => () => {
      clearTimeout(pickTimer.current);
      // Only this page's songs: the result page may already have started its own.
      stopMusic({ only: ["title", "quiz"] });
    },
    [],
  );

  const index = picks.length;
  const total = QUIZ_QUESTIONS.length;

  // Each new question takes focus, so keyboard and screen reader users land on it, not on the page.
  // The music builds with it: a new layer joins on the third and fifth questions.
  useEffect(() => {
    if (!started || result) return;
    heading.current?.focus({ preventScroll: true });
    setMusicLayers(quizLayers(index));
  }, [started, result, index]);

  function start() {
    setStarted(true);
    trackElemental({ step: "quiz_start", source });
    play(sfxStart);
    // The quiz loop plays under the questions, from this tap (which lets the browser start audio).
    startMusic("quiz", quizLayers(0));
  }

  /** The answer lights and plays its question's note, then the next question comes in. */
  function pick(el: ElementKey) {
    if (pending.current) return;
    pending.current = true;
    setChosen(el);
    pickTimer.current = setTimeout(() => {
      pending.current = false;
      const next = [...picks, el];
      setChosen(null);
      setDirection("forward");
      setPicks(next);
      if (next.length < total) return;
      const scored = scoreQuiz(next);
      setResult(scored);
      trackElemental({ step: "quiz_done", detail: scored, source });
    }, PICK_MS);
    play((o, t) => sfxPick(o, t, index));
  }

  function back() {
    if (pending.current) return;
    setDirection("back");
    if (picks.length === 0) {
      setStarted(false);
      startMusic("title");
    } else setPicks(picks.slice(0, -1));
    play(sfxBack);
  }

  let screen;
  if (result) screen = <Reveal element={result} />;
  else if (!started) screen = <Intro onStart={start} />;
  else {
    const q = QUIZ_QUESTIONS[index];
    // A flat page: the question's scene is the only picture.
    screen = (
      <section className="relative mx-auto flex min-h-[100dvh] max-w-xl flex-col overflow-hidden px-6 py-6">
        <div className="relative flex items-center gap-3">
          <button type="button" onClick={back} aria-label="ย้อนกลับ" className="rounded-full p-3.5" style={{ color: EL.creamSoft }}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <PixelProgress done={index} total={total} pop={direction === "forward"} />
          <span className="text-sm tabular-nums" style={{ fontFamily: EL_FONT.mono, color: EL.creamSoft }}>
            {index + 1}/{total}
          </span>
          <SoundToggle color={EL.creamSoft} />
        </div>

        <div key={index} className={`${direction === "forward" ? fx.stepFromRight : fx.stepFromLeft} relative flex flex-1 flex-col justify-center py-4`}>
          {/* The situation, never an answer: see docs/hackathon/elemental-quiz-pixel-art.md, "Scenes". Under 720 px
              tall (iPhone SE) the answers need the room, so the scene steps aside. */}
          <div className="mb-5 [@media(max-height:719px)]:hidden" aria-hidden="true">
            <QuestionScene question={index} />
          </div>
          <h2
            ref={heading}
            tabIndex={-1}
            className="text-balance text-3xl outline-none sm:text-4xl"
            style={{ fontFamily: EL_FONT.display, fontWeight: 300, lineHeight: 1.3 }}
          >
            {q.th}
          </h2>
          <div className="mt-8 grid gap-3">
            {q.answers.map((a) => (
              <button
                key={a.element}
                type="button"
                onClick={() => pick(a.element)}
                className={`${fx.answer} ${chosen === a.element ? fx.picked : chosen ? fx.dimmed : ""} rounded-2xl border px-5 py-4 text-left text-lg`}
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
      {/* Always mounted, so screen readers announce the result when it arrives. */}
      <p className="sr-only" role="status">
        {result ? `คุณคือ${nameOf(result)}` : ""}
      </p>
      {screen}
    </div>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  // Each icon at three sizes, so the row always fits: 4 px a pixel under 390 px wide, 5 on phones, 6 wider up.
  const sizes = [
    { cell: 4, show: "min-[390px]:hidden", key: "s" },
    { cell: 5, show: "hidden min-[390px]:block sm:hidden", key: "m" },
    { cell: 6, show: "hidden sm:block", key: "l" },
  ];
  return (
    <section className="relative mx-auto flex min-h-[100dvh] max-w-xl flex-col justify-center px-6 py-16">
      <div className="absolute right-2 top-2">
        <SoundToggle color={EL.creamSoft} />
      </div>
      {/* The five icons, each with its effect playing; tap one to hear it. They arrive one at a time, whole.
          An effect reaches 3 pixels past its icon, so the gaps leave room for it, and gap-6 keeps each label clear. */}
      <div className="flex items-end gap-4 min-[390px]:gap-6 sm:gap-10">
        {QUIZ_ELEMENTS.map((el, i) => (
          <div key={el} className={`${fx.pixelIn} flex flex-col items-center gap-6`} style={{ animationDelay: `${i * 90}ms` }}>
            {sizes.map(({ cell, show, key }) => (
              <div key={key} className={show}>
                <PlayableIcon element={el} cell={cell} id={`intro-${key}-${el}`} label={`ฟังเสียง${nameOf(el)}`} music="title" />
              </div>
            ))}
            <span className="text-xs" style={{ color: EL.creamSoft }}>
              {QUIZ_RESULTS[el].th}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-10 text-sm tracking-widest" style={{ fontFamily: EL_FONT.mono, color: EL.creamSoft }}>
        [ELEMENTAL QUIZ]
      </p>
      <h1 className="mt-3 text-balance text-6xl sm:text-7xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.1 }}>
        คุณคือธาตุอะไร
      </h1>
      <p className="mt-5 text-pretty text-lg" style={{ color: EL.creamSoft }}>
        ดิน น้ำ ลม ไฟ หรืออีเธอร์ 8 ข้อ 1 นาที แล้วดูว่าทีมของคุณยังขาดธาตุไหน
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

/**
 * Progress as a row of square pixels, one per question, lit in the elements'
 * colours as you go. The square just lit pops (when moving forward), and the
 * one you're on blinks like a cursor.
 */
function PixelProgress({ done, total, pop }: { done: number; total: number; pop: boolean }) {
  const lit = [EL.toxicRust, EL.toxicCyan, EL.toxicYellow, EL.flame, EL.aetherViolet];
  return (
    <div className="flex flex-1 items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`block h-3 w-3 ${pop && i === done - 1 ? fx.pixelPop : i === done ? fx.cursor : ""}`}
          style={{ backgroundColor: i < done ? lit[i % lit.length] : i === done ? "rgba(243,239,230,0.5)" : "rgba(243,239,230,0.14)" }}
        />
      ))}
    </div>
  );
}

/**
 * The result's icon builds itself pixel by pixel while three dots fill in
 * step with it, ticking once a row. Then it lands on one beat: a flash, its
 * element's hit, its name and its sound, and its effect starts. The result
 * page opens 800 ms later. One timeline: everything is timed from mount, and
 * leaving cancels the timers and the sound together. With reduced motion it
 * lands at once.
 */
function Reveal({ element }: { element: ElementKey }) {
  const router = useRouter();
  const [still] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true);
  const [landed, setLanded] = useState(still);
  useEffect(() => {
    const href = `/hackathon/elemental/quiz/${element}?me=1`;
    router.prefetch(href);
    const build = still ? 0 : BUILD_MS;
    // The music steps back so the reveal has the room.
    stopMusic();
    play(
      (o, t) => {
        if (!still) sfxBuild(o, t, element, BUILD_MS);
        sfxElement(o, t + build / 1000, element);
      },
      { channel: "reveal", replace: true },
    );
    const land = setTimeout(() => setLanded(true), build);
    const leave = setTimeout(() => router.push(href), build + HOLD_MS);
    return () => {
      clearTimeout(land);
      clearTimeout(leave);
      stop("reveal");
    };
  }, [element, router, still]);
  return (
    <section className="relative mx-auto flex min-h-[100dvh] max-w-xl flex-col items-center justify-center px-6">
      <div className="absolute right-2 top-2">
        <SoundToggle color={EL.creamSoft} />
      </div>
      {landed ? (
        <div className={`relative ${hitClass(element) ?? ""}`} style={hitStyle(18)}>
          <IconFx element={element} cell={18} id="reveal" />
          <div className="absolute inset-0">
            <IconFlash element={element} cell={18} />
          </div>
        </div>
      ) : (
        <IconAssemble element={element} cell={18} durationMs={BUILD_MS} id="reveal" />
      )}
      {/* mt-20 clears the effect, which reaches 3 pixels (54 px) below the icon; h-14 holds the line still when the name replaces it. */}
      <div className="mt-20 flex h-14 items-center" style={{ fontFamily: EL_FONT.display }} aria-hidden="true">
        {landed ? (
          <p className="text-4xl">{nameOf(element)}</p>
        ) : (
          <p className="flex items-baseline gap-2 text-xl">
            กำลังอ่านธาตุของคุณ
            <span className="flex gap-1.5">
              {/* One dot per quarter of the build, so the third lights just before the icon lands. */}
              {[1, 2, 3].map((n) => (
                <span key={n} className={`block h-1.5 w-1.5 ${fx.pixelIn}`} style={{ backgroundColor: EL.cream, animationDelay: `${(n * BUILD_MS) / 4}ms` }} />
              ))}
            </span>
          </p>
        )}
      </div>
    </section>
  );
}
