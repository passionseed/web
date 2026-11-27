"use client";

import { useCallback, useEffect, useState } from "react";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { formatThaiDate } from "@/lib/content/shift-cohort";
import { PER_NETWORK_CAP } from "@/lib/hackathon/elemental/link-views-shared";
import { SHARE } from "@/lib/hackathon/elemental/share";
import { SEAT_RULE, TEACHER_INVITE_DEVICES, type ShareLinkView } from "@/lib/hackathon/elemental/share-rules";

import { recipientError } from "./copy-shared";
import { CopyIconButton, lineShareHref, Poster, ShareBar, usePosterShare } from "./PosterBlock";
import { SeatCard } from "./SeatCard";
import { inviteState, seatHeadline } from "./seat-card-model";
import { needsName, SeatList } from "./SeatNote";
import { Rules } from "./Rules";
import { Body, EditorialLink, Fine, H1, Page, PixelIcon, PrimaryButton, schoolLabel, SkyBand, StickyBar, v } from "./ui";
import { usePollLink } from "./usePoll";

/**
 * A teacher's private page (/hackathon/elemental/teacher/<token>), on the
 * dark ground like the student's: their poster and link, the SeatCard with a
 * Demo Day stub (50 devices, after staff confirm with the school), and every
 * 50 devices + 1 paid a free seat for a student they name by code, up to 2.
 * Right after the link is made, one screen asks them to keep the page in their
 * own LINE first (LINE's browser has no bookmarks). After sign-up closes it
 * stays up read-only until the end of Demo Day.
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  keepTitle: "เก็บหน้านี้ไว้ใน LINE",
  keepLead: "หน้านี้เป็นของคุณครูคนเดียว ส่งเข้า LINE ตัวเองไว้ จะได้กลับมาดูตัวเลขได้",
  keepNote: "ลิงก์หน้านี้เป็นของคุณครูคนเดียว อย่าส่งต่อ",
  toLine: "ส่งเข้า LINE ตัวเอง →",
  skip: "ข้าม",
  copyPage: "คัดลอกลิงก์หน้านี้",
  keepLater: "เก็บหน้านี้ไว้ใน LINE",
  lineText: (url: string) => `ลิงก์ของคุณครู ${ELEMENTAL.edition} Hackathon (ส่วนตัว อย่าส่งต่อ): ${url}`,
  titles: {
    start: "ส่งลิงก์ให้นักเรียนเลย",
    toInvite: (n: number) => `อีก ${n} เครื่อง ถึง Demo Day`,
    invited: "ได้รับเชิญมา Demo Day แล้ว",
    naming: "เลือกนักเรียนรับที่นั่งฟรี",
  },
  barLine: "ส่งให้นักเรียนใน LINE",
  invite: {
    when: `Demo Day ${formatThaiDate(ELEMENTAL.demoDay.date, false)} ที่ ${ELEMENTAL.demoDay.venueTh}`,
    earned: "ทีมงานจะยืนยันกับโรงเรียนก่อน แล้วส่งคำเชิญทางอีเมลหรือ LINE ที่ให้ไว้",
    verified: "ยืนยันกับโรงเรียนแล้ว ทีมงานจะส่งคำเชิญทางอีเมลหรือ LINE ที่ให้ไว้",
    sent: "ทีมงานส่งคำเชิญแล้ว เช็กอีเมลหรือ LINE ที่ให้ไว้",
  },
  student: "นักเรียน",
  frozenNote: "ปิดรับสมัครแล้ว ตัวเลขหยุดนับตอนปิด หน้านี้เปิดดูได้ถึงวัน Demo Day",
  rules: [
    `ครบ ${TEACHER_INVITE_DEVICES} เครื่อง ได้รับเชิญมา Demo Day ทีมงานยืนยันกับโรงเรียนก่อนส่งคำเชิญ`,
    `ทุก ${SEAT_RULE.devicesPerSeat} เครื่อง + ${SEAT_RULE.paidPerSeat} คนจ่าย = ที่นั่งฟรี 1 ที่ ให้นักเรียนที่คุณครูเลือก ได้สูงสุด ${SEAT_RULE.maxSeatsPerLink} ที่`,
    "นับเป็นเครื่อง เปิดซ้ำจากเครื่องเดิมนับครั้งเดียว",
    `wifi เดียวกันนับได้ไม่เกิน ${PER_NETWORK_CAP} เครื่อง`,
    "นับคนจ่ายจากนักเรียนที่สแกน QR หรือกดลิงก์ของคุณครู แล้วสมัครและจ่าย",
    "ทีมงานเช็กก่อนให้ที่นั่งทุกครั้ง",
    `แชร์ได้ถึงวันปิดรับสมัคร ${formatThaiDate(ELEMENTAL.registrationClosesOn)}`,
    `ตัวเลขอัปเดตเองทุก ${SHARE.pollMs / 1000} วินาที`,
  ],
  closedTitle: "ลิงก์ของคุณครู",
  closed: "ตอนนี้ปิดแล้ว",
};

function titleFor(link: ShareLinkView, open: boolean): string {
  const t = COPY.titles;
  const view = link.seats;
  if (!open) return seatHeadline(view);
  if (needsName(view)) return t.naming;
  if (view.maxed || view.seats.length > 0) return seatHeadline(view);
  if (view.devices === 0 && view.paid === 0) return t.start;
  if (view.devices < TEACHER_INVITE_DEVICES) return t.toInvite(TEACHER_INVITE_DEVICES - view.devices);
  return t.invited;
}

/** This page's own address (no ?new=1), once on the client. */
function usePageUrl(): string {
  const [href, setHref] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setHref(`${window.location.origin}${window.location.pathname}`), 0);
    return () => clearTimeout(t);
  }, []);
  return href;
}

