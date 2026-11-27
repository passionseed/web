"use client";

import { useCallback, useState, type ReactNode } from "react";

import { linkUrl } from "@/lib/hackathon/elemental/share";
import { SEAT_RULE, type ShareLinkView } from "@/lib/hackathon/elemental/share-rules";

import { CopyIconButton, lineShareHref, shareMessage } from "./PosterBlock";
import { SeatCard } from "./SeatCard";
import { seatHeadline } from "./seat-card-model";
import { needsName } from "./SeatNote";
import { Body, CodeText, DarkSlab, EditorialLink, Fine, H2, MeterTitle, PrimaryButton, schoolLabel, SecondaryButton, Tag, v } from "./ui";
import { usePollLink } from "./usePoll";

/**
 * "ลิงก์ของฉัน" on the cream pay page: a dark slab of the landing's ground
 * (merged direction §8). Before a link: one line and the way to the share
 * page. With a link: what's left, the mini SeatCard and one action. Unpaid,
 * paying stays the page's main action, so the slab's button is an outline;
 * paid, the slab's action is "ส่งใน LINE". The code row (a friend or teacher
 * types it to give this sign-up a free seat) shows only while unpaid.
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
  lead: `ทุก ${SEAT_RULE.devicesPerSeat} เครื่อง + ${SEAT_RULE.paidPerSeat} คนจ่ายผ่านลิงก์ = ที่นั่งฟรี 1 ที่ ได้สูงสุด ${SEAT_RULE.maxSeatsPerLink} ที่`,
  leadClosed: "ปิดรับสมัครแล้ว ลิงก์แชร์ปิดตามไปด้วย",
  start: "เลือกโรงเรียน ลุ้นที่นั่งฟรี",
  poster: "ส่งโปสเตอร์",
  line: "ส่งใน LINE",
  openPage: "เปิดหน้าลิงก์ของฉัน",
  openClosed: "ดูหน้าลิงก์ของฉัน",
  nameFriend: "ใส่รหัสเพื่อน",
  naming: "ได้ที่นั่งฟรีแล้ว ใส่รหัสเพื่อน",
  checking: "ได้ที่นั่งฟรีแล้ว รอทีมงานเช็ก",
  myCode: "รหัสของฉัน",
  myCodeHint: "เพื่อนหรือครูที่ได้ที่นั่งฟรี ยกให้คุณได้ด้วยรหัสนี้",
  copyCode: "คัดลอกรหัส",
};

function headline(link: ShareLinkView): string {
  const view = link.seats;
  if (view.phase === "open" && needsName(view)) return COPY.naming;
  if (view.phase === "open" && view.seats.some((s) => s.status === "qualified" && s.mine)) return COPY.checking;
  return seatHeadline(view);
}

export function ShareCard({ share, teamRow }: { share: ShareCardData; teamRow?: ReactNode }) {
  const [fetched, setLink] = useState<ShareLinkView | null>(share.link);
  const onLink = useCallback((l: ShareLinkView) => setLink(l), []);
  usePollLink(fetched ? share.pollUrl : null, onLink);
  const open = share.phase === "open";
  // The page's phase wins (a link loaded just before close still reads as closed).
  const link = fetched && !open ? { ...fetched, seats: { ...fetched.seats, phase: "after-close" as const } } : fetched;

  let action: ReactNode = null;
  if (!link) {
    if (open)
      action = share.selfPaid ? (
        <PrimaryButton href={share.href} full arrow>
          {COPY.start}
        </PrimaryButton>
      ) : (
        <SecondaryButton href={share.href} full arrow>
          {COPY.start}
        </SecondaryButton>
      );
  } else if (!open || link.seats.linkRejected) {
    action = (
      <EditorialLink size="sm" href={share.href}>
        {COPY.openClosed}
      </EditorialLink>
    );
  } else if (needsName(link.seats)) {
    action = (
      <PrimaryButton href={share.href} full arrow>
        {COPY.nameFriend}
      </PrimaryButton>
    );
  } else if (share.selfPaid) {
    action = (
      <div className="space-y-3">
        <div className="flex gap-2">
          <PrimaryButton href={lineShareHref(shareMessage(linkUrl(link.kind, link.code)))} external icon="chat" full className="min-w-0 flex-1">
            {COPY.line}
          </PrimaryButton>
          <CopyIconButton text={linkUrl(link.kind, link.code)} />
        </div>
        <EditorialLink size="sm" href={share.href}>
          {COPY.openPage}
        </EditorialLink>
      </div>
    );
  } else {
    action = (
      <SecondaryButton href={share.href} full arrow>
        {COPY.poster}
      </SecondaryButton>
    );
  }

  return (
    <DarkSlab>
      {link ? (
        <>
          <MeterTitle as="h2">{headline(link)}</MeterTitle>
          <Fine className="mt-1">
            {COPY.title} · {schoolLabel(link.school.name)}
          </Fine>
          <div className="mt-5">
            <SeatCard view={link.seats} code={link.code} size="mini" />
          </div>
        </>
      ) : (
        <>
          <H2>{COPY.title}</H2>
          <Body secondary className="mt-2">
            {open ? COPY.lead : COPY.leadClosed}
          </Body>
        </>
      )}

      {action && <div className="mt-5">{action}</div>}

      {teamRow && (
        <div className="mt-6 border-t pt-5" style={{ borderColor: v.rule }}>
          {teamRow}
        </div>
      )}

      {!share.selfPaid && (
        <div className="mt-6 border-t pt-5" style={{ borderColor: v.rule }}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Tag>{COPY.myCode}</Tag>
              <p className="mt-1">
                <CodeText code={share.code} className="text-2xl" />
              </p>
            </div>
            <CopyIconButton text={share.code.toUpperCase()} label={COPY.copyCode} />
          </div>
          <Fine className="mt-2">{COPY.myCodeHint}</Fine>
        </div>
      )}
    </DarkSlab>
  );
}
