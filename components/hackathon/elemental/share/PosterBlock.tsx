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
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  posterAlt: (code: string) => `โปสเตอร์ ${ELEMENTAL.edition} Hackathon รหัส ${code}`,
  shareImage: "แชร์รูปนี้",
  saveImage: "บันทึกรูป",
  linkTitle: "หรือส่งเป็นลิงก์",
  copy: "คัดลอกลิงก์",
  copied: "คัดลอกแล้ว",
  line: "ส่งใน LINE",
  message: (url: string) => `มาลง ${ELEMENTAL.edition} Hackathon กัน สมัครที่นี่ ${url}`,
};

export function PosterBlock({ code, kind, posterVersion }: { code: string; kind: ShareKind; posterVersion: string }) {
  const src = `/api/hackathon/elemental/share/poster/${code}?v=${posterVersion}`;
  const url = linkUrl(kind, code);
  const display = url.replace(/^https:\/\/www\./, "");
  const [file, setFile] = useState<File | null>(null);
  const [canShareFile, setCanShareFile] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch the image first: iOS only opens the share sheet straight from a tap.
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

  const copy = async () => {
    await navigator.clipboard?.writeText(url).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={COPY.posterAlt(code.toUpperCase())} width={1080} height={1350} className="w-full rounded-xl" style={{ aspectRatio: "4 / 5", backgroundColor: EL.ink }} />
      <div className="grid gap-3 sm:grid-cols-2">
        {canShareFile && file && (
          <button type="button" className={btn} style={filled} onClick={() => navigator.share({ files: [file] }).catch(() => {})}>
            <Share2 className="h-4 w-4" /> {COPY.shareImage}
          </button>
        )}
        <a href={`${src}&download=1`} download={`elemental-${code}.jpg`} className={btn} style={canShareFile ? outline : filled}>
          <Download className="h-4 w-4" /> {COPY.saveImage}
        </a>
      </div>

      <div className="space-y-3 rounded-2xl border p-4" style={{ borderColor: hairline }}>
        <p className="text-sm" style={{ color: EL.inkSoft }}>
          {COPY.linkTitle}
        </p>
        <p className="break-words text-base">
          {display.split("?")[0]}
          <wbr />?{display.split("?")[1]}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={copy} className={btnSmall} style={outline}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? COPY.copied : COPY.copy}
          </button>
          <a
            href={`https://line.me/R/share?text=${encodeURIComponent(COPY.message(url))}`}
            target="_blank"
            rel="noopener noreferrer"
            className={btnSmall}
            style={outline}
          >
            <Share2 className="h-4 w-4" /> {COPY.line}
          </a>
        </div>
      </div>
    </div>
  );
}
