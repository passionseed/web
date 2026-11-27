"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Link2, Share2 } from "lucide-react";

import styles from "@/components/hackathon/elemental/join/join.module.css";
import { EL } from "@/components/hackathon/poster/elemental/brand";
import type { ElementKey } from "@/components/hackathon/elemental/media";
import { daysLeftToSignUp } from "@/lib/hackathon/elemental/quiz";
import { sfxChime } from "@/lib/hackathon/elemental/quiz-sfx";
import { inAppBrowser, lineExternalUrl, type InAppBrowser } from "@/lib/hackathon/elemental/share";

import { play, unlock } from "./sound";

import { trackElemental } from "../track";

type Card = { state: "loading" } | { state: "ready"; file: File } | { state: "error" };

const soft = "rgba(243,239,230,0.7)";
const edge = "rgba(243,239,230,0.25)";

/**
 * Sharing a result to an IG Story. The big button opens a short panel, so a
 * Story can't dead-end:
 * 1. Copy the link, for Instagram's link sticker (a website can't add one;
 *    without it, a posted card sends nobody back to the quiz).
 * 2. Get the card in: the share sheet where the browser can take an image,
 *    otherwise press and hold the card to save it (the way that works inside
 *    Instagram's own browser, where most people are).
 * 3. In the Story: the link sticker, then tag the friend you need.
 * Inside an app's browser it also says how to get to a real one.
 *
 * The card is fetched when the page opens, not on the tap: the share sheet
 * only opens straight from a tap, and a slow fetch in between would make the
 * button silently do nothing. LINE and the copied link share the result
 * page, whose link preview is the card.
 */
