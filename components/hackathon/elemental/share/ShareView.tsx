"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";

import { EL } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { formatThaiDate } from "@/lib/content/shift-cohort";
import { SHARE_DEMO_CODE } from "@/lib/hackathon/elemental/share";
import { progressPhase, SEAT_RULE, seatProgressView, type ShareLinkView } from "@/lib/hackathon/elemental/share-rules";

import { lineHelp, recipientError } from "./copy-shared";
import { PosterBlock, ShareBar, usePosterShare } from "./PosterBlock";
import { SeatMeter } from "./Progress";
import { SchoolPicker, type SchoolChoice } from "./SchoolPicker";
import { SeatList } from "./SeatNote";
import { btn, CodeText, ErrorLine, filled, hairline, Lead, outline, Page, schoolLabel, TextButton, TextLink, Title } from "./ui";
import { usePollLink } from "./usePoll";

/**
 * A signed-up student's share page: pick your school, get your own poster and
 * link, watch the numbers fill. Every 50 devices + 1 paid sign-up from your
 * link earns a free seat, up to 2 (SEAT_RULE). An unpaid student's first seat
 * is their own sign-up; any other seat goes to an unpaid friend, named by the
 * friend's code. Staff confirm each seat.
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  top: `${ELEMENTAL.edition} Hackathon · แชร์รับที่นั่งฟรี`,
  pickTitle: "แชร์รับที่นั่งฟรี",
  changeTitle: "เปลี่ยนโรงเรียน",
  steps: [
    "เลือกโรงเรียน ได้โปสเตอร์ที่มี QR ของคุณเอง",
    "ส่งในกลุ่ม LINE ของโรงเรียน หรือให้เพื่อนช่วยส่งต่อ",
    `ทุก ${SEAT_RULE.devicesPerSeat} เครื่อง + ${SEAT_RULE.paidPerSeat} คนจ่าย ได้ที่นั่งฟรี 1 ที่ ได้สูงสุด ${SEAT_RULE.maxSeatsPerLink} ที่`,
  ],
  paidNote: "จ่ายแล้วก็แชร์ได้ ที่นั่งฟรีที่ได้ ยกให้เพื่อนที่ยังไม่จ่าย",
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
    done: "ครบแล้ว",
    naming: "ได้ที่นั่งฟรีแล้ว ใส่รหัสเพื่อน",
    checking: "ได้ที่นั่งฟรีแล้ว รอทีมงานเช็ก",
    more: (n: number) => `ได้ ${n} ที่แล้ว แชร์ต่อได้อีก`,
    maxed: (n: number) => `ได้ครบ ${n} ที่แล้ว`,
    closed: "ปิดนับแล้ว",
    closedWith: (n: number) => `ปิดนับแล้ว · ได้ ${n} ที่`,
  },
  friend: "เพื่อน",
  posterHeading: "โปสเตอร์ของคุณ",
  posterLead: "QR บนโปสเตอร์คือลิงก์ของคุณ ใครสแกนหรือกดลิงก์ ตัวเลขด้านบนจะขึ้น",
  rulesHeading: "กติกา",
  rules: [
    "นับเป็นเครื่อง เปิดซ้ำจากเครื่องเดิมนับครั้งเดียว",
    "นับคนจ่ายจากคนที่สแกน QR หรือกดลิงก์ของคุณ แล้วสมัครและจ่าย",
    `ทุก ${SEAT_RULE.devicesPerSeat} เครื่อง + ${SEAT_RULE.paidPerSeat} คนจ่าย = ที่นั่งฟรี 1 ที่ ลิงก์ละไม่เกิน ${SEAT_RULE.maxSeatsPerLink} ที่ ที่นั่งไม่เกินจำนวนคนจ่าย`,
    "ที่นั่งแรกของคนที่ยังไม่จ่ายเป็นของตัวเอง ที่เหลือยกให้เพื่อนที่ยังไม่จ่าย",
    "ทีมงานเช็กก่อนให้ที่นั่งทุกครั้ง",
    `แชร์ได้ถึงวันปิดรับสมัคร ${formatThaiDate(ELEMENTAL.registrationClosesOn)}`,
  ],
  back: "กลับไปหน้าที่นั่งของฉัน",
  closedTitle: "แชร์รับที่นั่งฟรี",
  closed: "ตอนนี้ยังไม่เปิด",
  afterClose: "ปิดรับสมัครแล้ว ลิงก์แชร์ปิดตามไปด้วย",
  frozenNote: "ปิดรับสมัครแล้ว ตัวเลขหยุดนับตอนปิด ทีมงานยังเช็กและให้ที่นั่งฟรีได้ถึงวัน Demo Day",
  teamHeading: "เป้าต่อไป: ทีมของคุณบนกระดาน",
  teamHeadingShort: "เป้าต่อไป",
  teamLead: "เครื่องที่เปิดลิงก์ของคุณยังนับให้ทีม ปลดล็อกสีและฟอนต์ชื่อทีม และไต่อันดับบนกระดาน",
  board: "ดูกระดาน",
  cancelled: "การสมัครนี้ถูกยกเลิก แชร์รับที่นั่งไม่ได้",
  schoolError: {
    code_taken: `สร้างลิงก์ไม่ได้ ${lineHelp}`,
    invalid: "ใช้ชื่อโรงเรียนนี้ไม่ได้ ลองพิมพ์ใหม่",
    closed: "ตอนนี้ปิดแล้ว",
  } as Record<string, string>,
  tryAgain: "ยังบันทึกไม่ได้ ลองอีกครั้ง",
};

type Props = {
  token: string;
  /** "after-close": read-only until the end of Demo Day (a friend can still be named). */
  state: "open" | "after-close" | "closed" | "cancelled";
  link: ShareLinkView | null;
  /** Whether this sign-up has paid; for the words before a link exists. */
  selfPaid: boolean;
  /** The school typed at sign-up, to start the search with. */
  startQuery: string;
  posterVersion: string;
  /** The team's row on the board (builder B's TeamStyleRow), shown once the link has all its seats or sign-up closed. */
  teamRow?: React.ReactNode;
  demo?: boolean;
};

