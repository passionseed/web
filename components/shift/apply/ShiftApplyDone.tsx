"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";

import { INK, MISREG_TEXT } from "@/components/shift/poster/riso";
import { ShiftPayment } from "@/components/shift/ShiftPayment";
import { ConnectDiscordButton } from "@/components/shift/join/ShiftJoinActions";
import { BringAFriendInvite } from "./BringAFriend";
import {
  SHIFT_PAYMENT,
  formatThaiDate,
  formatThaiDateRange,
  type ShiftCohort,
} from "@/lib/content/shift-cohort";
import { cleanIgHandle, type ShiftApplicationInput } from "@/lib/shift/application";
import { tokenFromShiftJoinPath } from "@/lib/shift/joinLink";
import { applicantNeedsParent } from "@/lib/shift/parentConsent";

/**
 * After submit: connect Discord, what was received, what happens next, and
 * how to pay. Discord comes first because one tap makes the PassionSeed
 * account and drops the applicant into the round's server. A receipt beats
 * a blank "thanks", because the applicant screenshots it and a parent asks
 * "สมัครอะไรไป".
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

/** The personal /shift/join token inside the link the apply API returns. */
function joinTokenFrom(joinUrl: string | null): string | null {
  if (!joinUrl) return null;
  try {
    return tokenFromShiftJoinPath(new URL(joinUrl).pathname);
  } catch {
    return null;
  }
}

function DiscordStep({ cohort, token }: { cohort: ShiftCohort; token: string }) {
  return (
    <div
      className="mx-auto mt-10 max-w-md rounded-xl px-5 py-6 text-left"
      style={{ backgroundColor: paper("0a"), boxShadow: `inset 0 0 0 1px ${paper("1f")}` }}
    >
      <p className="font-kodchasan text-xl font-semibold">ต่อเลย: เชื่อม Discord</p>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: paper("b3") }}>
        กดทีเดียว ได้บัญชี PassionSeed และเข้าเซิร์ฟ SHIFT พร้อมห้องของ {cohort.name} ทันที ยังไม่มี Discord
        ก็สร้างบัญชีในขั้นนี้ได้เลย
      </p>
      <div className="mt-5">
        <ConnectDiscordButton token={token} label={`เชื่อม Discord เข้า ${cohort.name}`} />
      </div>
    </div>
  );
}

function NextSteps({
  cohort,
  canConnect,
  parentEmail,
}: {
  cohort: ShiftCohort;
  canConnect: boolean;
  /** Set when the applicant is under 20: the parent must agree before the seat is confirmed. */
  parentEmail: string | null;
}) {
  const hasFee = cohort.priceBaht > 0;
  const parentStep = parentEmail
    ? [`ผู้ปกครองกดยินยอมในอีเมลที่ส่งไป ${parentEmail} (ไม่เจอ ลองดูในถังขยะหรือ Promotions) พี่ยืนยันที่นั่งได้หลังผู้ปกครองยินยอมแล้ว`]
    : [];
  const steps = canConnect
    ? [
        `เชื่อม Discord ด้านบน เข้าห้องของ ${cohort.name} ได้เลย`,
        ...parentStep,
        ...(hasFee ? [`โอนแล้วส่งสลิปใน LINE ${SHIFT_PAYMENT.lineId} ด้านล่าง พี่ยืนยันที่นั่งในแชท`] : []),
        `เริ่ม Day 1 ${formatThaiDate(cohort.startDate)} ${cohort.sessionTime} น.`,
      ]
    : [
        ...parentStep,
        ...(hasFee ? [`โอนแล้วส่งสลิปใน LINE ${SHIFT_PAYMENT.lineId} ด้านล่าง`] : []),
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
  onApplyAgain,
}: {
  cohort: ShiftCohort;
  values: ShiftApplicationInput;
  joinUrl: string | null;
  /** Clears this receipt for the next applicant. Absent after the round closes. */
  onApplyAgain?: () => void;
}) {
  // The form swaps for this screen in place; start reading from the top.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const nickname = values.nickname.trim();
  const token = joinTokenFrom(joinUrl);
  // Under 20 the seat waits on the parent's emailed consent (PDPA).
  const parentEmail = applicantNeedsParent(values.birthDate) ? values.parentEmail?.trim() || null : null;
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

      {token && <DiscordStep cohort={cohort} token={token} />}
      <Receipt cohort={cohort} values={values} />
      <NextSteps
        cohort={cohort}
        canConnect={token !== null}
        parentEmail={parentEmail}
      />
      <BringAFriendInvite cohort={cohort} onApplyHere={onApplyAgain} />

      {cohort.priceBaht > 0 && (
        <div className="mx-auto mt-12 max-w-xl border-t pt-10" style={{ borderColor: paper("1f") }}>
          <p className="mb-6 font-kodchasan text-xl font-semibold">ยืนยันที่นั่ง: โอนแล้วส่งสลิป</p>
          <ShiftPayment
            cohort={cohort}
            applicant={{
              nickname,
              fullName: values.fullName,
              igHandle: values.igHandle,
              parentContact: values.parentContact ?? undefined,
              joinUrl,
            }}
          />
        </div>
      )}

      {/* Free rounds have no pair offer, so the same-phone reset stands alone. */}
      {onApplyAgain && cohort.priceBaht === 0 && (
        <button
          type="button"
          onClick={onApplyAgain}
          className="mx-auto mt-12 inline-flex min-h-12 items-center text-sm font-semibold underline underline-offset-4"
          style={{ color: paper("b3") }}
        >
          สมัครให้อีกคน
        </button>
      )}
    </div>
  );
}
