"use client";

/**
 * The end-of-run card, e.g. "โปรไฟล์สายไซเบอร์ของฉัน": a pixel avatar, the
 * three traits picked from the student's own choices, XP, levels cleared and
 * badges. Built on the device from local progress only (buildProfileCard in
 * lib/radar-guide/story.ts); it carries no name and no free text.
 *
 * Sharing: the card is rendered to a 1080x1350 PNG in the browser with
 * html-to-image (already a dependency, loaded only when needed). Inside
 * Instagram and Facebook (and for "บันทึกรูป" in any in-app browser) the native
 * sheet and blob downloads do not work, so the PNG opens in an overlay to
 * long-press and save, next to the selectable link. Elsewhere: Web Share with
 * the image file when the PNG is ready, a link share otherwise, and a PNG
 * download without Web Share. "คัดลอกลิงก์" falls back to a pre-selected text
 * field (IG in-app browser rule).
 *
 * The PNG is prepared shortly after the card appears, so the share tap can
 * call navigator.share straight away (iOS drops the tap if we wait too long).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ProfileCard as ProfileCardData } from "@/lib/radar-guide/story";
import { PixelIcon, PixelSprite } from "./PixelSprite";
import { avatarPalette, HOST_GRIDS } from "./pixel-art";
import { profileFileName, profileSaveRoute, profileShareRoute, xpSegments, type ProfileShareRoute } from "./story-logic";
import "./story.css";

export type ProfileShareMethod = ProfileShareRoute | "copy";

export interface ProfileCardProps {
  card: ProfileCardData;
  accent: string;
  /** Absolute link shared with the card, e.g. https://passionseed.org/r/cyber */
  shareUrl: string;
  /** The short link printed on the card, e.g. "passionseed.org/r/cyber". */
  shareLabel?: string;
  /** Frame art (/radar/guides/<slug>/frame.webp); a CSS pixel border shows without it. */
  frameSrc?: string | null;
  /** Analytics hook: which share route worked. */
  onShare?(method: ProfileShareMethod): void;
  /** The in-app browser (attribution ua_app or detectUaApp); null in a normal browser. */
  uaApp?: string | null;
  className?: string;
}

const EXPORT_W = 1080;
const CARD_W = 320; // CSS px; 1080 / 320 = 3.375 pixel ratio
const PREPARE_DELAY_MS = 600;

type Status = "idle" | "working" | "error" | "copied";

