"use client";

import { ArrowUpRight } from "lucide-react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

import { ANY_PROBLEM_NOTE, type ElementCase, type ElementDetail } from "./challenges";
import type { ElementChapter } from "./media";

const BODY_FONT = "var(--font-bai-jamjuree), sans-serif";

function elementLabel(th: string) {
  return th.startsWith("ธาตุ") ? th : `ธาตุ${th}`;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-2xl text-[#faf8f4] sm:text-[1.7rem]"
      style={{ fontFamily: EL_FONT.display, fontWeight: 300, lineHeight: 1.2 }}
    >
      {children}
    </h3>
  );
}

function CaseCard({ item, color }: { item: ElementCase; color: string }) {
  return (
    <article className="border-t border-[#f3efe6]/15 pt-5">
      <p className="text-xs text-[#cfc9bd]" style={{ fontFamily: EL_FONT.mono }}>
        [{item.placeTh} · {item.yearTh}]
      </p>
      <h4
        className="mt-2 text-xl text-[#faf8f4]"
        style={{ fontFamily: EL_FONT.display, fontWeight: 300, lineHeight: 1.3 }}
      >
        {item.titleTh}
      </h4>
      <p className="mt-2 text-[0.95rem] leading-relaxed text-[#e6e1d7]" style={{ fontFamily: BODY_FONT }}>
        {item.whatHappenedTh}
      </p>

      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {item.impact.map((stat) => (
          <div key={stat.value + stat.labelTh}>
            <dt
              className="text-2xl"
              style={{ fontFamily: EL_FONT.display, fontWeight: 300, color, lineHeight: 1.1 }}
            >
              {stat.value}
            </dt>
            <dd className="mt-1 text-sm leading-snug text-[#e6e1d7]" style={{ fontFamily: BODY_FONT }}>
              {stat.labelTh}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-sm text-[#e6e1d7]" style={{ fontFamily: BODY_FONT }}>
        <span className="text-[#cfc9bd]">ใครเจ็บ: </span>
        {item.whoIsHurtTh}
      </p>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {item.sources.map((source) => (
          <li key={source.url}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#cfc9bd] underline decoration-[#f3efe6]/30 underline-offset-4 transition-colors hover:text-[#faf8f4]"
              style={{ fontFamily: EL_FONT.mono }}
            >
              ที่มา: {source.name}, {source.dateTh}
              <ArrowUpRight aria-hidden="true" className="h-3 w-3" />
            </a>
          </li>
        ))}
      </ul>
    </article>
  );
}

/**
 * The full brief for one element, opened from its chapter on /hackathon:
 * the problem, the challenge at two sizes, and real cases with their impact.
 * Opens over the page, so a student never loses their place in the scroll.
 */
export function ElementDetailSheet({
  chapter,
  detail,
  open,
  onOpenChange,
  joinHref,
  registrationOpen,
}: {
  chapter: ElementChapter;
  detail: ElementDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  joinHref: string;
  registrationOpen: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-l border-[#f3efe6]/15 bg-[#0c0d0c] p-0 text-[#faf8f4] sm:max-w-xl [&>button]:right-5 [&>button]:top-5 [&>button]:text-[#faf8f4] [&>button]:opacity-80 [&>button]:ring-offset-0 [&>button]:focus:ring-[#f3efe6]/40"
      >
        <div className="px-6 pb-12 pt-14 sm:px-10">
          <SheetTitle
            className="text-5xl sm:text-6xl"
            style={{ fontFamily: EL_FONT.display, fontWeight: 200, color: chapter.color, lineHeight: 1 }}
          >
            {elementLabel(chapter.th)}
          </SheetTitle>
          <SheetDescription
            className="mt-3 text-xl text-[#faf8f4]"
            style={{ fontFamily: EL_FONT.display, fontWeight: 300, lineHeight: 1.3 }}
          >
            {chapter.subtitleTh}
          </SheetDescription>
          <p className="mt-4 text-[0.95rem] leading-relaxed text-[#e6e1d7]" style={{ fontFamily: BODY_FONT }}>
            {detail.problemTh}
          </p>

          <section className="mt-10" aria-label="โจทย์">
            <SectionHeading>โจทย์</SectionHeading>
            <p
              className="mt-3 border-l-2 pl-4 text-lg leading-relaxed text-[#faf8f4]"
              style={{ borderColor: chapter.color, fontFamily: BODY_FONT }}
            >
              {detail.howMightWeTh}
            </p>
            <dl className="mt-5 space-y-4" style={{ fontFamily: BODY_FONT }}>
              <div>
                <dt className="text-sm text-[#cfc9bd]">เริ่มง่าย ทำจบได้ใน 3 วัน</dt>
                <dd className="mt-1 text-[0.95rem] leading-relaxed text-[#e6e1d7]">{detail.starterTh}</dd>
              </div>
              <div>
                <dt className="text-sm text-[#cfc9bd]">ทีมที่อยากไปให้สุด</dt>
                <dd className="mt-1 text-[0.95rem] leading-relaxed text-[#e6e1d7]">{detail.stretchTh}</dd>
              </div>
            </dl>
            <p className="mt-5 text-sm text-[#cfc9bd]" style={{ fontFamily: BODY_FONT }}>
              {ANY_PROBLEM_NOTE}
            </p>
          </section>

          <section className="mt-12" aria-label="เคสจริง">
            <SectionHeading>เกิดขึ้นจริงแล้ว</SectionHeading>
            <div className="mt-5 space-y-8">
              {detail.cases.map((item) => (
                <CaseCard key={item.titleTh} item={item} color={chapter.color} />
              ))}
            </div>
          </section>

          {registrationOpen ? (
            <a
              href={joinHref}
              className="mt-12 inline-flex items-center gap-2 border px-5 py-3 text-base transition-colors hover:bg-[#faf8f4] hover:text-[#0c0d0c]"
              style={{ fontFamily: BODY_FONT, borderColor: EL.cream }}
            >
              สมัครทีม แก้โจทย์นี้
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
