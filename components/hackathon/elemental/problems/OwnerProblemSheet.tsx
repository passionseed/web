"use client";

import {
  ArrowUpRight,
  ExternalLink,
  Flag,
  Megaphone,
  MessageCircleQuestion,
  UserRound,
} from "lucide-react";

import { EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ElementIcon } from "@/components/hackathon/poster/elemental/element-icons";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

import { elementLabel, type ElementChapter } from "../media";
import type { OwnerProblem } from "../problem-owners";

const BODY_FONT = "var(--font-bai-jamjuree), sans-serif";

/**
 * One problem owner's problem, opened from its tile on the board: their clip
 * first, then who they are and the problem in their words. Styled like
 * ElementDetailSheet, so both panels feel like one board.
 */
export function OwnerProblemSheet({
  chapter,
  problem,
  open,
  onOpenChange,
  onOpenStarter,
  joinHref,
  registrationOpen,
}: {
  chapter: ElementChapter;
  problem: OwnerProblem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenStarter: () => void;
  joinHref: string;
  registrationOpen: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-l border-[#f3efe6]/15 bg-[#0c0d0c] p-0 text-[#faf8f4] sm:max-w-xl [&>button]:right-5 [&>button]:top-5 [&>button]:z-10 [&>button]:rounded-full [&>button]:bg-black/50 [&>button]:p-1.5 [&>button]:text-[#faf8f4] [&>button]:opacity-90 [&>button]:ring-offset-0 [&>button]:focus:ring-[#f3efe6]/40"
      >
        {problem.clip ? (
          <div className="bg-black px-6 pb-2 pt-14 sm:px-10">
            <video
              src={problem.clip.src}
              poster={problem.clip.poster}
              controls
              playsInline
              preload="metadata"
              className="mx-auto block aspect-[9/16] max-h-[68svh] w-auto max-w-full bg-black"
              aria-label={`คลิปจาก ${problem.ownerTh}`}
            />
          </div>
        ) : null}

        <div
          className={`px-6 pb-6 sm:px-10 ${problem.clip ? "pt-8" : "pt-16"}`}
        >
          <p
            className="flex items-center gap-2 text-xs"
            style={{ fontFamily: EL_FONT.mono, color: chapter.color }}
          >
            <ElementIcon
              element={chapter.key}
              size={16}
              id={`owner-icon-${problem.id}`}
            />
            <Megaphone
              aria-hidden="true"
              className="h-3.5 w-3.5"
              strokeWidth={2.25}
            />
            เจ้าของโจทย์ · {elementLabel(chapter.th)}
            {problem.demo ? (
              <span className="border border-[#f3efe6]/30 px-1.5 text-[10px] text-[#f3efe6]/70">
                ตัวอย่าง
              </span>
            ) : null}
          </p>
          <SheetTitle
            className="mt-3 text-3xl text-[#faf8f4] sm:text-4xl"
            style={{
              fontFamily: EL_FONT.display,
              fontWeight: 300,
              lineHeight: 1.25,
            }}
          >
            {problem.titleTh}
          </SheetTitle>

          <div className="mt-5 flex items-start gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: chapter.color }}
            >
              <UserRound
                aria-hidden="true"
                className="h-5 w-5 text-[#0c0d0c]"
              />
            </span>
            <div className="min-w-0">
              <p
                className="text-base font-semibold text-[#faf8f4]"
                style={{ fontFamily: BODY_FONT }}
              >
                {problem.ownerTh}
              </p>
              {problem.ownerRoleTh ? (
                <p
                  className="text-sm text-[#cfc9bd]"
                  style={{ fontFamily: BODY_FONT }}
                >
                  {problem.ownerRoleTh}
                </p>
              ) : null}
              {problem.ownerUrl ? (
                <a
                  href={problem.ownerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-sm text-[#e6e1d7] underline underline-offset-4 hover:text-[#faf8f4]"
                  style={{ fontFamily: BODY_FONT }}
                >
                  <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                  ดูเพจ
                </a>
              ) : null}
            </div>
          </div>

          <SheetDescription
            className="mt-8 whitespace-pre-line text-lg leading-relaxed text-[#e6e1d7]"
            style={{ fontFamily: BODY_FONT }}
          >
            {problem.bodyTh}
          </SheetDescription>

          {problem.askTh ? (
            <section className="mt-8" aria-label="สิ่งที่เจ้าของโจทย์อยากให้ทีมคิด">
              <p
                className="flex items-center gap-1.5 text-xs"
                style={{ fontFamily: EL_FONT.mono, color: chapter.color }}
              >
                <MessageCircleQuestion
                  aria-hidden="true"
                  className="h-3.5 w-3.5"
                  strokeWidth={2.25}
                />
                อยากให้ทีมคิด
              </p>
              <p
                className="mt-1 text-xl text-[#faf8f4] sm:text-[1.5rem]"
                style={{
                  fontFamily: EL_FONT.display,
                  fontWeight: 300,
                  lineHeight: 1.35,
                }}
              >
                {problem.askTh}
              </p>
            </section>
          ) : null}

          <button
            type="button"
            onClick={onOpenStarter}
            className="mt-10 inline-flex items-center gap-1.5 text-sm text-[#e6e1d7] underline underline-offset-4 hover:text-[#faf8f4]"
            style={{ fontFamily: BODY_FONT }}
          >
            <Flag aria-hidden="true" className="h-3.5 w-3.5" />
            ดูโจทย์ตั้งต้น{elementLabel(chapter.th)}
          </button>
        </div>

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
