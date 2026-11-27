"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { formatThaiDate } from "@/lib/content/shift-cohort";
import { SHARE } from "@/lib/hackathon/elemental/share";
import { progressPhase, reachedDevicesGoal, type ShareLinkView } from "@/lib/hackathon/elemental/share-rules";

import { CodeEntry } from "./CodeEntry";
import { recipientError } from "./copy-shared";
import { PosterBlock, ShareBar, usePosterShare } from "./PosterBlock";
import { meterModeFor, SeatMeter } from "./Progress";
import { SeatMessage, SeatNote } from "./SeatNote";
import { btn, CodeText, filled, Lead, outline, Page, schoolLabel, TextButton, TextLink, Title } from "./ui";
import { usePollLink } from "./usePoll";

/**
 * A teacher's private page (/hackathon/elemental/teacher/<token>): their
 * poster and link, the live numbers, the Demo Day invite at 50 devices (after
 * staff confirm with the school), and, if their link is first at the school
 * to 50 devices and 3 paid, the school's free seat for a student they name by
 * code. After sign-up closes it stays up read-only until the end of Demo Day.
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  top: `${ELEMENTAL.edition} Hackathon · ลิงก์ของคุณครู`,
  keepTitle: "สร้างลิงก์แล้ว",
  keep: "หน้านี้เป็นของคุณครูคนเดียว ส่งลิงก์หน้านี้เข้า LINE ตัวเองไว้ จะได้กลับมาดูตัวเลขได้",
  keepLater: "หน้านี้เป็นของคุณครูคนเดียว เก็บลิงก์ไว้ใน LINE ตัวเอง จะได้กลับมาดูตัวเลขได้",
  toLine: "ส่งลิงก์หน้านี้เข้า LINE ตัวเอง",
  lineText: (url: string) => `ลิงก์ของคุณครู ${ELEMENTAL.edition} Hackathon (ส่วนตัว อย่าส่งต่อ): ${url}`,
  copyPage: "คัดลอกลิงก์หน้านี้",
  copied: "คัดลอกแล้ว",
  titles: {
    start: "ส่งลิงก์ให้นักเรียนเลย",
    early: "แชร์ต่อเลย",
    close: "อีกนิดเดียว",
    done: "ครบแล้ว รอทีมงานเช็ก",
    invited: "คุณครูได้รับเชิญมา Demo Day",
    seat: "เลือกนักเรียนรับที่นั่งฟรี",
    named: "รอทีมงานเช็ก",
    given: "ให้ที่นั่งฟรีแล้ว",
    taken: "ที่นั่งฟรีของโรงเรียนนี้มีคนได้แล้ว",
    rejected: "ลิงก์นี้ไม่ได้ที่นั่งฟรี",
    closed: "ปิดนับแล้ว",
  },
  barLine: "ส่งให้นักเรียนใน LINE",
  inviteTitle: "ได้รับเชิญมา Demo Day",
  inviteWhen: `${formatThaiDate(ELEMENTAL.demoDay.date)} ที่ ${ELEMENTAL.demoDay.venueTh}`,
  invitePending: "ทีมงานจะยืนยันกับโรงเรียนก่อน แล้วส่งคำเชิญทางอีเมลหรือ LINE ที่ให้ไว้",
  inviteVerified: "ยืนยันกับโรงเรียนแล้ว ทีมงานจะส่งคำเชิญทางอีเมลหรือ LINE ที่ให้ไว้",
  inviteSent: "ทีมงานส่งคำเชิญแล้ว เช็กอีเมลหรือ LINE ที่ให้ไว้",
  studentLabel: "รหัสนักเรียน",
  studentHint: "นักเรียนดูรหัส 8 ตัวได้ที่หน้าที่นั่งของตัวเอง ต้องเป็นคนที่สมัครแล้วแต่ยังไม่จ่าย",
  studentSubmit: "ให้ที่นั่งฟรี",
  student: "นักเรียน",
  rename: "ใส่รหัสผิด เปลี่ยนรหัส",
  posterHeading: "โปสเตอร์ของคุณครู",
  posterLead: "QR บนโปสเตอร์คือลิงก์ของคุณครู ใครสแกนหรือกดลิงก์ ตัวเลขด้านบนจะขึ้น",
  frozenNote: "ปิดรับสมัครแล้ว ตัวเลขหยุดนับตอนปิด หน้านี้เปิดดูได้ถึงวัน Demo Day",
  rulesHeading: "กติกา",
  rules: [
    "นับเป็นเครื่อง เปิดซ้ำจากเครื่องเดิมนับครั้งเดียว",
    "นับคนจ่ายจากนักเรียนที่สแกน QR หรือกดลิงก์ของคุณครู แล้วสมัครและจ่าย",
    `ครบ ${SHARE.devicesGoal} เครื่อง ได้รับเชิญมา Demo Day ทีมงานยืนยันกับโรงเรียนก่อนส่งคำเชิญ`,
    `ที่นั่งฟรีมีโรงเรียนละ 1 ที่ ลิงก์แรกที่ครบ ${SHARE.devicesGoal} เครื่องและ ${SHARE.paidGoal} คนจ่ายได้ นับทั้งลิงก์ครูและลิงก์นักเรียน`,
    "ทีมงานเช็กก่อนให้ที่นั่งทุกครั้ง",
    `แชร์ได้ถึงวันปิดรับสมัคร ${formatThaiDate(ELEMENTAL.registrationClosesOn)}`,
  ],
  closedTitle: "ลิงก์ของคุณครู",
  closed: "ตอนนี้ปิดแล้ว",
  more: `ดูหน้า ${ELEMENTAL.edition} Hackathon`,
};

function titleFor(link: ShareLinkView, open: boolean): string {
  const t = COPY.titles;
  const s = link.seat;
  const invited = reachedDevicesGoal(link.progress);
  if (!open && s.state === "open") return invited ? t.invited : t.closed;
  if (s.state === "checking") return s.recipient.who === "other" ? t.named : t.seat;
  if (s.state === "given") return t.given;
  if (s.state === "rejected") return t.rejected;
  if (invited) return t.invited;
  if (s.state === "taken") return t.taken;
  return t[progressPhase(link.progress)];
}

/** The Demo Day invite. Its own title only when the page's title is about something else. */
function InviteBlock({ link, main }: { link: ShareLinkView; main: boolean }) {
  const line = link.invited ? COPY.inviteSent : link.verified ? COPY.inviteVerified : COPY.invitePending;
  return (
    <SeatNote tone={main ? "flame" : "plain"}>
      {!main && (
        <p className="mb-1 text-2xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
          {COPY.inviteTitle}
        </p>
      )}
      <p className="text-lg font-semibold">{COPY.inviteWhen}</p>
      <p className="mt-2 flex items-start gap-1.5 text-base" style={{ color: EL.inkSoft }}>
        {(link.invited || link.verified) && <Check className="mt-1 h-4 w-4 shrink-0" style={{ color: EL.flame }} strokeWidth={2.5} />}
        {line}
      </p>
    </SeatNote>
  );
}

