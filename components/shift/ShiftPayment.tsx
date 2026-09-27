import Image from "next/image";
import type { ReactNode } from "react";
import { Download, ExternalLink } from "lucide-react";

import {
  PAIR_DISCOUNT_BAHT,
  SHIFT_PAYMENT,
  pairPriceBaht,
  type ShiftCohort,
} from "@/lib/content/shift-cohort";

import { T, tint } from "./theme/tokens";

/**
 * Pay for a seat: scan the PromptPay QR, then send the slip to PassionSeed's
 * LINE Official Account so a person can confirm. Colours read the theme
 * tokens, so it sits right on any round's page and on the apply form.
 */

const baht = (amount: number) => `฿${amount.toLocaleString("en-US")}`;

function Step({ num, children }: { num: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-kodchasan text-sm font-bold"
        style={{ backgroundColor: T.accent3, color: T.bg }}
      >
        {num}
      </span>
      <span className="pt-0.5 leading-relaxed">{children}</span>
    </li>
  );
}

export function ShiftPayment({ cohort }: { cohort: ShiftCohort }) {
  const pair = pairPriceBaht(cohort);
  if (pair === null) return null;

  return (
    <div className="grid items-center gap-8 sm:grid-cols-[240px_1fr]">
      <div className="mx-auto w-full max-w-[240px]">
        <div className="overflow-hidden rounded-2xl bg-white p-2">
          <Image
            src={SHIFT_PAYMENT.qrCardSrc}
            alt="QR พร้อมเพย์ PassionSeed สำหรับโอนค่าสมัคร"
            width={800}
            height={760}
            className="h-auto w-full"
          />
        </div>
        {/* Phones cannot scan their own screen: save it, then pick it in the bank app. */}
        <a
          href={SHIFT_PAYMENT.qrSrc}
          download="passionseed-promptpay.jpg"
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full py-2 text-sm font-semibold"
          style={{ color: T.text, boxShadow: `inset 0 0 0 1px ${tint("40")}` }}
        >
          <Download className="h-4 w-4" />
          บันทึกรูป QR
        </a>
      </div>
      <div className="text-left">
        <p className="font-kodchasan text-2xl font-bold">
          {baht(cohort.priceBaht)}{" "}
          <span
            className="text-base font-semibold"
            style={{ color: tint("99") }}
          >
            ต่อคน
          </span>
        </p>
        <p className="mt-1 text-sm font-semibold" style={{ color: T.accent2 }}>
          มากับเพื่อนเป็นคู่ ลดคนละ {baht(PAIR_DISCOUNT_BAHT)} เหลือคนละ{" "}
          {baht(pair)}
        </p>
        <ol className="mt-6 space-y-3 text-sm" style={{ color: tint("d9") }}>
          <Step num={1}>สแกน QR พร้อมเพย์ แล้วโอนตามยอด</Step>
          <Step num={2}>
            ส่งสลิปใน LINE {SHIFT_PAYMENT.lineId} บอกชื่อเล่นกับรุ่น{" "}
            {cohort.name} ถ้ามากับเพื่อน บอกชื่อเพื่อนด้วย
          </Step>
          <Step num={3}>รอพี่ยืนยันที่นั่งในแชท</Step>
        </ol>
        <a
          href={SHIFT_PAYMENT.lineUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#06C755" }}
        >
          ส่งสลิปทาง LINE
          <ExternalLink className="h-4 w-4" />
        </a>
        <p
          className="mt-4 text-xs leading-relaxed"
          style={{ color: tint("80") }}
        >
          ถ้าจบวันที่ 7 แล้วไม่มีชิ้นงานในมือ คืนเงินเต็มจำนวน
        </p>
      </div>
    </div>
  );
}
