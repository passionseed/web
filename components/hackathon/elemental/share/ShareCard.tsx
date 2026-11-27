"use client";

import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";
import { Check, Copy, Share2 } from "lucide-react";

import { EL } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { linkUrl } from "@/lib/hackathon/elemental/share";
import { SEAT_RULE, type ShareLinkView } from "@/lib/hackathon/elemental/share-rules";

import { meterTitle, SeatMeter } from "./Progress";
import { btn, btnSmall, CodeText, filled, hairline, outline, schoolLabel } from "./ui";
import { usePollLink } from "./usePoll";

/**
 * "ลิงก์ของฉัน": the one card on a sign-up's own page (pay, slip waiting, or
 * paid) for everything that counts devices: the link, the house meter (50
 * devices, 3 paid, the free seat), the team's row on the board (builder B's
 * TeamStyleRow, passed in), and this sign-up's own code, which a friend or a
 * teacher types to give them a free seat.
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
  /** "after-close": numbers frozen at close, no new links, no share buttons. */
  phase: "open" | "after-close";
};

// copy: placeholder — Angpao rewrites
const COPY = {
  title: "ลิงก์ของฉัน",
  lead: `เลือกโรงเรียน รับลิงก์และโปสเตอร์ของคุณ ทุก ${SEAT_RULE.devicesPerSeat} เครื่อง + ${SEAT_RULE.paidPerSeat} คนจ่าย ได้ที่นั่งฟรี 1 ที่ ได้สูงสุด ${SEAT_RULE.maxSeatsPerLink} ที่`,
  leadClosed: "ปิดรับสมัครแล้ว ลิงก์แชร์ปิดตามไปด้วย",
  start: "เลือกโรงเรียน ลุ้นที่นั่งฟรี",
  open: "ดูโปสเตอร์และลิงก์ของฉัน",
  openClosed: "ดูหน้าลิงก์ของฉัน",
  nameFriend: "ใส่รหัสเพื่อน",
  pendingLine: "จ่ายแล้วก็แชร์ต่อได้ ที่นั่งฟรีที่ได้ ยกให้เพื่อนได้",
  linkLabel: "ชวนคนอื่นสมัคร",
  copy: "คัดลอกลิงก์",
  copied: "คัดลอกแล้ว",
  line: "ส่งใน LINE",
  message: (url: string) => `มาลง ${ELEMENTAL.edition} Hackathon กัน สมัครที่นี่ ${url}`,
  news: {
    needs: (i: number) => `ที่นั่งฟรีที่ ${i}: ใส่รหัสเพื่อนที่ยังไม่จ่าย`,
    mineChecking: (i: number) => `ที่นั่งฟรีที่ ${i} เป็นของคุณ ทีมงานกำลังเช็ก ผ่านแล้วไม่ต้องโอน`,
    otherChecking: (i: number) => `ที่นั่งฟรีที่ ${i}: ยกให้เพื่อนแล้ว ทีมงานกำลังเช็ก`,
    mineGiven: "ที่นั่งของคุณเป็นที่นั่งฟรีแล้ว",
    given: (n: number) => `ให้ที่นั่งฟรีแล้ว ${n} ที่`,
    rejected: (i: number) => `ที่นั่งฟรีที่ ${i}: ทีมงานเช็กแล้วไม่ผ่าน`,
  },
  myCode: "รหัสของฉัน",
  myCodeHint: "เพื่อนหรือครูที่ได้ที่นั่งฟรี ยกให้คุณได้ด้วยรหัสนี้",
  copyCode: "คัดลอก",
};

/** The one line of news that most needs the owner: a name to type, a check under way, or what's been given. */
function news(link: ShareLinkView): { text: string; act: boolean } | null {
  const seats = link.seats.seats;
  const n = COPY.news;
  const needs = seats.find((x) => x.status === "needs_recipient");
  if (needs) return { text: n.needs(needs.index), act: true };
  const checking = seats.find((x) => x.status === "qualified");
  if (checking) return { text: checking.mine ? n.mineChecking(checking.index) : n.otherChecking(checking.index), act: true };
  const given = seats.filter((x) => x.status === "confirmed");
  if (given.length) return { text: given.length === 1 && given[0].mine ? n.mineGiven : n.given(given.length), act: false };
  const rejected = seats.find((x) => x.status === "rejected");
  return rejected ? { text: n.rejected(rejected.index), act: false } : null;
}

