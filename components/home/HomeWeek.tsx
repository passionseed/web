import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { RisoIcon, type RisoIconName } from "@/components/shift/poster/RisoIcons";
import { HomeHeading, T, accentFor, tint } from "./homeTheme";
import { floatClass } from "@/components/shift/round/motion";
import { HOME_DELIVERABLES, HOME_NOTES, HOME_SESSION_SHOT } from "@/lib/content/home";
import { getEffectiveCohort } from "@/lib/content/shift-cohort";
import { MarginNote } from "./MarginNote";
import { WeekStepper } from "./WeekStepper";

const DELIVERABLE_ICONS: RisoIconName[] = ["live", "metrics", "caseStudy"];

function Deliverables() {
  return (
    <ul className="mt-6 grid gap-4 sm:grid-cols-3">
      {HOME_DELIVERABLES.map((item, i) => (
        <li key={item} className="home-card flex items-center gap-4 p-5">
          <RisoIcon flat name={DELIVERABLE_ICONS[i]} ink={accentFor(i)} size={44} className={floatClass(i)} />
          <span className="flex flex-col gap-1">
            <span className="font-mono text-[11px] font-bold tracking-[0.16em]" style={{ color: accentFor(i) }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="font-kodchasan text-lg font-semibold leading-snug [text-wrap:balance]">{item}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The one picture of a session itself: what "online in Discord" looks like. */
function SessionShot() {
  const shot = HOME_SESSION_SHOT;
  return (
    <figure className="mt-12 grid items-center gap-5 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:gap-10">
      <Image
        src={shot.src}
        width={shot.width}
        height={shot.height}
        alt={shot.alt}
        sizes="(min-width: 768px) 560px, 100vw"
        className="h-auto w-full rounded-2xl"
        style={{ boxShadow: `0 0 0 1px ${tint("26")}, 0 40px 100px -55px ${T.accent2}` }}
      />
      <figcaption>
        <span className="text-sm font-semibold" style={{ color: T.accent1 }}>
          {shot.label}
        </span>
        <span className="mt-2 block font-kodchasan text-lg font-semibold leading-snug [text-wrap:pretty] sm:text-xl">
          {shot.caption}
        </span>
      </figcaption>
    </figure>
  );
}

export function HomeWeek() {
  return (
    <section className="py-10 sm:py-20">
      <HomeHeading>7 วัน วันละหนึ่งงาน ทุกวันมีของต้องส่ง</HomeHeading>
      <div className="mt-10">
        <WeekStepper schedule={getEffectiveCohort().schedule} />
      </div>
      <SessionShot />

      <p className="mt-14 font-kodchasan text-xl font-semibold" style={{ color: T.accent2 }}>
        ครบ 7 วัน ถือของ 3 ชิ้นนี้ออกไป
      </p>
      <Deliverables />

      <div className="mt-12 flex flex-wrap items-center gap-6">
        <Link
          href="/shift"
          className="inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.16em] underline decoration-[rgba(127,227,255,0.55)] decoration-2 underline-offset-8 transition hover:decoration-[rgba(127,227,255,1)]"
          style={{ color: T.accent3 }}
        >
          ดูตารางเต็มทั้ง 7 วัน <ArrowRight className="h-4 w-4" />
        </Link>
        <MarginNote>{HOME_NOTES.week}</MarginNote>
      </div>
    </section>
  );
}
