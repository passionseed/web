"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";

import { EL } from "@/components/hackathon/poster/elemental/brand";
import { SHARE } from "@/lib/hackathon/elemental/share";
import { remaining, type ShareLinkView } from "@/lib/hackathon/elemental/share-rules";

import { ShareProgressCompact } from "./Progress";
import { btn, btnSmall, CodeText, hairline, outline, filled, schoolLabel } from "./ui";
import { usePollLink } from "./usePoll";

/**
 * The share card on a sign-up's own page (pay, slip waiting, or paid): how
 * far their link is, a way to the share page, and their own code, which a
 * friend or teacher types to give them a school's free seat.
 */

export type ShareCardData = {
  /** The share page. */
  href: string;
  /** Where the card refreshes its numbers; null in demos. */
  pollUrl: string | null;
  /** This sign-up's code: the first 8 hex of its id. */
  code: string;
  selfPaid: boolean;
  link: ShareLinkView | null;
};

// copy: placeholder — Angpao rewrites
const COPY = {
  title: "แชร์โปสเตอร์ ลุ้นที่นั่งฟรี",
  lead: `ครบ ${SHARE.devicesGoal} คนเปิดลิงก์ และ ${SHARE.paidGoal} คนสมัครแล้วจ่าย ได้ที่นั่งฟรี โรงเรียนละ 1 ที่ ใครครบก่อนได้ก่อน`,
  leadPaid: `จ่ายแล้วก็แชร์ได้ ครบ ${SHARE.devicesGoal} คนเปิดลิงก์ และ ${SHARE.paidGoal} คนจ่ายก่อนใครในโรงเรียน ยกที่นั่งฟรีให้เพื่อนได้ 1 ที่`,
  start: "เลือกโรงเรียน รับโปสเตอร์",
  open: "ดูโปสเตอร์และลิงก์ของฉัน",
  nameFriend: "ใส่รหัสเพื่อน",
  left: (d: number, p: number) => [d > 0 && `อีก ${d} เครื่อง`, p > 0 && `อีก ${p} คนจ่าย`].filter(Boolean).join(" กับ"),
  status: {
    checkingSelf: "ครบแล้ว ทีมงานกำลังเช็ก",
    checkingNone: "ครบแล้ว ใส่รหัสเพื่อนเพื่อยกที่นั่ง",
    checkingOther: "ยกให้เพื่อนแล้ว ทีมงานกำลังเช็ก",
    givenSelf: "ได้ที่นั่งฟรีแล้ว",
    givenOther: "ยกที่นั่งฟรีให้เพื่อนแล้ว",
    taken: "ที่นั่งของโรงเรียนนี้มีคนได้แล้ว แชร์ต่อได้",
    rejected: "ลิงก์นี้ไม่ได้ที่นั่งฟรี",
  },
  myCode: "รหัสของฉัน",
  myCodeHint: "เพื่อนหรือครูที่ได้ที่นั่งฟรี ยกให้คุณได้ด้วยรหัสนี้",
  copy: "คัดลอก",
  copied: "คัดลอกแล้ว",
};

function statusLine(link: ShareLinkView): { text: string; news: boolean } {
  const s = link.seat;
  const t = COPY.status;
  switch (s.state) {
    case "open": {
      const r = remaining(link.progress);
      return { text: COPY.left(r.devices, r.paid) || t.checkingSelf, news: false };
    }
    case "taken":
      return { text: t.taken, news: false };
    case "rejected":
      return { text: t.rejected, news: false };
    case "checking":
      return { text: s.recipient.who === "self" ? t.checkingSelf : s.recipient.who === "none" ? t.checkingNone : t.checkingOther, news: true };
    case "given":
      return { text: s.recipient.who === "self" ? t.givenSelf : t.givenOther, news: true };
  }
}

export function ShareCard({ share }: { share: ShareCardData }) {
  const [link, setLink] = useState<ShareLinkView | null>(share.link);
  const [copied, setCopied] = useState(false);
  const onLink = useCallback((l: ShareLinkView) => setLink(l), []);
  usePollLink(link ? share.pollUrl : null, onLink);

  const copy = async () => {
    await navigator.clipboard?.writeText(share.code.toUpperCase()).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const status = link ? statusLine(link) : null;
  const needsFriend = link?.seat.state === "checking" && link.seat.recipient.who === "none";

  return (
    <section className="space-y-4 rounded-2xl border p-5 sm:p-6" style={{ borderColor: "rgba(29,33,31,0.2)" }}>
      <h2 className="text-xl font-semibold">{COPY.title}</h2>
      {link && status ? (
        <>
          <p className="text-base" style={{ color: EL.inkSoft }}>
            {schoolLabel(link.school.name)}
          </p>
          <ShareProgressCompact progress={link.progress} />
          <p className="text-base" style={{ color: status.news ? EL.flame : EL.ink, fontWeight: status.news ? 600 : 400 }} aria-live="polite">
            {status.text}
          </p>
        </>
      ) : (
        <p style={{ color: EL.inkSoft }}>{share.selfPaid ? COPY.leadPaid : COPY.lead}</p>
      )}
      <Link href={share.href} className={`${btn} w-full`} style={!link || needsFriend ? filled : outline}>
        {!link ? COPY.start : needsFriend ? COPY.nameFriend : COPY.open}
      </Link>

      <div className="flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: hairline }}>
        <div className="min-w-0">
          <p className="text-sm" style={{ color: EL.inkSoft }}>
            {COPY.myCode}
          </p>
          <CodeText code={share.code} className="text-2xl" />
        </div>
        <button type="button" onClick={copy} className={btnSmall} style={outline} aria-label={`${COPY.copy} ${COPY.myCode}`}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? COPY.copied : COPY.copy}
        </button>
      </div>
      {!share.selfPaid && (
        <p className="-mt-2 text-sm" style={{ color: EL.inkSoft }}>
          {COPY.myCodeHint}
        </p>
      )}
    </section>
  );
}
