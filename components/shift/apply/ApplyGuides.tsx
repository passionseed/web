import type { ReactNode } from "react";
import { ArrowRight, BookOpen, ChevronDown } from "lucide-react";

import { ShiftAttributedLink } from "@/components/shift/ShiftAttributedLink";
import { INK } from "@/components/shift/poster/riso";
import {
  cohortPath,
  formatThaiDate,
  formatThaiDateRange,
  pairPriceBaht,
  priceLabel,
  teamSizeLabel,
  type ShiftCohort,
} from "@/lib/content/shift-cohort";

/**
 * Wayfinding around the apply form. Most applicants land here straight from
 * an Instagram ad on a phone, without ever seeing the round page, so the
 * form says plainly where the details live and which weeks are still open.
 */

const paper = (alpha: string) => `${INK.paper}${alpha}`;

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 py-2">
      <dt className="w-20 shrink-0 text-sm" style={{ color: paper("80") }}>
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-sm font-semibold leading-relaxed">{children}</dd>
    </div>
  );
}

/**
 * The round in 30 seconds, right above the form. Most applicants arrive from
 * an Instagram ad and never saw the round page, and the back pill is too
 * small to notice, so the facts that decide "should I apply" live here, with
 * one big button to the full page.
 */
export function CohortQuickFacts({ cohort }: { cohort: ShiftCohort }) {
  const pair = pairPriceBaht(cohort);
  return (
    <section
      aria-labelledby="quick-facts"
      className="rounded-2xl p-5 sm:p-6"
      style={{ backgroundColor: paper("0d"), boxShadow: `inset 0 0 0 1px ${paper("2e")}` }}
    >
      <h2 id="quick-facts" className="flex items-center gap-2 font-kodchasan text-lg font-bold">
        <BookOpen className="h-5 w-5 shrink-0" style={{ color: INK.yellow }} />
        {cohort.name} ใน 30 วินาที
      </h2>
      <p className="mt-1 text-sm" style={{ color: paper("99") }}>
        เพิ่งเห็นจาก IG? อ่านตรงนี้ก่อนกรอก
      </p>

      <dl className="mt-4 divide-y divide-[rgba(242,234,217,0.1)]">
        <Fact label="ทำอะไร">
          สร้างของจริง 1 ชิ้นจากปัญหาที่เราเลือกเอง ให้คนนอกใช้จริง แล้วสรุปเป็นพอร์ต 1 หน้า
        </Fact>
        <Fact label="เมื่อไหร่">
          {formatThaiDateRange(cohort.startDate, cohort.endDate)}
          <br />
          ทุกคืน {cohort.sessionTime} น. ออนไลน์บน Discord
        </Fact>
        <Fact label="ทีม">ทำคนเดียวหรือกับเพื่อน {teamSizeLabel(cohort)}</Fact>
        <Fact label="ราคา">
          {priceLabel(cohort)} ต่อคน
          {pair !== null && (
            <span className="block font-normal" style={{ color: INK.pink }}>
              มากับเพื่อนเป็นคู่ เหลือคนละ ฿{pair.toLocaleString("en-US")}
            </span>
          )}
        </Fact>
        {cohort.priceBaht > 0 && (
          <Fact label="คืนเงิน">ถ้าจบวันที่ 7 แล้วไม่มีชิ้นงานในมือ คืนเต็มจำนวน</Fact>
        )}
      </dl>

      <details className="group mt-2 border-t pt-3" style={{ borderColor: paper("1a") }}>
        <summary
          className="flex cursor-pointer list-none items-center justify-between py-1 text-sm font-semibold [&::-webkit-details-marker]:hidden"
          style={{ color: INK.yellow }}
        >
          ดู 7 วันทีละวัน
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <ol className="mt-3 space-y-2.5">
          {cohort.schedule.map((day) => (
            <li key={day.day} className="flex gap-3 text-sm leading-relaxed">
              <span
                className="w-12 shrink-0 font-kodchasan font-bold"
                style={{ color: INK.orange }}
              >
                Day {day.day}
              </span>
              <span>
                <span className="font-semibold">{day.title}</span>
                <span className="block text-xs" style={{ color: paper("80") }}>
                  {formatThaiDate(day.date)} · {day.label}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </details>

      <ShiftAttributedLink
        href={cohortPath(cohort)}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#f2ead9] px-5 py-3 text-sm font-bold text-[#17151c] shadow-[3px_3px_2px_0_rgba(255,72,176,0.75)]"
      >
        อ่านรายละเอียดเต็มและ FAQ
        <ArrowRight className="h-4 w-4 shrink-0" />
      </ShiftAttributedLink>
      <p className="mt-2 text-center text-xs" style={{ color: paper("80") }}>
        กลับมากรอกต่อได้ ที่พิมพ์ไว้ไม่หาย
      </p>
    </section>
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
