"use client";

import { useEffect, useState } from "react";
import { Check, Copy, MessageCircle, Share2 } from "lucide-react";

import { EL } from "@/components/hackathon/poster/elemental/brand";
import { baht, PARENT_PARAM, parentPayUrl, parentShareMessage } from "@/lib/hackathon/elemental/parent-share";

import { btn, inlineTap, outline } from "./share/ui";
import { trackElemental } from "./track";

/**
 * "Send to my parent to pay" on the unpaid pay page: LINE, the phone's share
 * sheet (where there is one) or copy, each with a short message that says
 * what the event is, the amount and this page's parent link. Most people who
 * sign up are minors, so a parent often pays (Big, 2026-11-28). Each send
 * counts as parent_shared in the funnel.
 */
export function ParentHandoff({ token, amountBaht, demo }: { token: string; amountBaht: number; demo?: boolean }) {
  const [url, setUrl] = useState(() => parentPayUrl("https://passionseed.org", token));
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (demo) {
      // The demo keeps its own state and mode, so the parent view can be opened from it.
      const here = new URL(window.location.href);
      here.searchParams.set(PARENT_PARAM.key, PARENT_PARAM.value);
      setUrl(here.toString());
    } else {
      setUrl(parentPayUrl(window.location.origin, token));
    }
    setCanShare(typeof navigator.share === "function");
  }, [token, demo]);

  const message = parentShareMessage({ amountBaht, url });
  const sent = (how: "line" | "share" | "copy") => trackElemental({ step: "parent_shared", detail: how }, { once: false });

  const share = async () => {
    sent("share");
    await navigator.share({ text: message }).catch(() => undefined);
  };

  const copy = async () => {
    sent("copy");
    await navigator.clipboard.writeText(message).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="border-y py-6" style={{ borderColor: "rgba(29,33,31,0.18)" }}>
      {/* PLACEHOLDER copy (Angpao) */}
      <h2 className="text-lg">ผู้ปกครองเป็นคนจ่าย?</h2>
      <p className="mt-1 text-pretty text-sm leading-6" style={{ color: EL.inkSoft }}>
        {/* PLACEHOLDER copy (Angpao) */}
        ส่งหน้านี้ให้ผู้ปกครอง เปิดลิงก์แล้วจะเห็นยอด {baht(amountBaht)} QR พร้อมเพย์ และที่ส่งสลิป ไม่ต้องสมัครใหม่
      </p>
      {/* LINE is how most families here message, so it is the one button; the rest are quieter. */}
      <a
        href={`https://line.me/R/share?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => sent("line")}
        className={`${btn} mt-4 w-full`}
        style={outline}
      >
        {/* PLACEHOLDER copy (Angpao) */}
        <MessageCircle className="h-5 w-5" aria-hidden="true" /> ส่งให้ผู้ปกครองทาง LINE
      </a>
      <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2 text-sm" style={{ color: EL.inkSoft }}>
        {canShare && (
          <>
            <button type="button" onClick={share} className={`${inlineTap} inline-flex items-center gap-1.5`}>
              {/* PLACEHOLDER copy (Angpao) */}
              <Share2 className="h-4 w-4" aria-hidden="true" /> แชร์ทางอื่น
            </button>
            <span aria-hidden="true">·</span>
          </>
        )}
        <button type="button" onClick={copy} className={`${inlineTap} inline-flex items-center gap-1.5`}>
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {/* PLACEHOLDER copy (Angpao) */}
          <span aria-live="polite">{copied ? "คัดลอกแล้ว" : "คัดลอกข้อความ"}</span>
        </button>
      </p>
    </section>
  );
}

/** Counts a parent opening the page from the student's link (parent_opened). */
export function TrackParentOpened() {
  useEffect(() => {
    trackElemental({ step: "parent_opened" });
  }, []);
  return null;
}
