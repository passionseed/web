"use client";

import Image from "next/image";
import { ArrowUpRight, ChevronDown } from "lucide-react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

import { ANY_PROBLEM_NOTE, type CaseImage, type ElementCase, type ElementDetail } from "./challenges";
import type { ElementChapter } from "./media";

const BODY_FONT = "var(--font-bai-jamjuree), sans-serif";
/** A case shows at most this many numbers up front; the rest of the story folds away. */
const MAX_STATS = 3;

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

/** A licensed photo with its credit on the image, as the license asks. */
function CasePhoto({ image, priority }: { image: CaseImage; priority?: boolean }) {
  return (
    <figure className="relative aspect-[16/9] w-full overflow-hidden bg-[#1b1d1f]">
      <Image
        src={image.src}
        alt={image.altTh}
        fill
        sizes="(max-width: 640px) 100vw, 576px"
        className="object-cover"
        priority={priority}
      />
      <figcaption
        className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-1.5 pt-6 text-right text-[10px] text-[#e6e1d7]/85"
        style={{ fontFamily: EL_FONT.mono }}
      >
        {image.creditUrl ? (
          <a href={image.creditUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {image.credit}
          </a>
        ) : (
          image.credit
        )}
      </figcaption>
    </figure>
  );
}

function CaseCard({ item, color }: { item: ElementCase; color: string }) {
  return (
    <article>
      {item.image ? <CasePhoto image={item.image} /> : null}

      <p className="mt-4 text-xs text-[#cfc9bd]" style={{ fontFamily: EL_FONT.mono }}>
        [{item.placeTh} · {item.yearTh}]
      </p>
      <h4
        className="mt-1.5 text-xl text-[#faf8f4] sm:text-2xl"
        style={{ fontFamily: EL_FONT.display, fontWeight: 300, lineHeight: 1.25 }}
      >
        {item.titleTh}
      </h4>

      <dl className="mt-4 grid grid-cols-3 gap-3">
        {item.impact.slice(0, MAX_STATS).map((stat) => (
          <div key={stat.value + stat.labelTh} className="border-t pt-2" style={{ borderColor: color }}>
            <dt
              className="text-lg sm:text-2xl"
              style={{ fontFamily: EL_FONT.display, fontWeight: 300, color, lineHeight: 1.1 }}
            >
              {stat.value}
            </dt>
            <dd className="mt-1 text-xs leading-snug text-[#cfc9bd] sm:text-[0.8rem]" style={{ fontFamily: BODY_FONT }}>
              {stat.labelTh}
            </dd>
          </div>
        ))}
      </dl>

      <details className="group mt-4">
        <summary
          className="inline-flex cursor-pointer list-none items-center gap-1 text-sm text-[#e6e1d7] transition-colors hover:text-[#faf8f4] [&::-webkit-details-marker]:hidden"
          style={{ fontFamily: BODY_FONT }}
        >
          อ่านเรื่องเต็มและที่มา
          <ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-3 space-y-3 text-[0.95rem] leading-relaxed text-[#e6e1d7]" style={{ fontFamily: BODY_FONT }}>
          <p>{item.whatHappenedTh}</p>
          <p>
            <span className="text-[#cfc9bd]">ใครเจ็บ: </span>
            {item.whoIsHurtTh}
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {item.sources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#cfc9bd] underline decoration-[#f3efe6]/30 underline-offset-4 transition-colors hover:text-[#faf8f4]"
                  style={{ fontFamily: EL_FONT.mono }}
                >
                  {source.name}, {source.dateTh}
                  <ArrowUpRight aria-hidden="true" className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </article>
  );
}

function ChallengeSize({ label, text }: { label: string; text: string }) {
  return (
    <div className="border border-[#f3efe6]/15 p-4">
      <p className="text-xs text-[#cfc9bd]" style={{ fontFamily: EL_FONT.mono }}>
        [{label}]
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[#e6e1d7]" style={{ fontFamily: BODY_FONT }}>
        {text}
      </p>
    </div>
  );
}

/**
 * The full brief for one element, opened from its chapter on /hackathon.
 * Pictures and numbers first: each real case leads with a photo and three
 * numbers, and its story and sources fold away. Then the challenge.
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
        className="w-full overflow-y-auto border-l border-[#f3efe6]/15 bg-[#0c0d0c] p-0 text-[#faf8f4] sm:max-w-xl [&>button]:right-5 [&>button]:top-5 [&>button]:z-10 [&>button]:rounded-full [&>button]:bg-black/50 [&>button]:p-1.5 [&>button]:text-[#faf8f4] [&>button]:opacity-90 [&>button]:ring-offset-0 [&>button]:focus:ring-[#f3efe6]/40"
      >
        {/* The chapter's own wrecked-place still: the page's art, so it needs no outside license. */}
        <CasePhoto
          image={
            detail.cover ?? {
              src: chapter.after,
              altTh: `${elementLabel(chapter.th)}: ${chapter.subtitleTh}`,
              credit: chapter.credit,
              creditUrl: "",
            }
          }
          priority
        />

        <div className="px-6 pb-12 pt-8 sm:px-10">
          <SheetTitle
            className="text-5xl sm:text-6xl"
            style={{ fontFamily: EL_FONT.display, fontWeight: 200, color: chapter.color, lineHeight: 1 }}
          >
            {elementLabel(chapter.th)}
          </SheetTitle>
          <SheetDescription
            className="mt-3 text-lg leading-relaxed text-[#e6e1d7]"
            style={{ fontFamily: BODY_FONT }}
          >
            {detail.problemTh}
          </SheetDescription>

          <section className="mt-10" aria-label="เคสที่เกิดขึ้นจริง">
            <SectionHeading>เกิดขึ้นจริงแล้ว</SectionHeading>
            <div className="mt-6 space-y-12">
              {detail.cases.map((item) => (
                <CaseCard key={item.titleTh} item={item} color={chapter.color} />
              ))}
            </div>
          </section>

          <section className="mt-14" aria-label="โจทย์">
            <SectionHeading>โจทย์</SectionHeading>
            <p
              className="mt-4 border-l-2 pl-4 text-lg leading-relaxed text-[#faf8f4]"
              style={{ borderColor: chapter.color, fontFamily: BODY_FONT }}
            >
              {detail.howMightWeTh}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ChallengeSize label="เริ่มง่าย จบได้ใน 3 วัน" text={detail.starterTh} />
              <ChallengeSize label="อยากไปให้สุด" text={detail.stretchTh} />
            </div>
            <p className="mt-4 text-sm text-[#cfc9bd]" style={{ fontFamily: BODY_FONT }}>
              {ANY_PROBLEM_NOTE}
            </p>
          </section>

          {registrationOpen ? (
            <a
              href={joinHref}
              className="mt-10 inline-flex items-center gap-2 border px-5 py-3 text-base transition-colors hover:bg-[#faf8f4] hover:text-[#0c0d0c]"
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