function titleFor(link: ShareLinkView, open: boolean): string {
  const t = COPY.titles;
  const v = link.seats;
  const n = v.seats.length;
  if (!open) return n ? t.closedWith(n) : t.closed;
  if (v.seats.some((x) => x.status === "needs_recipient")) return t.naming;
  if (v.seats.some((x) => x.status === "qualified")) return t.checking;
  if (v.maxed) return t.maxed(n);
  if (n) return t.more(n);
  return t[progressPhase(v, n)];
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
          canChangeSchool: true,
          selfPaid: false,
          verified: false,
          invited: false,
          seats: seatProgressView({ progress: { devices: 0, paid: 0 }, rows: [], ownRegistrationId: null, selfPaid: false, phase: "open" }),
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
        <TextButton onClick={onCancel}>{COPY.cancelChange}</TextButton>
      )}
    </div>
  );
}

/** The link's earned seats, with a code box where a friend still needs to be named. */
function Seats({ token, link, demo, onLink }: { token: string; link: ShareLinkView; demo?: boolean; onLink: (l: ShareLinkView) => void }) {
  const nameFriend = async (index: number, code: string): Promise<string | null> => {
    if (demo) {
      onLink({
        ...link,
        seats: { ...link.seats, seats: link.seats.seats.map((x) => (x.index === index ? { index, status: "qualified" as const, recipientCode: code } : x)) },
      });
      return null;
    }
    try {
      const res = await fetch(`/api/hackathon/elemental/${token}/share`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatIndex: index, friendCode: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return recipientError(data.error, COPY.friend);
      onLink(data.link as ShareLinkView);
      return null;
    } catch {
      return recipientError(undefined, COPY.friend);
    }
  };
  return <SeatList kind="student" view={link.seats} backHref={`/hackathon/join/${token}`} onName={nameFriend} />;
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

/** Once the school's seat is out of reach, the team's board row is the next goal. */
function TeamNext({ teamRow }: { teamRow?: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border p-5" style={{ borderColor: hairline }}>
      <h2 className="text-xl font-semibold">{teamRow ? COPY.teamHeadingShort : COPY.teamHeading}</h2>
      {teamRow ?? <p style={{ color: EL.inkSoft }}>{COPY.teamLead}</p>}
      {!teamRow && (
        <Link href="/hackathon/elemental/leaderboard" className={`${btn} w-full`} style={outline}>
          {COPY.board}
        </Link>
      )}
    </section>
  );
}

function StudentLink(props: Props & { link: ShareLinkView; onLink: (l: ShareLinkView) => void; onChange: () => void }) {
  const { token, link, demo, onLink, state } = props;
  const open = state === "open";
  const poster = usePosterShare(link.code, "student", props.posterVersion);
  const v = link.seats;
  const start = open && v.seats.length === 0 && progressPhase(v) === "start";
  // Seats still to earn: keep the share actions pinned. All earned, or closed: the team's board row is the next goal.
  const stillEarning = open && !v.maxed;

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
  const meter = <SeatMeter view={v} kind="student" live={open && !demo} />;

  return (
    <Page
      top={COPY.top}
      footer={
        <div className="mt-12">
          <TextLink href={`/hackathon/join/${token}`}>{COPY.back}</TextLink>
        </div>
      }
      bar={stillEarning ? <ShareBar poster={poster} /> : undefined}
    >
      <Title>{titleFor(link, open)}</Title>
      <p className="mt-3 text-lg">
        {schoolLabel(link.school.name, link.school.province)}
        {open && link.canChangeSchool && (
          <>
            {" "}
            <TextButton onClick={props.onChange} className="whitespace-nowrap">
              {COPY.change}
            </TextButton>
          </>
        )}
      </p>
      {!open && <p className="mt-2 text-sm" style={{ color: EL.inkSoft }}>{COPY.frozenNote}</p>}

      <div className="mt-6 space-y-6">
        <Seats token={token} link={link} demo={demo} onLink={onLink} />
        {!stillEarning && <TeamNext teamRow={props.teamRow} />}
        {/* Nothing shared yet: the poster is the one thing to do, so it comes first. */}
        {start ? posterSection : meter}
      </div>

      {open && <div className="mt-10">{start ? meter : posterSection}</div>}

      <Rules />
    </Page>
  );
}

export function ShareView(props: Props) {
  const { token, state, demo } = props;
  const [link, setLink] = useState<ShareLinkView | null>(props.link);
  const [changing, setChanging] = useState(false);
  const onLink = useCallback((l: ShareLinkView) => setLink(l), []);
  const live = state === "open" || state === "after-close";
  usePollLink(link && !demo && live ? `/api/hackathon/elemental/${token}/share` : null, onLink);

  const footer = (
    <div className="mt-12">
      <TextLink href={`/hackathon/join/${token}`}>{COPY.back}</TextLink>
    </div>
  );

  if (!live || (state === "after-close" && !link)) {
    return (
      <Page top={COPY.top} footer={footer}>
        <Title>{COPY.closedTitle}</Title>
        <Lead>{state === "cancelled" ? COPY.cancelled : state === "after-close" ? COPY.afterClose : COPY.closed}</Lead>
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

  return <StudentLink {...props} link={link} onLink={onLink} onChange={() => setChanging(true)} />;
}
