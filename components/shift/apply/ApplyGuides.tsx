import { ArrowRight, BookOpen } from "lucide-react";

import { ShiftAttributedLink } from "@/components/shift/ShiftAttributedLink";
import { INK } from "@/components/shift/poster/riso";
import {
  cohortPath,
  formatThaiDate,
  formatThaiDateRange,
  type ShiftCohort,
} from "@/lib/content/shift-cohort";

/**
 * Wayfinding around the apply form. Most applicants land here straight from
 * an Instagram ad on a phone, without ever seeing the round page, so the
 * form says plainly where the details live and which weeks are still open.
 */

const paper = (alpha: string) => `${INK.paper}${alpha}`;

/**
 * Phone-first nudge to read the round page before applying. The back pill in
 * the top bar is easy to miss on a small screen, so this names it too.
 */
export function ReadDetailsFirst({ cohort }: { cohort: ShiftCohort }) {
  return (
    <div
      className="rounded-xl p-5 sm:hidden"
      style={{ backgroundColor: paper("0a"), boxShadow: `inset 0 0 0 1px ${paper("26")}` }}
    >
      <p className="flex items-center gap-2 font-kodchasan font-semibold">
        <BookOpen className="h-4 w-4 shrink-0" style={{ color: INK.yellow }} />
        เพิ่งเห็นจาก IG? อ่านรายละเอียดก่อน
      </p>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: paper("b3") }}>
        7 วันทำอะไร ราคา และเงื่อนไขคืนเงิน อยู่ในหน้า {cohort.name}{" "}
        (หรือกดปุ่ม ← {cohort.name} มุมขวาบน) ที่กรอกไว้ไม่หาย
      </p>
      <ShiftAttributedLink
        href={cohortPath(cohort)}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#f2ead9] px-5 py-2.5 text-sm font-bold text-[#17151c]"
      >
        อ่านรายละเอียด {cohort.name}
        <ArrowRight className="h-4 w-4" />
      </ShiftAttributedLink>
    </div>
  );
}

/** Desktop counterpart: one quiet line, since the top bar is easy to see there. */
export function ReadDetailsInline({ cohort }: { cohort: ShiftCohort }) {
  return (
    <span className="hidden sm:inline">
      {" "}·{" "}
      <ShiftAttributedLink
        href={cohortPath(cohort)}
        className="underline decoration-dotted underline-offset-4"
      >
        อ่านรายละเอียดก่อน
      </ShiftAttributedLink>
    </span>
  );
}

function roundLabel(cohort: ShiftCohort) {
  return `${cohort.name} · ${formatThaiDateRange(cohort.startDate, cohort.endDate)}`;
}

/**
 * Pick another week when this one clashes with exams. Only renders when more
 * than one round is open; a single option is not a choice.
 */
export function RoundSwitcher({
  current,
  open,
}: {
  current: ShiftCohort;
  open: ShiftCohort[];
}) {
  if (open.length < 2) return null;
  return (
    <nav aria-label="เลือกรอบ" className="mt-8">
      <p className="text-center text-sm" style={{ color: paper("99") }}>
        ไม่ว่างสัปดาห์นี้? เลือกรอบอื่นได้ คำตอบที่กรอกไว้ตามไปด้วย
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-2.5">
        {open.map((cohort) => {
          const selected = cohort.round === current.round;
          return (
            <ShiftAttributedLink
              key={cohort.round}
              href={cohort.applyUrl}
              className={`rounded-[4px] px-4 py-2 text-sm font-semibold ${
                selected
                  ? "bg-[#f2ead9] text-[#17151c] shadow-[3px_3px_2px_0_rgba(255,72,176,0.75)]"
                  : "bg-[rgba(242,234,217,0.06)] text-[rgba(242,234,217,0.8)]"
              }`}
            >
              {roundLabel(cohort)}
            </ShiftAttributedLink>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Shown instead of the form when an old link points at a round that has
 * closed, so a late applicant is sent to the next open week rather than
 * filling a form for a sprint that already started.
 */
export function ClosedRoundNotice({
  requested,
  open,
}: {
  requested: ShiftCohort;
  open: ShiftCohort[];
}) {
  return (
    <div className="py-10 text-center">
      <p className="font-kodchasan text-2xl font-bold">{requested.name} ปิดรับสมัครแล้ว</p>
      {open.length > 0 ? (
        <>
          <p className="mx-auto mt-3 max-w-md leading-relaxed" style={{ color: paper("b3") }}>
            รอบถัดไปยังเปิดอยู่ สมัครได้เลย
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            {open.map((cohort) => (
              <ShiftAttributedLink key={cohort.round} href={cohort.applyUrl} className="shift-button">
                <span>
                  สมัคร {cohort.name} · ปิดรับ {formatThaiDate(cohort.applyDeadline)}
                </span>
                <ArrowRight className="h-4 w-4" />
              </ShiftAttributedLink>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="mx-auto mt-3 max-w-md leading-relaxed" style={{ color: paper("b3") }}>
            ยังไม่เปิดรอบใหม่ ดูรุ่นที่ผ่านมาและติดตามรอบถัดไปได้ที่หน้า SHIFT
          </p>
          <ShiftAttributedLink href="/shift" className="shift-button mt-8">
            <span>ดูทุกรุ่น</span>
            <ArrowRight className="h-4 w-4" />
          </ShiftAttributedLink>
        </>
      )}
    </div>
  );
}
