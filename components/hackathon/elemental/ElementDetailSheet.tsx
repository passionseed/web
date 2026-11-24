"use client";

import Image from "next/image";
import { ArrowUpRight, ChevronDown } from "lucide-react";

import { EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

import { ANY_PROBLEM_NOTE, type CaseImage, type ElementCase, type ElementDetail } from "./challenges";
import { elementLabel, type ElementChapter } from "./media";

const BODY_FONT = "var(--font-bai-jamjuree), sans-serif";
/** A case shows at most this many numbers up front; the rest of the story folds away. */
const MAX_STATS = 3;

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

/**
 * One rung of the challenge: a dot on a line, so "start here, then go further"
 * reads as a path instead of two equal boxes.
 */
function ChallengeStep({
  color,
  title,
  note,
  text,
  first,
}: {
  color: string;
  title: string;
  note?: string;
  text: string;
  first?: boolean;
}) {
  return (
    <li className="grid grid-cols-[14px_1fr] gap-x-4">
      <div className="flex flex-col items-center pt-2.5">
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 rounded-full border-2"
          style={{ borderColor: color, backgroundColor: first ? color : "transparent" }}
        />
        {first ? (
          <span aria-hidden="true" className="mt-1 w-px flex-1" style={{ backgroundColor: color, opacity: 0.4 }} />
        ) : null}
      </div>
      <div className={first ? "pb-8" : ""}>
        <h4 className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span
            className="text-xl text-[#faf8f4] sm:text-2xl"
            style={{ fontFamily: EL_FONT.display, fontWeight: 300, lineHeight: 1.3 }}
          >
            {title}
          </span>
          {note ? (
            <span className="text-xs" style={{ fontFamily: EL_FONT.mono, color }}>
              {note}
            </span>
          ) : null}
        </h4>
        <p className="mt-2 text-base leading-relaxed text-[#e6e1d7]" style={{ fontFamily: BODY_FONT }}>
          {text}
        </p>
      </div>
    </li>
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

        <div className="px-6 pb-6 pt-8 sm:px-10">
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
              className="mt-4 text-xl text-[#faf8f4] sm:text-[1.6rem]"
              style={{ fontFamily: EL_FONT.display, fontWeight: 300, lineHeight: 1.35 }}
            >
              {detail.howMightWeTh}
            </p>
            <ol className="mt-8">
              <ChallengeStep
                color={chapter.color}
                title="เริ่มง่าย"
                note={`จบได้ใน ${ELEMENTAL.days} วัน`}
                text={detail.starterTh}
                first
              />
              <ChallengeStep color={chapter.color} title="อยากไปให้สุด" text={detail.stretchTh} />
            </ol>
            <p className="mt-8 text-sm text-[#cfc9bd]" style={{ fontFamily: BODY_FONT }}>
              {ANY_PROBLEM_NOTE}
            </p>
            <a
              href={`/hackathon/elemental/kit/${chapter.key}#frame`}
              className="mt-4 inline-flex items-center gap-1 text-base text-[#faf8f4] underline underline-offset-4"
              style={{ fontFamily: BODY_FONT }}
            >
              ลองตั้งคำถามและดูแหล่งข้อมูล
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </section>
        </div>

        {/* Always in reach: the sign-up stays pinned to the bottom of the panel. */}
        {registrationOpen ? (
          <div className="sticky bottom-0 bg-gradient-to-t from-[#0c0d0c] via-[#0c0d0c]/95 to-transparent px-6 pb-5 pt-10 sm:px-10">
            <a
              href={joinHref}
              className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-base text-[#0c0d0c] transition-opacity hover:opacity-90"
              style={{ fontFamily: BODY_FONT, backgroundColor: chapter.color }}
            >
              สมัครทีม แก้โจทย์นี้
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
