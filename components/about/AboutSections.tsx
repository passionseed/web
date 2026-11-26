import Link from "next/link";
import { ArrowDown } from "lucide-react";
import type { ReactNode } from "react";

import { MarginNote } from "@/components/home/MarginNote";
import { OrbitSky } from "@/components/shift/poster/riso";
import { HAIR, INK, MISREG_TEXT, RisoHeading, paper } from "@/components/shift/ShiftRiso";
import {
  ABOUT_BELIEFS_HEADING,
  ABOUT_BELIEFS_NOTE,
  ABOUT_CHOOSE,
  ABOUT_DOORS,
  ABOUT_ENGLISH,
  ABOUT_HERO,
  ABOUT_MACHINE,
  ABOUT_REALITY,
  ABOUT_ROOM,
  ABOUT_TRAIL,
} from "@/lib/content/about";
import { SHIFT_PAYMENT } from "@/lib/content/shift-cohort";
import { AboutTrail } from "./AboutTrail";
import { DoorPicker } from "./DoorPicker";
import { GroupChat } from "./GroupChat";
import { MentorBall } from "./MentorBall";
import { Phrases } from "./Phrases";
import { PortfolioMachine } from "./PortfolioMachine";
import { RealityDesk } from "./RealityDesk";

const HORIZON = "clamp(460px, 62svh, 640px)";

export function AboutHero() {
  return (
    <section className="relative overflow-hidden">
      <OrbitSky horizon={HORIZON} speckle={0} />
      <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
        <div className="flex flex-col items-center justify-center pb-10 pt-28 text-center" style={{ minHeight: HORIZON }}>
          <h1
            className="font-kodchasan text-[clamp(34px,5.6vw,64px)] font-bold leading-[1.35] tracking-tight"
            style={MISREG_TEXT}
          >
            <Phrases text={ABOUT_HERO.title[0]} />
            <br />
            <Phrases text={ABOUT_HERO.title[1]} />
          </h1>
        </div>
        <div className="flex flex-col items-center pb-16 pt-12 text-center sm:pt-16">
          <p className="max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: paper("b3") }}>
            {ABOUT_HERO.lede}
          </p>
          <MarginNote className="mt-8">{ABOUT_HERO.note}</MarginNote>
          <Link
            href="#machine"
            aria-label={ABOUT_MACHINE.heading}
            className="mt-10 flex h-11 w-11 items-center justify-center rounded-full border transition-colors hover:border-[#ffe800] hover:text-[#ffe800]"
            style={{ borderColor: paper("40"), color: paper("b3") }}
          >
            <ArrowDown className="about-nudge h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function AboutMachine() {
  return (
    <section id="machine" className="scroll-mt-20 py-16 sm:py-24">
      <RisoHeading>
        <Phrases text={ABOUT_MACHINE.heading} />
      </RisoHeading>
      <div className="mt-10">
        <PortfolioMachine copy={ABOUT_MACHINE} />
      </div>
      <MarginNote className="mt-12">{ABOUT_MACHINE.note}</MarginNote>
    </section>
  );
}

/** One belief: its words on one side, its toy on the other, sides alternating. */
function Belief({ title, line, flip, children }: { title: string; line: string; flip?: boolean; children: ReactNode }) {
  return (
    <div className={`grid gap-8 border-t py-12 sm:py-14 lg:grid-cols-2 lg:items-center lg:gap-14 ${HAIR}`}>
      <div className={flip ? "lg:order-2" : undefined}>
        <h3 className="font-kodchasan text-3xl font-bold tracking-tight sm:text-4xl" style={MISREG_TEXT}>
          {title}
        </h3>
        <p className="mt-4 max-w-md text-base leading-relaxed sm:text-lg" style={{ color: paper("cc") }}>
          {line}
        </p>
      </div>
      <div className={flip ? "lg:order-1" : undefined}>{children}</div>
    </div>
  );
}

export function AboutBeliefs() {
  return (
    <section className="py-16 sm:py-24">
      <RisoHeading>{ABOUT_BELIEFS_HEADING}</RisoHeading>
      <div className="mt-10">
        <Belief title={ABOUT_CHOOSE.title} line={ABOUT_CHOOSE.rule}>
          <MentorBall copy={ABOUT_CHOOSE} />
        </Belief>
        <Belief title={ABOUT_REALITY.title} line={ABOUT_REALITY.body} flip>
          <RealityDesk copy={ABOUT_REALITY} />
        </Belief>
        <Belief title={ABOUT_ROOM.title} line={ABOUT_ROOM.rule}>
          <GroupChat copy={ABOUT_ROOM} />
        </Belief>
      </div>
      <MarginNote className="mt-6">{ABOUT_BELIEFS_NOTE}</MarginNote>
    </section>
  );
}

export function AboutDoors() {
  return (
    <section className="py-16 sm:py-24">
      <RisoHeading>{ABOUT_DOORS.heading}</RisoHeading>
      <div className="mt-10">
        <DoorPicker copy={ABOUT_DOORS} />
      </div>
      <MarginNote className="mt-10">{ABOUT_DOORS.note}</MarginNote>
    </section>
  );
}

export function AboutTrailSection() {
  return (
    <section className="py-16 sm:py-24">
      <RisoHeading>{ABOUT_TRAIL.heading}</RisoHeading>
      <div className="mt-12">
        <AboutTrail steps={ABOUT_TRAIL.steps} stamp={ABOUT_TRAIL.stamp} lines={ABOUT_TRAIL.lines} />
      </div>
      <MarginNote className="mt-12">{ABOUT_TRAIL.note}</MarginNote>
    </section>
  );
}

export function AboutEnglish() {
  return (
    <section lang="en" className={`border-t py-16 sm:py-20 ${HAIR}`}>
      <h2 className="font-kodchasan text-2xl font-bold">{ABOUT_ENGLISH.heading}</h2>
      <p className="mt-5 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: paper("b3") }}>
        {ABOUT_ENGLISH.body}
      </p>
      <p className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <span style={{ color: paper("99") }}>{ABOUT_ENGLISH.contact}</span>
        <Link href="/contact" className="font-semibold underline underline-offset-4" style={{ color: INK.yellow }}>
          Contact
        </Link>
        <a
          href={SHIFT_PAYMENT.lineUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline underline-offset-4"
          style={{ color: INK.yellow }}
        >
          LINE {SHIFT_PAYMENT.lineId}
        </a>
      </p>
    </section>
  );
}