async function renderPng(node: HTMLElement): Promise<Blob | null> {
  const { toBlob } = await import("html-to-image");
  const opts = { pixelRatio: EXPORT_W / node.offsetWidth || EXPORT_W / CARD_W, cacheBust: true, backgroundColor: "#1a0e14" };
  try {
    return await toBlob(node, opts);
  } catch {
    // Font embedding is the usual failure (blocked stylesheet); retry without it.
    return toBlob(node, { ...opts, skipFonts: true });
  }
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function ProfileCard({ card, accent, shareUrl, shareLabel, frameSrc, onShare, uaApp = null, className }: ProfileCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const pngRef = useRef<Blob | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [frameOk, setFrameOk] = useState(Boolean(frameSrc));
  const [copyFallback, setCopyFallback] = useState(false);
  /** Object URL of the PNG shown to long-press (in-app browsers). */
  const [overlaySrc, setOverlaySrc] = useState<string | null>(null);
  const fileName = profileFileName(card.slug);
  const traitsKey = card.traits.map((t) => t.id).join(",");

  // Prepare the PNG in the background once fonts are in, and again if the card changes.
  useEffect(() => {
    pngRef.current = null;
    let cancelled = false;
    const id = window.setTimeout(async () => {
      try {
        await document.fonts?.ready;
        if (cancelled || !cardRef.current) return;
        const blob = await renderPng(cardRef.current);
        if (!cancelled) pngRef.current = blob;
      } catch {
        // The tap will try again.
      }
    }, PREPARE_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [traitsKey, card.xp, card.levelsCleared, card.badges.length, frameOk]);

  const getPng = useCallback(async (): Promise<Blob | null> => {
    if (pngRef.current) return pngRef.current;
    if (!cardRef.current) return null;
    const blob = await renderPng(cardRef.current);
    pngRef.current = blob;
    return blob;
  }, []);

  const shareText = `${card.titleTh}: ${card.traits.map((t) => t.labelTh).join(" · ")}`;

  // Revoke the overlay image's object URL when it closes or the card unmounts.
  useEffect(() => {
    if (!overlaySrc) return;
    return () => URL.revokeObjectURL(overlaySrc);
  }, [overlaySrc]);

  const openOverlay = useCallback(async () => {
    const blob = await getPng();
    if (!blob) throw new Error("no image");
    setOverlaySrc(URL.createObjectURL(blob));
  }, [getPng]);

  const onShareTap = useCallback(async () => {
    // Decide and call navigator.share inside the tap, before any await.
    const ready = pngRef.current;
    const file = ready && typeof File === "function" ? new File([ready], fileName, { type: "image/png" }) : null;
    const route = profileShareRoute({ nav: typeof navigator === "undefined" ? undefined : navigator, file, uaApp });
    setStatus("working");
    try {
      if (route === "files" && file) {
        await navigator.share({ files: [file], title: card.titleTh, text: `${shareText} ${shareUrl}` });
      } else if (route === "url") {
        await navigator.share({ title: card.titleTh, text: shareText, url: shareUrl });
      } else if (route === "overlay") {
        await openOverlay();
      } else {
        const blob = await getPng();
        if (!blob) throw new Error("no image");
        download(blob, fileName);
      }
      onShare?.(route);
      setStatus("idle");
    } catch (err) {
      // Closing the share sheet is not an error.
      if (err && typeof err === "object" && "name" in err && (err as { name: string }).name === "AbortError") {
        setStatus("idle");
        return;
      }
      setStatus("error");
    }
  }, [getPng, openOverlay, fileName, card.titleTh, shareText, shareUrl, onShare, uaApp]);

  const onSaveTap = useCallback(async () => {
    setStatus("working");
    try {
      const route = profileSaveRoute(uaApp);
      if (route === "overlay") {
        await openOverlay();
      } else {
        const blob = await getPng();
        if (!blob) throw new Error("no image");
        download(blob, fileName);
      }
      onShare?.(route);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, [getPng, openOverlay, fileName, onShare, uaApp]);

  const onCopyTap = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      onShare?.("copy");
      setStatus("copied");
    } catch {
      setCopyFallback(true);
    }
  }, [shareUrl, onShare]);

  const segments = 10;
  const filled = xpSegments(card.xp, card.maxXp, segments);

  return (
    <section className={`rgs-profile ${className ?? ""}`} aria-label={card.titleTh} data-testid="profile-card">
      <div
        ref={cardRef}
        className={`rgs-profile__card ${frameOk ? "rgs-profile__card--framed" : ""}`}
        style={{ ["--rgs-accent" as string]: accent, width: CARD_W }}
      >
        {frameSrc && frameOk ? (
          // Plain img: html-to-image inlines it into the PNG (same origin).
          // eslint-disable-next-line @next/next/no-img-element
          <img src={frameSrc} alt="" className="rgs-pixelated rgs-profile__frame" onError={() => setFrameOk(false)} draggable={false} />
        ) : null}
        <div className="rgs-profile__inner">
          <p className="rgs-profile__title">{card.titleTh}</p>
          <div className="rgs-profile__hero">
            <PixelSprite grid={HOST_GRIDS.cheer} palette={avatarPalette(accent)} width={96} className="rgs-profile__avatar" />
            <div className="rgs-profile__stats">
              <span className="rgs-profile__xp">
                XP {card.xp}
                <span className="rgs-profile__xpmax">/{card.maxXp}</span>
              </span>
              <span className="rgs-profile__bar" aria-hidden="true">
                {Array.from({ length: segments }, (_, i) => (
                  <span key={i} className={i < filled ? "on" : ""} />
                ))}
              </span>
              <span className="rgs-profile__meta">
                ผ่าน {card.levelsCleared}/{card.levelsTotal} ด่าน
              </span>
              <span className="rgs-profile__meta">ได้ตรา {card.badges.length} อัน</span>
            </div>
          </div>
          <ul className="rgs-profile__traits">
            {card.traits.map((t) => (
              <li key={t.id} className="rgs-profile__trait">
                <PixelIcon icon={t.icon} size={24} color={accent} color2="#ff8a4c" />
                <span>{t.labelTh}</span>
              </li>
            ))}
          </ul>
          {card.badges.length ? (
            <div className="rgs-profile__badges" aria-hidden="true">
              {card.badges.slice(0, 8).map((b) => (
                <PixelIcon key={b.id} icon={b.icon} size={20} color={accent} color2="#ffd08a" />
              ))}
            </div>
          ) : null}
          <p className="rgs-profile__foot">
            <span>PassionSeed Career Radar</span>
            {shareLabel ? <span className="rgs-profile__link">{shareLabel}</span> : null}
          </p>
        </div>
      </div>

      <div className="rgs-profile__actions">
        <button type="button" className="rgs-pixel-btn rgs-pixel-btn--primary" onClick={onShareTap} disabled={status === "working"} data-demo="profile-share">
          {status === "working" ? "กำลังทำรูป" : "แชร์การ์ดนี้"}
        </button>
        <button type="button" className="rgs-pixel-btn" onClick={onSaveTap} disabled={status === "working"} data-demo="profile-save">
          บันทึกรูป
        </button>
        <button type="button" className="rgs-pixel-btn rgs-pixel-btn--ghost" onClick={onCopyTap}>
          {status === "copied" ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
        </button>
      </div>
      {copyFallback ? (
        <textarea
          className="rgs-profile__copy"
          readOnly
          value={shareUrl}
          aria-label="ลิงก์สำหรับคัดลอก"
          ref={(el) => {
            el?.focus();
            el?.select();
          }}
        />
      ) : null}
      {overlaySrc ? (
        <div className="rgs-profile__overlay" role="dialog" aria-modal="true" aria-label="บันทึกการ์ด" data-testid="profile-overlay">
          <div className="rgs-profile__overlay-inner rgs-pixel-box">
            {/* Plain img from an object URL: long-press saves it in in-app browsers. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={overlaySrc} alt={card.titleTh} className="rgs-profile__overlay-img" />
            <p className="rgs-profile__overlay-hint">กดค้างที่รูปเพื่อบันทึก แล้วแชร์ต่อได้เลย</p>
            <input
              className="rgs-profile__copy"
              readOnly
              value={shareUrl}
              aria-label="ลิงก์สำหรับคัดลอก"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button type="button" className="rgs-pixel-btn rgs-pixel-btn--ghost" onClick={() => setOverlaySrc(null)}>
              ปิด
            </button>
          </div>
        </div>
      ) : null}
      <p className="rgs-profile__status" role="status" aria-live="polite">
        {status === "error" ? "ทำรูปไม่สำเร็จ ลองแคปหน้าจอการ์ดนี้แทนได้เลย" : ""}
      </p>
    </section>
  );
}
