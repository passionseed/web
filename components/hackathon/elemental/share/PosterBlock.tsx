"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, Share2 } from "lucide-react";

import { EL } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { linkUrl, type ShareKind } from "@/lib/hackathon/elemental/share";

import { btn, btnSmall, filled, hairline, outline } from "./ui";

/**
 * Your own poster (its QR code is your link) and the link as text, with the
 * fastest ways to send them: the phone's share sheet, save, copy, or LINE.
 * The same actions sit in a bar at the bottom of the screen while the seat
 * is still open, so the main action is always in reach.
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  posterAlt: (code: string) => `โปสเตอร์ ${ELEMENTAL.edition} Hackathon รหัส ${code}`,
  shareImage: "แชร์รูป",
  saveImage: "บันทึกรูป",
  linkTitle: "หรือส่งเป็นลิงก์",
  copy: "คัดลอกลิงก์",
  copied: "คัดลอกแล้ว",
  line: "ส่งใน LINE",
  message: (url: string) => `มาลง ${ELEMENTAL.edition} Hackathon กัน สมัครที่นี่ ${url}`,
};

export type PosterShare = {
  code: string;
  src: string;
  url: string;
  /** The link without https://www., for showing. */
  display: string;
  lineHref: string;
  file: File | null;
  canShareFile: boolean;
};

/** Load the poster once for the block and the bar. iOS opens the share sheet only straight from a tap, so the file is fetched first. */
export function usePosterShare(code: string, kind: ShareKind, posterVersion: string): PosterShare {
  const src = `/api/hackathon/elemental/share/poster/${code}?v=${posterVersion}`;
  const url = linkUrl(kind, code);
  const [file, setFile] = useState<File | null>(null);
  const [canShareFile, setCanShareFile] = useState(false);
  useEffect(() => {
    let live = true;
    fetch(src)
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (!live || !b) return;
        const f = new File([b], `elemental-${code}.jpg`, { type: b.type || "image/jpeg" });
        setFile(f);
        setCanShareFile(!!navigator.canShare?.({ files: [f] }));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [src, code]);
  return {
    code,
    src,
    url,
    display: url.replace(/^https:\/\/www\./, ""),
    lineHref: `https://line.me/R/share?text=${encodeURIComponent(COPY.message(url))}`,
    file,
    canShareFile,
  };
}

/** Share the image if the phone can, else save it. */
function ImageAction({ poster, className }: { poster: PosterShare; className: string }) {
  if (poster.canShareFile && poster.file) {
    const file = poster.file;
    return (
      <button type="button" className={className} style={filled} onClick={() => navigator.share({ files: [file] }).catch(() => {})}>
        <Share2 className="h-4 w-4" /> {COPY.shareImage}
      </button>
    );
  }
  return (
    <a href={`${poster.src}&download=1`} download={`elemental-${poster.code}.jpg`} className={className} style={filled}>
      <Download className="h-4 w-4" /> {COPY.saveImage}
    </a>
  );
}

export function PosterBlock({ poster, actions = true }: { poster: PosterShare; actions?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard?.writeText(poster.url).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const [path, query] = poster.display.split("?");

  return (
    <div className="space-y-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={poster.src}
        alt={COPY.posterAlt(poster.code.toUpperCase())}
        width={1080}
        height={1350}
        className="w-full rounded-xl"
        style={{ aspectRatio: "4 / 5", backgroundColor: EL.ink }}
      />
      {actions && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <ImageAction poster={poster} className={btn} />
            {poster.canShareFile && (
              <a href={`${poster.src}&download=1`} download={`elemental-${poster.code}.jpg`} className={btn} style={outline}>
                <Download className="h-4 w-4" /> {COPY.saveImage}
              </a>
            )}
          </div>
          <div className="space-y-3 rounded-2xl border p-4" style={{ borderColor: hairline }}>
            <p className="text-sm" style={{ color: EL.inkSoft }}>
              {COPY.linkTitle}
            </p>
            <p className="break-words text-base">
              {path}
              <wbr />?{query}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copy} className={btnSmall} style={outline}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? COPY.copied : COPY.copy}
              </button>
              <a href={poster.lineHref} target="_blank" rel="noopener noreferrer" className={btnSmall} style={outline}>
                <Share2 className="h-4 w-4" /> {COPY.line}
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** The main actions, pinned to the bottom of the screen (above the iPhone home bar). */
export function ShareBar({ poster }: { poster: PosterShare }) {
  const bar = "inline-flex h-[52px] items-center justify-center gap-2 rounded-full px-4 text-base font-semibold";
  return (
    <div
      data-share-bar=""
      className="fixed inset-x-0 bottom-0 z-40 border-t px-5 pt-2"
      style={{ backgroundColor: EL.cream, borderColor: hairline, paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}
    >
      <div className="mx-auto grid max-w-xl grid-cols-2 gap-2">
        <ImageAction poster={poster} className={bar} />
        <a href={poster.lineHref} target="_blank" rel="noopener noreferrer" className={bar} style={outline}>
          <Share2 className="h-4 w-4" /> {COPY.line}
        </a>
      </div>
    </div>
  );
}
