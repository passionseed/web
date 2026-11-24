"use client";

import { useEffect, useState } from "react";
import { Download, Link2, Share2 } from "lucide-react";

import styles from "@/components/hackathon/elemental/join/join.module.css";
import { EL } from "@/components/hackathon/poster/elemental/brand";
import type { ElementKey } from "@/components/hackathon/elemental/media";
import { daysLeftToSignUp } from "@/lib/hackathon/elemental/quiz";

import { trackElemental } from "../track";

/**
 * Share the 9:16 card. On phones the share sheet takes the image itself, so
 * it can go straight into an IG Story; elsewhere it downloads. LINE and copy
 * share the result page, whose link preview is the card.
 */
export function QuizShare({ element, shareText }: { element: ElementKey; shareText: string }) {
  const [copied, setCopied] = useState(false);
  const imageUrl = `/hackathon/elemental/quiz/${element}/story`;
  const pageUrl = () => `${window.location.origin}/hackathon/elemental/quiz/${element}`;

  async function shareImage() {
    try {
      const blob = await fetch(imageUrl).then((r) => r.blob());
      const file = new File([blob], `elemental-${element}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${shareText} ${pageUrl()}` });
        trackElemental({ step: "quiz_shared", detail: "image" }, { once: false });
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(a.href);
      trackElemental({ step: "quiz_shared", detail: "download" }, { once: false });
    } catch {
      // The person closed the share sheet: nothing to do.
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pageUrl());
      setCopied(true);
      trackElemental({ step: "quiz_shared", detail: "copy" }, { once: false });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the link is in the address bar anyway.
    }
  }

  function line() {
    trackElemental({ step: "quiz_shared", detail: "line" }, { once: false });
    window.open(`https://line.me/R/share?text=${encodeURIComponent(`${shareText} ${pageUrl()}`)}`, "_blank", "noopener");
  }

  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={shareImage}
        className={`${styles.choice} inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-lg font-semibold`}
        style={{ backgroundColor: EL.ink, color: EL.cream }}
      >
        <Share2 className="h-5 w-5" /> ลงสตอรี่ แล้วแท็กเพื่อน
      </button>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <button type="button" onClick={line} className={`${styles.choice} rounded-full border px-3 py-3`} style={{ borderColor: "rgba(29,33,31,0.2)" }}>
          ส่งใน LINE
        </button>
        <button
          type="button"
          onClick={copyLink}
          className={`${styles.choice} inline-flex items-center justify-center gap-1 rounded-full border px-3 py-3`}
          style={{ borderColor: "rgba(29,33,31,0.2)" }}
        >
          <Link2 className="h-4 w-4" /> {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
        </button>
        <a
          href={imageUrl}
          download={`elemental-${element}.png`}
          onClick={() => trackElemental({ step: "quiz_shared", detail: "download" }, { once: false })}
          className={`${styles.choice} inline-flex items-center justify-center gap-1 rounded-full border px-3 py-3`}
          style={{ borderColor: "rgba(29,33,31,0.2)" }}
        >
          <Download className="h-4 w-4" /> เซฟรูป
        </a>
      </div>
    </div>
  );
}

/** "เหลือ 10 วัน", counted in the browser so a cached page never shows a stale number. */
export function DaysLeft({ closesOn }: { closesOn: string }) {
  const [days, setDays] = useState<number | null>(null);
  useEffect(() => setDays(daysLeftToSignUp(closesOn)), [closesOn]);
  if (days === null) return null;
  if (days === 0) return <>ปิดรับสมัครแล้ว</>;
  return <>{days === 1 ? "วันสุดท้าย" : `เหลือ ${days} วัน`}</>;
}
