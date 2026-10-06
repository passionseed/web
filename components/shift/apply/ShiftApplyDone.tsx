"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";

import { INK, MISREG_TEXT } from "@/components/shift/poster/riso";
import { ShiftPayment } from "@/components/shift/ShiftPayment";
import {
  SHIFT_PAYMENT,
  formatThaiDate,
  formatThaiDateRange,
  type ShiftCohort,
} from "@/lib/content/shift-cohort";
import { cleanIgHandle, type ShiftApplicationInput } from "@/lib/shift/application";

/**
 * After submit: what was received, what happens next, and how to pay.
 * A receipt beats a blank "thanks", because the applicant screenshots it
 * and a parent asks "สมัครอะไรไป".
 */

const paper = (alpha: string) => `${INK.paper}${alpha}`;

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 py-2.5">
      <dt className="w-24 shrink-0 text-sm" style={{ color: paper("80") }}>
        {label}
      </dt>
      <dd className="min-w-0 flex-1 break-words text-sm font-semibold">{value}</dd>
    </div>
  );
}

function Receipt({ cohort, values }: { cohort: ShiftCohort; values: ShiftApplicationInput }) {
  const ig = cleanIgHandle(values.igHandle ?? "");
  return (
    <dl
      className="mx-auto mt-10 max-w-md divide-y divide-[rgba(242,234,217,0.12)] rounded-xl px-5 py-2 text-left"
      style={{ backgroundColor: paper("0a"), boxShadow: `inset 0 0 0 1px ${paper("1f")}` }}
    >
      <ReceiptRow label="รุ่น" value={cohort.name} />
      <ReceiptRow
        label="วันที่"
        value={`${formatThaiDateRange(cohort.startDate, cohort.endDate)} · ${cohort.sessionTime} น.`}
      />
      <ReceiptRow label="ชื่อ" value={`${values.nickname.trim()} (${values.fullName.trim()})`} />
      {ig && <ReceiptRow label="IG" value={`@${ig}`} />}
      <ReceiptRow label="โจทย์" value={values.problem.trim()} />
    </dl>
  );
}

function NextSteps({ cohort }: { cohort: ShiftCohort }) {
  const steps = [
    ...(cohort.priceBaht > 0
      ? [`โอนแล้วส่งสลิปใน LINE ${SHIFT_PAYMENT.lineId} ด้านล่าง`]
      : []),
    "พี่ยืนยันที่นั่งในแชท แล้วกดลิงก์ส่วนตัวเพื่อเข้า Discord ของรุ่น",
    `เริ่ม Day 1 ${formatThaiDate(cohort.startDate)} ${cohort.sessionTime} น.`,
  ];
  return (
    <ol className="mx-auto mt-10 max-w-md space-y-4 text-left">
      {steps.map((step, i) => (
        <li key={step} className="flex items-start gap-3">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-kodchasan text-sm font-bold"
            style={{
              backgroundColor: i === 0 ? INK.yellow : paper("1a"),
              color: i === 0 ? INK.black : INK.paper,
            }}
          >
            {i + 1}
          </span>
          <span className="pt-0.5 leading-relaxed" style={{ color: paper(i === 0 ? "f2" : "b3") }}>
            {step}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function ShiftApplyDone({
  cohort,
  values,
  joinUrl,
}: {
  cohort: ShiftCohort;
  values: ShiftApplicationInput;
  joinUrl: string | null;
}) {
  // The form swaps for this screen in place; start reading from the top.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const nickname = values.nickname.trim();
  return (
    <div className="py-16 text-center">
      <p
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
        style={{ backgroundColor: INK.paper }}
      >
        <Check className="h-7 w-7" style={{ color: INK.black }} />
      </p>
      <h2 className="mt-8 font-kodchasan text-3xl font-bold sm:text-4xl" style={MISREG_TEXT}>
        ได้รับใบสมัครแล้ว{nickname ? ` ${nickname}` : ""}
      </h2>
      <p className="mx-auto mt-4 max-w-md leading-relaxed" style={{ color: paper("b3") }}>
        แคปหน้านี้เก็บไว้ได้เลย ระหว่างรอ ลองคิดต่อว่าใครอีก 3 คนที่เจอปัญหาเดียวกับเรา
      </p>

      <Receipt cohort={cohort} values={values} />
      <NextSteps cohort={cohort} />

      {cohort.priceBaht > 0 && (
        <div className="mx-auto mt-12 max-w-xl border-t pt-10" style={{ borderColor: paper("1f") }}>
          <p className="mb-6 font-kodchasan text-xl font-semibold">ยืนยันที่นั่ง: โอนแล้วส่งสลิป</p>
          <ShiftPayment
            cohort={cohort}
            applicant={{
              nickname,
              fullName: values.fullName,
              igHandle: values.igHandle,
              parentContact: values.parentContact,
              joinUrl,
            }}
          />
        </div>
      )}
    </div>
  );
}
