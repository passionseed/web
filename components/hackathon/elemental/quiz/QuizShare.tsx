"use client";

import { useEffect, useState } from "react";
import { Download, Link2, Share2 } from "lucide-react";

import styles from "@/components/hackathon/elemental/join/join.module.css";
import { EL } from "@/components/hackathon/poster/elemental/brand";
import type { ElementKey } from "@/components/hackathon/elemental/media";
import { daysLeftToSignUp } from "@/lib/hackathon/elemental/quiz";
import { sfxChime } from "@/lib/hackathon/elemental/quiz-sfx";

import { play, unlock } from "./sound";

import { trackElemental } from "../track";

/**
 * Share the 9:16 card. On phones the share sheet takes the image itself, so
 * it can go straight into an IG Story; elsewhere it downloads. LINE and copy
 * share the result page, whose link preview is the card.
 *
 * The card is fetched when the page opens, not on the tap: a browser only
 * opens the share sheet straight from a tap, and a slow fetch in between
 * (iPhone, the Instagram browser) would make the button silently do nothing.
 */
export function QuizShare({ element, shareText }: { element: ElementKey; shareText: string }) {
  const [copied, setCopied] = useState(false);
  const [manualLink, setManualLink] = useState<string | null>(null);
  const [card, setCard] = useState<File | null>(null);
  const imageUrl = `/hackathon/elemental/quiz/${element}/story`;
  const fileName = `elemental-${element}.png`;
  const pageUrl = () => `${window.location.origin}/hackathon/elemental/quiz/${element}`;

  useEffect(() => {
    let alive = true;
    fetch(imageUrl)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((blob) => alive && setCard(new File([blob], fileName, { type: "image/png" })))
      .catch(() => {
        // The tap falls back to saving the image from its URL.
      });
    return () => {
      alive = false;
    };
  }, [imageUrl, fileName]);

  function saveImage() {
    const a = document.createElement("a");
    a.href = card ? URL.createObjectURL(card) : imageUrl;
    a.download = fileName;
    a.click();
    if (card) setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    trackElemental({ step: "quiz_shared", detail: "download" }, { once: false });
  }

  async function shareImage() {
    unlock();
    if (!card || !navigator.canShare?.({ files: [card] })) {
      saveImage();
      return;
    }
    try {
      await navigator.share({ files: [card], text: `${shareText} ${pageUrl()}` });
      play(sfxChime);
      trackElemental({ step: "quiz_shared", detail: "image" }, { once: false });
    } catch (e) {
      // Closing the share sheet is a choice, not a failure. Anything else: save the image instead.
      if (e instanceof DOMException && e.name === "AbortError") return;
      saveImage();
    }
  }

  async function copyLink() {
    unlock();
    try {
      await navigator.clipboard.writeText(pageUrl());
      play(sfxChime);
      setCopied(true);
      trackElemental({ step: "quiz_shared", detail: "copy" }, { once: false });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (some in-app browsers): show the link to copy by hand.
      setManualLink(pageUrl());
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
        style={{ backgroundColor: EL.flame, color: EL.char }}
      >
        <Share2 className="h-5 w-5" /> ลงสตอรี่ แล้วแท็กเพื่อน
      </button>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <button type="button" onClick={line} className={`${styles.choice} rounded-full border px-3 py-3`} style={{ borderColor: "rgba(243,239,230,0.25)" }}>
          ส่งใน LINE
        </button>
        <button
          type="button"
          onClick={copyLink}
          className={`${styles.choice} inline-flex items-center justify-center gap-1 rounded-full border px-3 py-3`}
          style={{ borderColor: "rgba(243,239,230,0.25)" }}
        >
          <Link2 className="h-4 w-4" /> {copied ? "คัดลอกแล้ว" : "ลิงก์"}
        </button>
        <a
          href={imageUrl}
          download={`elemental-${element}.png`}
          onClick={() => trackElemental({ step: "quiz_shared", detail: "download" }, { once: false })}
          className={`${styles.choice} inline-flex items-center justify-center gap-1 rounded-full border px-3 py-3`}
          style={{ borderColor: "rgba(243,239,230,0.25)" }}
        >
          <Download className="h-4 w-4" /> เซฟรูป
        </a>
      </div>
      {manualLink && (
        <input
          readOnly
          value={manualLink}
          aria-label="ลิงก์ผลของคุณ"
          onFocus={(e) => e.currentTarget.select()}
          autoFocus
          className="w-full rounded-full border bg-transparent px-4 py-3 text-sm"
          style={{ borderColor: "rgba(243,239,230,0.25)" }}
        />
      )}
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
