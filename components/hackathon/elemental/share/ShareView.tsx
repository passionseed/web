"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";

import { EL } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { formatThaiDate } from "@/lib/content/shift-cohort";
import { SHARE, SHARE_DEMO_CODE } from "@/lib/hackathon/elemental/share";
import { sharePhase, type ShareLinkView } from "@/lib/hackathon/elemental/share-rules";

import { CodeEntry } from "./CodeEntry";
import { lineHelp, recipientError } from "./copy-shared";
import { PosterBlock } from "./PosterBlock";
import { ShareProgress } from "./Progress";
import { SchoolPicker, type SchoolChoice } from "./SchoolPicker";
import { SeatMessage, SeatNote } from "./SeatNote";
import { btn, CodeText, ErrorLine, filled, Lead, Page, schoolLabel, TextLink, Title } from "./ui";
import { usePollLink } from "./usePoll";

/**
 * A signed-up student's share page (Big, 2026-11-27): pick your school, get
 * your own poster and link, watch the numbers fill. 50 devices and 3 paid
 * sign-ups from your link, first at your school: the school's free seat.
 * Paid or not, anyone signed up can share; a paid student gives the seat to
 * an unpaid friend by the friend's code.
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  top: `${ELEMENTAL.edition} Hackathon · แชร์รับที่นั่งฟรี`,
  pickTitle: "แชร์รับที่นั่งฟรี",
  changeTitle: "เปลี่ยนโรงเรียน",
  steps: [
    "เลือกโรงเรียน ได้โปสเตอร์ที่มี QR ของคุณเอง",
    "ส่งในกลุ่ม LINE ของโรงเรียน หรือให้เพื่อนช่วยส่งต่อ",
    `ครบ ${SHARE.devicesGoal} เครื่อง และ ${SHARE.paidGoal} คนจ่าย ได้ที่นั่งฟรี 1 ที่ โรงเรียนละ 1 ที่ ใครครบก่อนได้ก่อน`,
  ],
  paidNote: "จ่ายแล้วก็แชร์ได้ ถ้าครบก่อน ยกที่นั่งฟรีให้เพื่อนที่ยังไม่จ่าย",
  pickHeading: "โรงเรียนของคุณ",
  confirm: "ยืนยัน แล้วรับโปสเตอร์",
  confirmChange: "เปลี่ยนเป็นโรงเรียนนี้",
  saving: "กำลังบันทึก…",
  cancelChange: "ไม่เปลี่ยนแล้ว",
  change: "เปลี่ยนโรงเรียน",
  titles: {
    start: "ส่งโปสเตอร์ของคุณเลย",
    early: "แชร์ต่อเลย",
    close: "อีกนิดเดียว",
    done: "ครบแล้ว รอทีมงานเช็ก",
    checkingSelf: "ครบแล้ว รอทีมงานเช็ก",
    checkingNone: "ครบแล้ว ยกที่นั่งให้เพื่อน",
    checkingOther: "รอทีมงานเช็ก",
    givenSelf: "ได้ที่นั่งฟรีแล้ว",
    givenOther: "ยกที่นั่งให้เพื่อนแล้ว",
    taken: "ที่นั่งฟรีของโรงเรียนนี้มีคนได้แล้ว",
    rejected: "ลิงก์นี้ไม่ได้ที่นั่งฟรี",
  },
  friendLabel: "รหัสของเพื่อน",
  friendHint: "ขอรหัส 8 ตัวจากหน้าที่นั่งของเพื่อน ต้องเป็นคนที่สมัครแล้วแต่ยังไม่จ่าย",
  friendSubmit: "ยกที่นั่งให้เพื่อน",
  friend: "เพื่อน",
  rename: "ใส่รหัสผิด เปลี่ยนรหัส",
  mySeat: "ดูที่นั่งของฉัน",
  posterHeading: "โปสเตอร์ของคุณ",
  posterLead: "QR บนโปสเตอร์คือลิงก์ของคุณ ใครสแกนหรือกดลิงก์ ตัวเลขด้านบนจะขึ้น",
  rulesHeading: "กติกา",
  rules: [
    "นับเป็นเครื่อง เปิดซ้ำจากเครื่องเดิมนับครั้งเดียว",
    "นับคนจ่ายจากคนที่สแกน QR หรือกดลิงก์ของคุณ แล้วสมัครและจ่าย",
    "โรงเรียนละ 1 ที่ ลิงก์แรกที่ครบได้ ทั้งลิงก์นักเรียนและลิงก์ครู",
    "ทีมงานเช็กก่อนให้ที่นั่งทุกครั้ง",
    `แชร์ได้ถึงวันปิดรับสมัคร ${formatThaiDate(ELEMENTAL.registrationClosesOn)}`,
  ],
  back: "กลับไปหน้าที่นั่งของฉัน",
  closedTitle: "แชร์รับที่นั่งฟรี",
  closed: "ตอนนี้ยังไม่เปิด",
  cancelled: "การสมัครนี้ถูกยกเลิก แชร์รับที่นั่งไม่ได้",
  schoolError: {
    locked: `เปลี่ยนโรงเรียนไม่ได้แล้ว เพราะลิงก์เริ่มมีคนเปิด ${lineHelp}`,
    code_taken: `สร้างลิงก์ไม่ได้ ${lineHelp}`,
    invalid: "ใช้ชื่อโรงเรียนนี้ไม่ได้ ลองพิมพ์ใหม่",
    closed: "ตอนนี้ปิดแล้ว",
  } as Record<string, string>,
  tryAgain: "ยังบันทึกไม่ได้ ลองอีกครั้ง",
};

type Props = {
  token: string;
  state: "open" | "closed" | "cancelled";
  link: ShareLinkView | null;
  /** Whether this sign-up has paid; for the words before a link exists. */
  selfPaid: boolean;
  /** The school typed at sign-up, to start the search with. */
  startQuery: string;
  posterVersion: string;
  demo?: boolean;
};