/** Right after the link is made: one screen, one action. Keep the page in their own LINE, or skip. */
function KeepScreen({ onDone }: { onDone: () => void }) {
  const href = usePageUrl();
  return (
    <Page
      surface="ground"
      sky={<SkyBand title={<H1>{COPY.keepTitle}</H1>} lead={COPY.keepLead} />}
      bar={
        <StickyBar>
          {href ? (
            <PrimaryButton
              href={lineShareHref(COPY.lineText(href))}
              external
              icon="chat"
              full
              className="min-w-0 flex-1"
              // LINE opens in its own picker; when they come back, the page is waiting.
              onClick={() => setTimeout(onDone, 400)}
            >
              {COPY.toLine}
            </PrimaryButton>
          ) : (
            <PrimaryButton icon="chat" full className="min-w-0 flex-1" disabled>
              {COPY.toLine}
            </PrimaryButton>
          )}
          <CopyIconButton text={href} label={COPY.copyPage} />
        </StickyBar>
      }
      wordmark={false}
    >
      <Fine>{COPY.keepNote}</Fine>
      <div className="mt-6">
        <EditorialLink size="sm" onClick={onDone}>
          {COPY.skip}
        </EditorialLink>
      </div>
    </Page>
  );
}

/** The Demo Day invite, in one line under the card (the stub in the card's earned row is the picture of it). */
function InviteLine({ link }: { link: ShareLinkView }) {
  const state = inviteState(link.seats, link);
  if (state === "todo") return null;
  return (
    <div className="flex gap-3 border-t pt-4" style={{ borderColor: v.rule }}>
      <span className="mt-1 shrink-0" style={{ color: v.action }}>
        <PixelIcon name="ticket" />
      </span>
      <div>
        <Body>{COPY.invite.when}</Body>
        <Body secondary>{COPY.invite[state]}</Body>
      </div>
    </div>
  );
}

