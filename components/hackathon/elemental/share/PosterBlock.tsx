"use client";

import { useEffect, useState } from "react";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { linkUrl, type ShareKind } from "@/lib/hackathon/elemental/share";

import { EditorialLink, PrimaryButton, SecondaryButton, StickyBar } from "./ui";

/**
 * Your own poster (its QR code is your link) and the ways to send it. The one
 * main action is "ส่งใน LINE →" in the sticky bar: LINE's share picker with
 * the link, which previews as this poster (the landing's per-code og:image).
 * Copy sits beside it as a square button; saving the image is a text link
 * under the poster (LINE's own browser can't always save files).
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  posterAlt: (code: string) => `โปสเตอร์ ${ELEMENTAL.edition} Hackathon รหัส ${code}`,
  saveImage: "บันทึกรูป",
  copy: "คัดลอกลิงก์",
  copied: "คัดลอกแล้ว",
  line: "ส่งใน LINE",
  message: (url: string) => `มาลง ${ELEMENTAL.edition} Hackathon กัน สมัครที่นี่ ${url}`,
};

export type PosterShare = {
  code: string;
  src: string;
  url: string;
  lineHref: string;
  file: File | null;
  canShareFile: boolean;
};

export const lineShareHref = (text: string) => `https://line.me/R/share?text=${encodeURIComponent(text)}`;
export const shareMessage = COPY.message;

/** Load the poster once for the page and the bar. iOS opens the share sheet only straight from a tap, so the file is fetched first. */
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
  return { code, src, url, lineHref: lineShareHref(COPY.message(url)), file, canShareFile };
}

/** The poster, full width, square corners, and "บันทึกรูป" under it. */
export function Poster({ poster }: { poster: PosterShare }) {
  const file = poster.file;
  return (
    <figure>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={poster.src}
        alt={COPY.posterAlt(poster.code.toUpperCase())}
        width={1080}
        height={1350}
        className="block w-full rounded-[2px]"
        style={{ aspectRatio: "4 / 5", backgroundColor: "#1a1b19" }}
      />
      <figcaption className="mt-3">
        {poster.canShareFile && file ? (
          // The phone's share sheet has "Save image"; it also posts the picture with the link.
          <EditorialLink size="sm" onClick={() => navigator.share({ files: [file], text: COPY.message(poster.url) }).catch(() => {})}>
            {COPY.saveImage}
          </EditorialLink>
        ) : (
          <EditorialLink size="sm" href={`${poster.src}&download=1`} download={`elemental-${poster.code}.jpg`}>
            {COPY.saveImage}
          </EditorialLink>
        )}
      </figcaption>
    </figure>
  );
}

/** A square copy button (52px) with a hidden label and a spoken "คัดลอกแล้ว". */
export function CopyIconButton({ text, label = COPY.copy }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <>
      <SecondaryButton
        icon={copied ? "check" : "copy"}
        className="!w-[52px] shrink-0 !px-0"
        aria-label={label}
        onClick={async () => {
          await navigator.clipboard?.writeText(text).catch(() => undefined);
          setCopied(true);
        }}
      >
        <span className="sr-only">{label}</span>
      </SecondaryButton>
      <span className="sr-only" aria-live="polite">
        {copied ? COPY.copied : ""}
      </span>
    </>
  );
}

/** The page's one main action, pinned: send in LINE, with copy beside it. */
export function ShareBar({ poster, label = COPY.line }: { poster: PosterShare; label?: string }) {
  return (
    <StickyBar>
      <PrimaryButton href={poster.lineHref} external icon="chat" full className="min-w-0 flex-1">
        {label}
      </PrimaryButton>
      <CopyIconButton text={poster.url} />
    </StickyBar>
  );
}