function titleFor(link: ShareLinkView): string {
  const t = COPY.titles;
  const s = link.seat;
  if (s.state === "taken") return t.taken;
  if (s.state === "rejected") return t.rejected;
  if (s.state === "checking") return s.recipient.who === "self" ? t.checkingSelf : s.recipient.who === "none" ? t.checkingNone : t.checkingOther;
  if (s.state === "given") return s.recipient.who === "self" ? t.givenSelf : t.givenOther;
  return t[sharePhase(link.progress)];
}

/** Steps for a student with no link yet. */
function HowItWorks({ selfPaid }: { selfPaid: boolean }) {
  return (
    <div className="mt-6 space-y-3">
      <ol className="space-y-3">
        {COPY.steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-base">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
              style={{ backgroundColor: i === 2 ? EL.flame : EL.ink, color: i === 2 ? EL.flameWhite : EL.cream }}
            >
              {i + 1}
            </span>
            <span className="pt-0.5">{s}</span>
          </li>
        ))}
      </ol>
      {selfPaid && <p style={{ color: EL.inkSoft }}>{COPY.paidNote}</p>}
    </div>
  );
}

/** Pick (or change) the school, then save it. */
function PickSchool({
  token,
  startQuery,
  changing,
  demo,
  onSaved,
  onCancel,
}: {
  token: string;
  startQuery: string;
  changing: boolean;
  demo?: boolean;
  onSaved: (link: ShareLinkView) => void;
  onCancel?: () => void;
}) {
  const [pick, setPick] = useState<SchoolChoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!pick) return;
    setBusy(true);
    setError(null);
    try {
      if (demo) {
        return onSaved({
          kind: "student",
          code: SHARE_DEMO_CODE,
          school: { name: pick.name, province: pick.province || null },
          progress: { devices: 0, paid: 0 },
          seat: { state: "open" },
          canChangeSchool: true,
          selfPaid: false,
          invited: false,
        });
      }
      const res = await fetch(`/api/hackathon/elemental/${token}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("custom" in pick ? { customName: pick.name, province: pick.province || undefined } : { schoolKey: pick.key }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.link) return onSaved(data.link as ShareLinkView);
      setError(COPY.schoolError[data.error] ?? COPY.tryAgain);
    } catch {
      setError(COPY.tryAgain);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-8 space-y-4">
      <h2 className="text-xl font-semibold">{COPY.pickHeading}</h2>
      <SchoolPicker startQuery={startQuery} value={pick} onChange={setPick} />
      {pick && (
        <button type="button" disabled={busy} onClick={save} className={`${btn} w-full`} style={filled}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? COPY.saving : changing ? COPY.confirmChange : COPY.confirm}
        </button>
      )}
      {error && <ErrorLine>{error}</ErrorLine>}
      {onCancel && (
        <button type="button" onClick={onCancel} className="text-sm underline underline-offset-4" style={{ color: EL.inkSoft }}>
          {COPY.cancelChange}
        </button>
      )}
    </div>
  );
}

/** What happens with the school's seat, when there's news: checking, given, taken, or turned down. */
function SeatBlock({ token, link, demo, onLink }: { token: string; link: ShareLinkView; demo?: boolean; onLink: (l: ShareLinkView) => void }) {
  const [renaming, setRenaming] = useState(false);
  const s = link.seat;
  const backHref = `/hackathon/join/${token}`;

  const nameFriend = async (code: string): Promise<string | null> => {
    if (demo) {
      onLink({ ...link, seat: { state: "checking", recipient: { who: "other", code } } });
      setRenaming(false);
      return null;
    }
    try {
      const res = await fetch(`/api/hackathon/elemental/${token}/share`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendCode: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return recipientError(data.error, COPY.friend);
      onLink(data.link as ShareLinkView);
      setRenaming(false);
      return null;
    } catch {
      return recipientError(undefined, COPY.friend);
    }
  };

  if (s.state === "open") return null;
  const naming = s.state === "checking" && (s.recipient.who === "none" || renaming);
  return (
    <SeatNote tone={s.state === "given" || s.state === "checking" ? "flame" : "plain"}>
      <SeatMessage kind="student" seat={s} />
      {naming && (
        <div className="mt-5">
          <CodeEntry label={COPY.friendLabel} hint={COPY.friendHint} submitLabel={COPY.friendSubmit} onSubmit={nameFriend} />
        </div>
      )}
      {!naming && s.state === "checking" && s.recipient.who === "other" && (
        <button type="button" onClick={() => setRenaming(true)} className="mt-3 text-sm underline underline-offset-4" style={{ color: EL.inkSoft }}>
          {COPY.rename}
        </button>
      )}
      {s.state === "given" && s.recipient.who === "self" && (
        <Link href={backHref} className={`${btn} mt-4 w-full`} style={filled}>
          {COPY.mySeat}
        </Link>
      )}
    </SeatNote>
  );
}

function Rules() {
  return (
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
  );
}

export function ShareView(props: Props) {
  const { token, state, demo } = props;
  const [link, setLink] = useState<ShareLinkView | null>(props.link);
  const [changing, setChanging] = useState(false);
  const onLink = useCallback((l: ShareLinkView) => setLink(l), []);
  usePollLink(link && !demo && state === "open" ? `/api/hackathon/elemental/${token}/share` : null, onLink);

  const footer = (
    <div className="mt-12">
      <TextLink href={`/hackathon/join/${token}`}>{COPY.back}</TextLink>
    </div>
  );

  if (state !== "open") {
    return (
      <Page top={COPY.top} footer={footer}>
        <Title>{COPY.closedTitle}</Title>
        <Lead>{state === "cancelled" ? COPY.cancelled : COPY.closed}</Lead>
      </Page>
    );
  }

  if (!link || changing) {
    return (
      <Page top={COPY.top} footer={footer}>
        <Title>{changing ? COPY.changeTitle : COPY.pickTitle}</Title>
        {!changing && <HowItWorks selfPaid={props.selfPaid} />}
        <PickSchool
          token={token}
          startQuery={changing ? "" : props.startQuery}
          changing={changing}
          demo={demo}
          onSaved={(l) => {
            setLink(l);
            setChanging(false);
          }}
          onCancel={changing ? () => setChanging(false) : undefined}
        />
      </Page>
    );
  }

  return (
    <Page top={COPY.top} footer={footer}>
      <Title>{titleFor(link)}</Title>
      <p className="mt-3 text-lg">
        {schoolLabel(link.school.name, link.school.province)}
        {link.canChangeSchool && (
          <>
            {" "}
            <button type="button" onClick={() => setChanging(true)} className="whitespace-nowrap text-sm underline underline-offset-4" style={{ color: EL.inkSoft }}>
              {COPY.change}
            </button>
          </>
        )}
      </p>

      <div className="mt-6 space-y-6">
        <SeatBlock token={token} link={link} demo={demo} onLink={onLink} />
        <ShareProgress progress={link.progress} kind="student" live={!demo} seatGone={link.seat.state === "taken" || link.seat.state === "rejected"} />
      </div>

      <section className="mt-10 space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold">{COPY.posterHeading}</h2>
          <span className="text-sm" style={{ color: EL.inkSoft }}>
            No. <CodeText code={link.code} />
          </span>
        </div>
        <p style={{ color: EL.inkSoft }}>{COPY.posterLead}</p>
        <PosterBlock code={link.code} kind="student" posterVersion={props.posterVersion} />
      </section>

      <Rules />
    </Page>
  );
}