/** The link's earned seats, each given to a student the teacher names by code. */
function Seats({ token, link, demo, onLink }: { token: string; link: ShareLinkView; demo?: boolean; onLink: (l: ShareLinkView) => void }) {
  const nameStudent = async (index: number, code: string): Promise<string | null> => {
    if (demo) {
      onLink({
        ...link,
        seats: { ...link.seats, seats: link.seats.seats.map((x) => (x.index === index ? { index, status: "qualified" as const, recipientCode: code } : x)) },
      });
      return null;
    }
    try {
      const res = await fetch(`/api/hackathon/elemental/teacher/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatIndex: index, studentCode: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return recipientError(data.error, COPY.student);
      onLink(data.link as ShareLinkView);
      return null;
    } catch {
      return recipientError(undefined, COPY.student);
    }
  };
  return <SeatList kind="teacher" view={link.seats} onName={nameStudent} />;
}

function TeacherLink({
  token,
  phase,
  link,
  posterVersion,
  demo,
  onLink,
}: {
  token: string;
  phase: "open" | "after-close";
  link: ShareLinkView;
  posterVersion: string;
  demo?: boolean;
  onLink: (l: ShareLinkView) => void;
}) {
  const open = phase === "open";
  const poster = usePosterShare(link.code, "teacher", posterVersion);
  const href = usePageUrl();
  // The page's phase wins (a link loaded just before close still reads as closed).
  const view = open ? link.seats : { ...link.seats, phase: "after-close" as const };
  const shown = { ...link, seats: view };
  const naming = needsName(view);
  const start = open && view.seats.length === 0 && view.devices === 0 && view.paid === 0;

  const card = (
    <div className="space-y-5">
      <SeatCard view={view} code={link.code} kind="teacher" invite={link} />
      <InviteLine link={shown} />
    </div>
  );
  const seats = <Seats token={token} link={link} demo={demo} onLink={onLink} />;
  const posterBlock = open ? <Poster poster={poster} /> : null;
  const blocks = naming ? [seats, card, posterBlock] : start ? [posterBlock, card] : [card, seats, posterBlock];

  return (
    <Page
      surface="ground"
      sky={<SkyBand title={<H1>{titleFor(shown, open)}</H1>} lead={schoolLabel(link.school.name, link.school.province)} />}
      bar={open && !naming ? <ShareBar poster={poster} label={COPY.barLine} /> : undefined}
    >
      {!open && <Fine className="mb-6">{COPY.frozenNote}</Fine>}
      <div className="space-y-10">{blocks.map((b, i) => (b ? <div key={i}>{b}</div> : null))}</div>
      <Rules rules={COPY.rules} />
      <div className="mt-8">
        {href && (
          <EditorialLink size="sm" href={lineShareHref(COPY.lineText(href))} external>
            {COPY.keepLater}
          </EditorialLink>
        )}
      </div>
    </Page>
  );
}

export function TeacherView({
  token,
  phase,
  link: initial,
  posterVersion,
  demo,
  fresh = false,
}: {
  token: string;
  phase: "open" | "after-close" | "off";
  link: ShareLinkView | null;
  posterVersion: string;
  demo?: boolean;
  /** Just made (?new=1): keeping the page comes first. */
  fresh?: boolean;
}) {
  const [link, setLink] = useState<ShareLinkView | null>(initial);
  const [keeping, setKeeping] = useState(fresh);
  const onLink = useCallback((l: ShareLinkView) => setLink(l), []);
  usePollLink(link && phase !== "off" && !demo ? `/api/hackathon/elemental/teacher/${token}` : null, onLink);

  if (phase === "off" || !link) {
    return (
      <Page surface="ground" sky={<SkyBand title={<H1>{COPY.closedTitle}</H1>} lead={COPY.closed} />}>
        <EditorialLink href="/hackathon/elemental">{ELEMENTAL.edition} Hackathon</EditorialLink>
      </Page>
    );
  }
  if (keeping) {
    return (
      <KeepScreen
        onDone={() => {
          // Done with ?new=1: a refresh opens the page itself.
          window.history.replaceState(null, "", window.location.pathname + window.location.search.replace(/([?&])new=1(&|$)/, "$1").replace(/[?&]$/, ""));
          window.scrollTo(0, 0);
          setKeeping(false);
        }}
      />
    );
  }
  return <TeacherLink token={token} phase={phase} link={link} posterVersion={posterVersion} demo={demo} onLink={onLink} />;
}