function CopyButton({ text, label, done }: { text: string; label: string; done: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard?.writeText(text).catch(() => undefined);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className={btnSmall}
      style={outline}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? done : label}
    </button>
  );
}

export function ShareCard({ share, teamRow }: { share: ShareCardData; teamRow?: ReactNode }) {
  const [link, setLink] = useState<ShareLinkView | null>(share.link);
  const onLink = useCallback((l: ShareLinkView) => setLink(l), []);
  usePollLink(link ? share.pollUrl : null, onLink);
  const open = share.phase === "open";
  const needsFriend = !!link?.seats.seats.some((x) => x.status === "needs_recipient");
  // On an unpaid page, paying stays the main action: the share button is an outline.
  const ctaStyle = needsFriend || (share.selfPaid && !link) ? filled : outline;
  const url = link ? linkUrl(link.kind, link.code) : null;
  // All seats earned, or closed: no seat left to promise.
  const seatGone = !open || !!link?.seats.maxed;
  const latest = link ? news(link) : null;

  return (
    <section className="space-y-4 rounded-2xl border p-5 sm:p-6" style={{ borderColor: "rgba(29,33,31,0.2)" }}>
      {link ? (
        <>
          <div>
            <h2 className="text-xl font-semibold">{meterTitle(link.seats)}</h2>
            <p className="mt-1 text-base" style={{ color: EL.inkSoft }}>
              {COPY.title} · {schoolLabel(link.school.name)}
            </p>
          </div>
          {latest && (
            <p className="text-base font-semibold" style={{ color: latest.act ? EL.flame : EL.ink }} aria-live="polite">
              {latest.text}
            </p>
          )}
          <SeatMeter view={link.seats} kind="student" framed={false} showTitle={false} />
        </>
      ) : (
        <div>
          <h2 className="text-xl font-semibold">{COPY.title}</h2>
          <p className="mt-2" style={{ color: EL.inkSoft }}>
            {open ? COPY.lead : COPY.leadClosed}
          </p>
        </div>
      )}

      {teamRow && (
        <div className="border-t pt-4" style={{ borderColor: hairline }}>
          {teamRow}
        </div>
      )}

      {(link || open) && (
        <div className="space-y-3 border-t pt-4" style={{ borderColor: hairline }}>
          {link && url && open && (
            <>
              <p className="text-base font-semibold">{COPY.linkLabel}</p>
              <p className="break-words text-sm" style={{ color: EL.inkSoft }}>
                {url.replace(/^https:\/\/www\./, "").split("?")[0]}
                <wbr />?{url.split("?")[1]}
              </p>
              <div className="flex flex-wrap gap-2">
                <CopyButton text={url} label={COPY.copy} done={COPY.copied} />
                <a href={`https://line.me/R/share?text=${encodeURIComponent(COPY.message(url))}`} target="_blank" rel="noopener noreferrer" className={btnSmall} style={outline}>
                  <Share2 className="h-4 w-4" /> {COPY.line}
                </a>
              </div>
            </>
          )}
          <Link href={share.href} className={`${btn} w-full`} style={ctaStyle}>
            {!link ? COPY.start : needsFriend ? COPY.nameFriend : open ? COPY.open : COPY.openClosed}
          </Link>
          {!share.selfPaid && open && !seatGone && (
            <p className="text-sm" style={{ color: EL.inkSoft }}>
              {COPY.pendingLine}
            </p>
          )}
        </div>
      )}

      <div className="border-t pt-4" style={{ borderColor: hairline }}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm" style={{ color: EL.inkSoft }}>
              {COPY.myCode}
            </p>
            <CodeText code={share.code} className="text-2xl" />
          </div>
          <CopyButton text={share.code.toUpperCase()} label={COPY.copyCode} done={COPY.copied} />
        </div>
        {!share.selfPaid && (
          <p className="mt-2 text-sm" style={{ color: EL.inkSoft }}>
            {COPY.myCodeHint}
          </p>
        )}
      </div>
    </section>
  );
}
