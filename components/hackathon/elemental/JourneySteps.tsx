import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, CalendarClock, Clapperboard, Hammer, LifeBuoy, MessageCircle, Mic, MousePointerClick, Ticket } from "lucide-react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";

import { journeySteps, type JourneyStep, type StepIcon } from "./journey-steps";

const BODY_FONT = "var(--font-bai-jamjuree), sans-serif";
const LINE = "border-[#f3efe6]/12";

const ICONS: Record<StepIcon, LucideIcon> = {
  pick: MousePointerClick,
  signup: Ticket,
  discord: MessageCircle,
  talk: Mic,
  build: Hammer,
  submit: Clapperboard,
};

/** The promise over all six steps: beginners can do this, and every step has help. */
export const BEGINNER_LINE_TH = "มือใหม่ก็ทำได้ ทุกขั้นมีคนช่วย";

type Links = { boardHref?: string; joinHref?: string };

function hrefFor(step: JourneyStep, links: Links): string | undefined {
  if (step.link === "board") return links.boardHref;
  if (step.link === "join") return links.joinHref;
  return undefined;
}

function StepCard({ step, index, href }: { step: JourneyStep; index: number; href?: string }) {
  const Icon = ICONS[step.icon];
  // Phones: a row, the number on the left. Wider screens: a card, the number on top.
  const body = (
    <span className="flex items-start gap-4 sm:block">
      <span className="flex shrink-0 items-start justify-between sm:w-full">
        <span className="w-7 text-4xl text-[#faf8f4] sm:w-auto sm:text-5xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1 }}>
          {index + 1}
        </span>
        <Icon aria-hidden="true" className="hidden h-7 w-7 sm:block" strokeWidth={1.75} style={{ color: EL.flameCore }} />
      </span>
      <span className="block min-w-0 flex-1 sm:mt-5">
        <span className="flex items-center gap-2">
          <Icon aria-hidden="true" className="h-5 w-5 shrink-0 sm:hidden" strokeWidth={1.75} style={{ color: EL.flameCore }} />
          <span className="text-xl text-[#faf8f4] sm:text-2xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300, lineHeight: 1.25 }}>
            {step.doTh}
          </span>
        </span>
        <span className="mt-2 flex items-center gap-1.5 text-xs sm:mt-3" style={{ fontFamily: EL_FONT.mono, color: EL.flameCore }}>
          <CalendarClock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
          {step.whenTh}
        </span>
        <span className="mt-1.5 flex items-start gap-1.5 text-sm text-[#cfc9bd] sm:mt-2" style={{ fontFamily: BODY_FONT }}>
          <LifeBuoy aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
          {step.helpTh}
        </span>
      </span>
      {href ? (
        <ArrowUpRight
          aria-hidden="true"
          className="absolute right-4 top-4 h-4 w-4 text-[#f3efe6]/40 transition-colors group-hover:text-[#faf8f4] sm:right-5 sm:top-5"
        />
      ) : null}
    </span>
  );
  const box = `relative block h-full border ${LINE} bg-[#0c0d0c] p-4 sm:p-5 ${href ? "sm:pr-12" : ""}`;
  return (
    <li>
      {href ? (
        <Link href={href} className={`${box} group transition-[background-color,transform] duration-150 hover:bg-[#161715] active:scale-[0.985]`}>
          {body}
        </Link>
      ) : (
        <div className={box}>{body}</div>
      )}
    </li>
  );
}

/**
 * The six steps on /hackathon/elemental, right after the hero: what a
 * student does, when, and the help they get. Steps 1 and 2 link to the board
 * and the sign-up.
 */
export function JourneySteps({ boardHref, joinHref }: Links) {
  const steps = journeySteps();
  return (
    <section id="steps" aria-labelledby="steps-title" className="relative scroll-mt-16 border-t border-[#f3efe6]/15 bg-[#0c0d0c] px-5 py-20 sm:px-10 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <h2 id="steps-title" className="text-5xl text-[#faf8f4] sm:text-6xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.1 }}>
          ทำอะไรบ้าง
        </h2>
        <p className="mt-4 flex items-center gap-2 text-lg sm:text-xl" style={{ fontFamily: BODY_FONT, color: EL.flameCore }}>
          <LifeBuoy aria-hidden="true" className="h-5 w-5 shrink-0" />
          {BEGINNER_LINE_TH}
        </p>
        <ol className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, i) => (
            <StepCard key={step.icon} step={step} index={i} href={hrefFor(step, { boardHref, joinHref })} />
          ))}
        </ol>
      </div>
    </section>
  );
}

/**
 * The same six steps, small, above the problem board: number, icon and
 * action only, with step 1 marked "you are here". The full steps, with times
 * and help, are one tap away on the landing page.
 */
export function JourneyStepsCompact({ joinHref, stepsHref }: { joinHref?: string; stepsHref: string }) {
  const steps = journeySteps();
  return (
    <div className="mt-8">
      <ol className="grid grid-cols-3 gap-2 lg:grid-cols-6">
        {steps.map((step, i) => {
          const Icon = ICONS[step.icon];
          const here = i === 0;
          const href = step.link === "join" ? joinHref : undefined;
          const inner = (
            <>
              <span className="flex items-center justify-between">
                <span className="text-xs" style={{ fontFamily: EL_FONT.mono, color: here ? EL.flameCore : "rgba(243,239,230,0.5)" }}>
                  {i + 1}
                </span>
                <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} style={{ color: here ? EL.flameCore : "rgba(243,239,230,0.7)" }} />
              </span>
              <span className="mt-2 block text-[13px] leading-snug text-[#faf8f4] sm:text-sm" style={{ fontFamily: BODY_FONT }}>
                {step.doTh}
              </span>
              {here ? (
                <span className="mt-2 inline-block bg-[#ffd57a] px-1.5 text-[10px] text-[#0c0d0c]" style={{ fontFamily: EL_FONT.mono }}>
                  อยู่ตรงนี้
                </span>
              ) : null}
            </>
          );
          const box = `block h-full border p-2.5 sm:p-3 ${here ? "border-[#ffd57a]" : LINE}`;
          return (
            <li key={step.icon} aria-current={here ? "step" : undefined}>
              {href ? (
                <Link href={href} className={`${box} transition-colors hover:bg-[#161715]`}>
                  {inner}
                </Link>
              ) : (
                <div className={box}>{inner}</div>
              )}
            </li>
          );
        })}
      </ol>
      <Link
        href={stepsHref}
        className="mt-4 inline-flex items-center gap-2 text-sm underline underline-offset-4"
        style={{ fontFamily: BODY_FONT, color: EL.flameCore }}
      >
        <LifeBuoy aria-hidden="true" className="h-4 w-4 shrink-0" />
        {BEGINNER_LINE_TH} →
      </Link>
    </div>
  );
}
