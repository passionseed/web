"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { formatThaiDate } from "@/lib/content/shift-cohort";
import { SHARE } from "@/lib/hackathon/elemental/share";
import { reachedDevicesGoal, sharePhase, type ShareLinkView } from "@/lib/hackathon/elemental/share-rules";

import { CodeEntry } from "./CodeEntry";
import { recipientError } from "./copy-shared";
import { PosterBlock } from "./PosterBlock";
import { ShareProgress } from "./Progress";
import { SeatMessage, SeatNote } from "./SeatNote";
import { btnSmall, CodeText, hairline, Lead, outline, Page, schoolLabel, TextLink, Title } from "./ui";
import { usePollLink } from "./usePoll";

/**
 * A teacher's private page (/hackathon/elemental/teacher/<token>): their
 * poster and link, the live numbers, the Demo Day invite at 50 devices, and,
 * if their link is first at the school to 50 devices and 3 paid, the
 * school's free seat for a student they name by code.
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  top: `${ELEMENTAL.edition} Hackathon · ลิงก์ของคุณครู`,
  keep: "หน้านี้เป็นของคุณครูคนเดียว บุ๊กมาร์กไว้กลับมาดูตัวเลข",
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
  },
  inviteTitle: "ได้รับเชิญมา Demo Day",
  inviteWhen: `${formatThaiDate(ELEMENTAL.demoDay.date)} ที่ ${ELEMENTAL.demoDay.venueTh}`,
  invitePending: "ทีมงานจะส่งคำเชิญทางอีเมลหรือ LINE ที่ให้ไว้",
  inviteSent: "ทีมงานส่งคำเชิญแล้ว เช็กอีเมลหรือ LINE ที่ให้ไว้",
  studentLabel: "รหัสนักเรียน",
  studentHint: "นักเรียนดูรหัส 8 ตัวได้ที่หน้าที่นั่งของตัวเอง ต้องเป็นคนที่สมัครแล้วแต่ยังไม่จ่าย",
  studentSubmit: "ให้ที่นั่งฟรี",
  student: "นักเรียน",
  rename: "ใส่รหัสผิด เปลี่ยนรหัส",
  posterHeading: "โปสเตอร์ของคุณครู",
  posterLead: "QR บนโปสเตอร์คือลิงก์ของคุณครู ใครสแกนหรือกดลิงก์ ตัวเลขด้านบนจะขึ้น",
  rulesHeading: "กติกา",
  rules: [
    "นับเป็นเครื่อง เปิดซ้ำจากเครื่องเดิมนับครั้งเดียว",
    "นับคนจ่ายจากนักเรียนที่สแกน QR หรือกดลิงก์ของคุณครู แล้วสมัครและจ่าย",
    `ครบ ${SHARE.devicesGoal} เครื่อง ได้รับเชิญมา Demo Day`,
    "ที่นั่งฟรีมีโรงเรียนละ 1 ที่ ลิงก์แรกที่ครบทั้งสองอย่างได้ นับทั้งลิงก์ครูและลิงก์นักเรียน",
    "ทีมงานเช็กก่อนให้ที่นั่งทุกครั้ง",
    `แชร์ได้ถึงวันปิดรับสมัคร ${formatThaiDate(ELEMENTAL.registrationClosesOn)}`,
  ],
  copyPage: "คัดลอกลิงก์หน้านี้",
  copied: "คัดลอกแล้ว",
  closedTitle: "ลิงก์ของคุณครู",
  closed: "ตอนนี้ปิดแล้ว",
  more: `ดูหน้า ${ELEMENTAL.edition} Hackathon`,
};

function titleFor(link: ShareLinkView): string {
  const t = COPY.titles;
  const s = link.seat;
  const invited = reachedDevicesGoal(link.progress);
  if (s.state === "checking") return s.recipient.who === "other" ? t.named : t.seat;
  if (s.state === "given") return t.given;
  if (s.state === "rejected") return t.rejected;
  if (invited) return t.invited;
  if (s.state === "taken") return t.taken;
  return t[sharePhase(link.progress)];
}

/** The Demo Day invite. Its own title only when the page's title is about something else. */
function InviteBlock({ invited, main }: { invited: boolean; main: boolean }) {
  return (
    <SeatNote tone={main ? "flame" : "plain"}>
      {!main && (
        <p className="mb-1 text-2xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
          {COPY.inviteTitle}
        </p>
      )}
      <p className="text-lg font-semibold">{COPY.inviteWhen}</p>
      <p className="mt-2 flex items-start gap-1.5 text-base" style={{ color: EL.inkSoft }}>
        {invited && <Check className="mt-1 h-4 w-4 shrink-0" style={{ color: EL.flame }} strokeWidth={2.5} />}
        {invited ? COPY.inviteSent : COPY.invitePending}
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
        <button type="button" onClick={() => setRenaming(true)} className="mt-3 text-sm underline underline-offset-4" style={{ color: EL.inkSoft }}>
          {COPY.rename}
        </button>
      )}
    </SeatNote>
  );
}