export function QuizShare({ element, shareText, needLabel, cardAlt }: { element: ElementKey; shareText: string; needLabel: string; cardAlt: string }) {
  const [open, setOpen] = useState(false);
  const [card, setCard] = useState<Card>({ state: "loading" });
  const [copied, setCopied] = useState(false);
  const [manualLink, setManualLink] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [app, setApp] = useState<InAppBrowser | null>(null);
  // Links that need the page's address are filled in after it loads, so the server and the browser render the same thing.
  const [origin, setOrigin] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const imageUrl = `/hackathon/elemental/quiz/${element}/story`;
  const fileName = `elemental-${element}.png`;
  const pageUrl = () => `${window.location.origin}/hackathon/elemental/quiz/${element}`;

  const load = useCallback(() => {
    let alive = true;
    setCard({ state: "loading" });
    fetch(imageUrl)
      .then(async (r) => {
        const blob = await r.blob();
        // Only a real PNG goes to the share sheet: an error page dressed as an image would post as nothing.
        if (!r.ok || blob.type !== "image/png" || blob.size === 0) throw new Error(`card ${r.status} ${blob.type} ${blob.size}`);
        if (alive) setCard({ state: "ready", file: new File([blob], fileName, { type: "image/png" }) });
      })
      .catch(() => alive && setCard({ state: "error" }));
    return () => {
      alive = false;
    };
  }, [imageUrl, fileName]);

  useEffect(() => load(), [load]);
  useEffect(() => {
    setApp(inAppBrowser(navigator.userAgent));
    setOrigin(window.location.origin);
  }, []);

  const canShareFiles = card.state === "ready" && typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [card.file] });

  function toggle() {
    unlock();
    const next = !open;
    setOpen(next);
    if (next) {
      trackElemental({ step: "quiz_shared", detail: "panel" }, { once: false });
      requestAnimationFrame(() => panel.current?.scrollIntoView({ block: "nearest" }));
    }
  }

  async function shareCard() {
    if (card.state !== "ready") return;
    unlock();
    // Exactly the payload that was checked: files only, since some apps drop the image when text comes with it.
    const payload = { files: [card.file] };
    if (!navigator.canShare?.(payload)) return;
    try {
      await navigator.share(payload);
      play(sfxChime);
      setStatus("ส่งรูปแล้ว ต่อด้วยสติกเกอร์ลิงก์ในสตอรี่");
      trackElemental({ step: "quiz_shared", detail: "image" }, { once: false });
    } catch (e) {
      // Closed, or no app to take it: say so, and point at the card, which can always be saved by hand.
      const closed = e instanceof DOMException && e.name === "AbortError";
      setStatus(closed ? "ยังไม่ได้แชร์ ลองอีกครั้ง หรือกดค้างที่รูปเพื่อบันทึก" : "แชร์ตรงไม่ได้ กดค้างที่รูปเพื่อบันทึกแทน");
    }
  }

  async function copyLink() {
    unlock();
    try {
      await navigator.clipboard.writeText(pageUrl());
      play(sfxChime);
      setCopied(true);
      setStatus("คัดลอกลิงก์แล้ว");
      trackElemental({ step: "quiz_shared", detail: "copy" }, { once: false });
    } catch {
      // Clipboard blocked (some in-app browsers): show the link to copy by hand.
      setManualLink(pageUrl());
      setStatus("กดค้างที่ลิงก์เพื่อคัดลอก");
    }
  }

  const lineHref = origin ? `https://line.me/R/share?text=${encodeURIComponent(`${shareText} ${origin}/hackathon/elemental/quiz/${element}`)}` : "#";

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="story-share"
        className={`${styles.choice} inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-4 text-lg font-semibold`}
        style={{ backgroundColor: EL.flame, color: EL.char }}
      >
        <Share2 className="h-5 w-5" /> แชร์ผลลงสตอรี่
      </button>

      {open && (
        <div id="story-share" ref={panel} className="mt-4 rounded-2xl border p-4" style={{ borderColor: edge }}>
          <div className="flex gap-4">
            {/* Press and hold to save: the one way that works in every app's browser. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={cardAlt} width={1080} height={1920} className="h-auto w-28 shrink-0 self-start rounded-lg border" style={{ borderColor: edge }} />
            <ol className="grid content-start gap-4 text-sm">
              <li>
                <p>
                  <Step n={1} /> คัดลอกลิงก์ ไว้ติดสติกเกอร์ลิงก์
                </p>
                <button type="button" onClick={copyLink} className="mt-2 inline-flex items-center gap-1 rounded-full border px-3 py-2" style={{ borderColor: edge }}>
                  <Link2 className="h-4 w-4" /> {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
                </button>
              </li>
              <li>
                {canShareFiles ? (
                  <>
                    <p>
                      <Step n={2} /> ส่งรูปเข้า Instagram แล้วเลือกสตอรี่
                    </p>
                    <button type="button" onClick={shareCard} className="mt-2 inline-flex items-center gap-1 rounded-full px-3 py-2 font-semibold" style={{ backgroundColor: EL.flame, color: EL.char }}>
                      <Share2 className="h-4 w-4" /> ส่งรูป
                    </button>
                  </>
                ) : (
                  <>
                    <p>
                      <Step n={2} /> กดค้างที่รูป แล้วบันทึกรูป จากนั้นเปิด Instagram เลือกสตอรี่ แล้วเลือกรูปนี้
                    </p>
                    {card.state === "loading" && <p style={{ color: soft }}>กำลังเตรียมรูป…</p>}
                    {card.state === "error" && (
                      <button type="button" onClick={load} className="mt-2 rounded-full border px-3 py-2" style={{ borderColor: edge }}>
                        ลองโหลดรูปอีกครั้ง
                      </button>
                    )}
                  </>
                )}
              </li>
              <li>
                <p>
                  <Step n={3} /> ในสตอรี่ แตะสติกเกอร์ เลือกลิงก์ แล้ววาง จากนั้นแท็ก{needLabel}ของคุณในกรอบ
                </p>
              </li>
            </ol>
          </div>

          {app && <InAppHint app={app} here={`${origin}/hackathon/elemental/quiz/${element}?me=1`} />}

          {manualLink && (
            <input
              readOnly
              value={manualLink}
              aria-label="ลิงก์ผลของคุณ กดค้างเพื่อคัดลอก"
              onFocus={(e) => e.currentTarget.select()}
              autoFocus
              className="mt-4 w-full rounded-full border bg-transparent px-4 py-3 text-sm"
              style={{ borderColor: edge }}
            />
          )}

          <p role="status" className="mt-3 min-h-5 text-sm" style={{ color: soft }}>
            {status}
          </p>

          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-2 text-sm" style={{ color: soft }}>
            <a href={imageUrl} download={fileName} className="inline-flex items-center gap-1 underline underline-offset-4" onClick={() => trackElemental({ step: "quiz_shared", detail: "download" }, { once: false })}>
              <Download className="h-4 w-4" /> ดาวน์โหลดรูป
            </a>
            <a href={imageUrl} className="underline underline-offset-4">
              เปิดรูปเต็ม
            </a>
          </div>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <a
          href={lineHref}
          onClick={() => trackElemental({ step: "quiz_shared", detail: "line" }, { once: false })}
          className={`${styles.choice} rounded-full border px-3 py-3 text-center`}
          style={{ borderColor: edge }}
        >
          ส่งใน LINE
        </a>
        <button type="button" onClick={copyLink} className={`${styles.choice} inline-flex items-center justify-center gap-1 rounded-full border px-3 py-3`} style={{ borderColor: edge }}>
          <Link2 className="h-4 w-4" /> {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
        </button>
      </div>
    </div>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold" style={{ backgroundColor: EL.cream, color: EL.char }}>
      {n}
    </span>
  );
}

/** Inside an app's browser: how to reach a real one, where saving and sharing the card always work. */
function InAppHint({ app, here }: { app: InAppBrowser; here: string }) {
  return (
    <p className="mt-4 rounded-xl px-3 py-2 text-sm" style={{ backgroundColor: "rgba(243,239,230,0.08)" }}>
      {app === "line" ? (
        <>
          กดค้างที่รูปไม่ได้?{" "}
          <a href={lineExternalUrl(here)} className="underline underline-offset-4">
            เปิดหน้านี้ในเบราว์เซอร์
          </a>
        </>
      ) : (
        <>กดค้างที่รูปไม่ได้? แตะ ⋯ มุมขวาบน แล้วเลือกเปิดในเบราว์เซอร์ หน้านี้จะเปิดผลของคุณต่อ</>
      )}
    </p>
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