function SeatBlock({ token, link, demo, onLink }: { token: string; link: ShareLinkView; demo?: boolean; onLink: (l: ShareLinkView) => void }) {
  const [renaming, setRenaming] = useState(false);
  const s = link.seat;
  if (s.state === "open") return null;

  const nameStudent = async (code: string): Promise<string | null> => {
    if (demo) {
      onLink({ ...link, seat: { state: "checking", recipient: { who: "other", code } } });
      setRenaming(false);
      return null;
    }
    try {
      const res = await fetch(`/api/hackathon/elemental/teacher/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentCode: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return recipientError(data.error, COPY.student);
      onLink(data.link as ShareLinkView);
      setRenaming(false);
      return null;
    } catch {
      return recipientError(undefined, COPY.student);
    }
  };

  const naming = s.state === "checking" && (s.recipient.who === "none" || renaming);
  return (
    <SeatNote tone={s.state === "checking" || s.state === "given" ? "flame" : "plain"}>
      <SeatMessage kind="teacher" seat={s} />
      {naming && (
        <div className="mt-5">
          <CodeEntry label={COPY.studentLabel} hint={COPY.studentHint} submitLabel={COPY.studentSubmit} onSubmit={nameStudent} />
        </div>
      )}
      {!naming && s.state === "checking" && s.recipient.who === "other" && (
        <div className="mt-3">
          <TextButton onClick={() => setRenaming(true)}>{COPY.rename}</TextButton>
        </div>
      )}
    </SeatNote>
  );
}

/**
 * Keep the private page: send it to their own LINE (LINE's browser has no
 * bookmarks), or copy it. Up top right after the link is made, at the bottom later.
 */
function KeepPage({ fresh }: { fresh: boolean }) {
  const [href, setHref] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setHref(`${window.location.origin}${window.location.pathname}`), []);
  return (
    <section className="space-y-3 rounded-2xl border p-5" style={fresh ? { borderColor: EL.flame, backgroundColor: "rgba(236,100,36,0.06)" } : { borderColor: "rgba(29,33,31,0.12)" }}>
      {fresh && (
        <p className="text-2xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
          {COPY.keepTitle}
        </p>
      )}
      <p className="text-base" style={{ color: fresh ? EL.ink : EL.inkSoft }}>
        {fresh ? COPY.keep : COPY.keepLater}
      </p>
      <a
        href={href ? `https://line.me/R/share?text=${encodeURIComponent(COPY.lineText(href))}` : undefined}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btn} w-full`}
        style={fresh ? filled : outline}
      >
        <Share2 className="h-4 w-4" /> {COPY.toLine}
      </a>
      <button
        type="button"
        disabled={!href}
        onClick={async () => {
          await navigator.clipboard?.writeText(href).catch(() => undefined);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className={`${btn} w-full`}
        style={outline}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? COPY.copied : COPY.copyPage}
      </button>
    </section>
  );
}

function TeacherLink({
  token,
  phase,
  link,
  posterVersion,
  demo,
  fresh,
  onLink,
}: {
  token: string;
  phase: "open" | "after-close";
  link: ShareLinkView;
  posterVersion: string;
  demo?: boolean;
  fresh: boolean;
  onLink: (l: ShareLinkView) => void;
}) {
  const open = phase === "open";
  const poster = usePosterShare(link.code, "teacher", posterVersion);
  const mode = meterModeFor(link, open);
  const invited = reachedDevicesGoal(link.progress) && link.seat.state !== "rejected";
  const title = titleFor(link, open);
  // Right after the link is made, the keep-this-page block has its own LINE button: no second one pinned below it.
  const keepRef = useRef<HTMLDivElement>(null);
  const [keepVisible, setKeepVisible] = useState(fresh);
  useEffect(() => {
    const el = keepRef.current;
    if (!fresh || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setKeepVisible(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [fresh]);
  const start = open && link.seat.state === "open" && progressPhase(link.progress) === "start";

  const posterSection = open && (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold">{COPY.posterHeading}</h2>
        <span className="text-sm" style={{ color: EL.inkSoft }}>
          No. <CodeText code={link.code} />
        </span>
      </div>
      <p style={{ color: EL.inkSoft }}>{COPY.posterLead}</p>
      <PosterBlock poster={poster} />
    </section>
  );
  const meter = <SeatMeter progress={link.progress} kind="teacher" mode={mode} race={link.race} live={open && !demo} frozen={!open} />;

  return (
    <Page
      top={COPY.top}
      footer={
        <div className="mt-12">
          <TextLink href="/hackathon/elemental">{COPY.more}</TextLink>
        </div>
      }
      bar={open && link.seat.state === "open" && !keepVisible ? <ShareBar poster={poster} lineLabel={COPY.barLine} /> : undefined}
    >
      {fresh && (
        <div className="mb-8" ref={keepRef}>
          <KeepPage fresh />
        </div>
      )}
      <Title>{title}</Title>
      <p className="mt-3 text-lg">{schoolLabel(link.school.name, link.school.province)}</p>
      {!open && <p className="mt-2 text-sm" style={{ color: EL.inkSoft }}>{COPY.frozenNote}</p>}

      <div className="mt-6 space-y-6">
        {link.seat.state !== "taken" && <SeatBlock token={token} link={link} demo={demo} onLink={onLink} />}
        {invited && <InviteBlock link={link} main={title === COPY.titles.invited} />}
        {link.seat.state === "taken" && <SeatBlock token={token} link={link} demo={demo} onLink={onLink} />}
        {start ? posterSection : meter}
      </div>

      {open && <div className="mt-10">{start ? meter : posterSection}</div>}

      <section className="mt-12 space-y-3">
        <h2 className="text-xl font-semibold">{COPY.rulesHeading}</h2>
        <ul className="space-y-1.5 text-base" style={{ color: EL.inkSoft }}>
          {COPY.rules.map((r) => (
            <li key={r} className="flex gap-2">
              <span aria-hidden="true">·</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>

      {!fresh && (
        <div className="mt-10">
          <KeepPage fresh={false} />
        </div>
      )}
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
  const onLink = useCallback((l: ShareLinkView) => setLink(l), []);
  usePollLink(link && phase !== "off" && !demo ? `/api/hackathon/elemental/teacher/${token}` : null, onLink);

  if (phase === "off" || !link) {
    return (
      <Page
        top={COPY.top}
        footer={
          <div className="mt-12">
            <TextLink href="/hackathon/elemental">{COPY.more}</TextLink>
          </div>
        }
      >
        <Title>{COPY.closedTitle}</Title>
        <Lead>{COPY.closed}</Lead>
      </Page>
    );
  }
  return <TeacherLink token={token} phase={phase} link={link} posterVersion={posterVersion} demo={demo} fresh={fresh} onLink={onLink} />;
}