function CopyPageLink() {
  const [copied, setCopied] = useState(false);
  const [href, setHref] = useState("");
  useEffect(() => setHref(window.location.href.split("?")[0]), []);
  return (
    <button
      type="button"
      disabled={!href}
      onClick={async () => {
        await navigator.clipboard?.writeText(href).catch(() => undefined);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className={btnSmall}
      style={outline}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? COPY.copied : COPY.copyPage}
    </button>
  );
}

export function TeacherView({
  token,
  open,
  link: initial,
  posterVersion,
  demo,
}: {
  token: string;
  open: boolean;
  link: ShareLinkView | null;
  posterVersion: string;
  demo?: boolean;
}) {
  const [link, setLink] = useState<ShareLinkView | null>(initial);
  const onLink = useCallback((l: ShareLinkView) => setLink(l), []);
  usePollLink(link && open && !demo ? `/api/hackathon/elemental/teacher/${token}` : null, onLink);

  const footer = (
    <div className="mt-12">
      <TextLink href="/hackathon/elemental">{COPY.more}</TextLink>
    </div>
  );

  if (!open || !link) {
    return (
      <Page top={COPY.top} footer={footer}>
        <Title>{COPY.closedTitle}</Title>
        <Lead>{COPY.closed}</Lead>
      </Page>
    );
  }

  const invited = reachedDevicesGoal(link.progress) && link.seat.state !== "rejected";
  const title = titleFor(link);
  const seatGone = link.seat.state === "taken" || link.seat.state === "rejected";
  return (
    <Page top={COPY.top} footer={footer}>
      <Title>{title}</Title>
      <p className="mt-3 text-lg">{schoolLabel(link.school.name, link.school.province)}</p>
      <p className="mt-1 text-sm" style={{ color: EL.inkSoft }}>
        {COPY.keep}
      </p>

      <div className="mt-6 space-y-6">
        {link.seat.state !== "taken" && <SeatBlock token={token} link={link} demo={demo} onLink={onLink} />}
        {invited && <InviteBlock invited={link.invited} main={title === COPY.titles.invited} />}
        {link.seat.state === "taken" && <SeatBlock token={token} link={link} demo={demo} onLink={onLink} />}
        <ShareProgress progress={link.progress} kind="teacher" live={!demo} seatGone={seatGone} />
      </div>

      <section className="mt-10 space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold">{COPY.posterHeading}</h2>
          <span className="text-sm" style={{ color: EL.inkSoft }}>
            No. <CodeText code={link.code} />
          </span>
        </div>
        <p style={{ color: EL.inkSoft }}>{COPY.posterLead}</p>
        <PosterBlock code={link.code} kind="teacher" posterVersion={posterVersion} />
      </section>

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

      <div className="mt-10 border-t pt-6" style={{ borderColor: hairline }}>
        <CopyPageLink />
      </div>
    </Page>
  );
}
