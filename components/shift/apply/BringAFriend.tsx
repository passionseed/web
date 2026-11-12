"use client";

import { useState, type ReactNode } from "react";
import { Check, Share2, Users } from "lucide-react";

import { INK } from "@/components/shift/poster/riso";
import {
  PAIR_DISCOUNT_BAHT,
  PAIR_TOTAL_DISCOUNT_BAHT,
  pairPriceBaht,
  type ShiftCohort,
} from "@/lib/content/shift-cohort";
import { withShiftSource } from "@/lib/shift/attribution";

/**
 * The pair offer: two friends who apply together save ฿200 between them
 * (฿100 each). Led with the total, because "ลดรวม ฿200" is the number that
 * makes someone send the link to a friend. Free rounds have no offer.
 */

const paper = (alpha: string) => `${INK.paper}${alpha}`;
const baht = (amount: number) => `฿${amount.toLocaleString("en-US")}`;

function OfferCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="mx-auto max-w-md rounded-xl px-5 py-4 text-left"
      style={{ backgroundColor: `${INK.pink}1a`, boxShadow: `inset 0 0 0 1px ${INK.pink}66` }}
    >
      {children}
    </div>
  );
}

function OfferHeadline() {
  return (
    <p className="flex items-center gap-2 font-kodchasan text-lg font-bold">
      <Users className="h-5 w-5 shrink-0" style={{ color: INK.pink }} aria-hidden="true" />
      ชวนเพื่อนมาสมัครเป็นคู่ ลดรวม {baht(PAIR_TOTAL_DISCOUNT_BAHT)}
    </p>
  );
}

/** Above the apply form, so the applicant can bring someone before they start. */
export function BringAFriendBanner({ cohort }: { cohort: ShiftCohort }) {
  const pair = pairPriceBaht(cohort);
  if (pair === null) return null;
  return (
    <div className="mt-6">
      <OfferCard>
        <OfferHeadline />
        <p className="mt-1 text-sm leading-relaxed" style={{ color: paper("cc") }}>
          ลดคนละ {baht(PAIR_DISCOUNT_BAHT)} เหลือคนละ {baht(pair)} ต่างคนต่างกรอกใบสมัคร แล้วใส่ชื่อเพื่อนตอนแจ้งโอน
        </p>
      </OfferCard>
    </div>
  );
}

type ShareState = "idle" | "copied" | "failed";

/**
 * After applying: send the round's apply link to a friend. The native share
 * sheet where there is one, else the clipboard. Instagram's in-app browser
 * sometimes blocks both, so a failed copy shows the link to long-press.
 */
export function BringAFriendInvite({
  cohort,
  onApplyHere,
}: {
  cohort: ShiftCohort;
  /** Starts a blank form on this phone, for a friend sitting right here. */
  onApplyHere?: () => void;
}) {
  const [state, setState] = useState<ShareState>("idle");
  const [link, setLink] = useState<string | null>(null);
  const pair = pairPriceBaht(cohort);
  if (pair === null) return null;

  async function share() {
    const url = new URL(withShiftSource(cohort.applyUrl, "friend"), window.location.origin).toString();
    setLink(url);
    const text = `สมัคร ${cohort.name} ด้วยกันไหม มากันเป็นคู่ ลดรวม ${baht(PAIR_TOTAL_DISCOUNT_BAHT)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: cohort.name, text, url });
        return;
      } catch (error) {
        // Closing the share sheet is a choice, not a failure.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setState("copied");
      window.setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="mt-10">
      <OfferCard>
        <OfferHeadline />
        <p className="mt-1 text-sm leading-relaxed" style={{ color: paper("cc") }}>
          ส่งลิงก์ให้เพื่อน ถ้าเพื่อนสมัครด้วย ลดคนละ {baht(PAIR_DISCOUNT_BAHT)} เหลือคนละ {baht(pair)} ตอนแจ้งโอนใส่ชื่อเพื่อนในข้อความด้วย
        </p>
        <button
          type="button"
          onClick={share}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-bold"
          style={{ backgroundColor: INK.pink, color: INK.black }}
        >
          {state === "copied" ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          {state === "copied" ? "คัดลอกลิงก์แล้ว ส่งให้เพื่อนได้เลย" : "ส่งลิงก์สมัครให้เพื่อน"}
        </button>
        {state === "failed" && link && (
          <p className="mt-3 select-all break-all text-xs" style={{ color: paper("cc") }}>
            กดค้างที่ลิงก์เพื่อคัดลอก: {link}
          </p>
        )}
        {onApplyHere && (
          <button
            type="button"
            onClick={onApplyHere}
            className="mt-2 inline-flex min-h-12 w-full items-center justify-center text-sm font-semibold underline underline-offset-4"
            style={{ color: paper("cc") }}
          >
            เพื่อนอยู่ด้วยไหม? ให้เพื่อนกรอกในเครื่องนี้
          </button>
        )}
      </OfferCard>
    </div>
  );
}
