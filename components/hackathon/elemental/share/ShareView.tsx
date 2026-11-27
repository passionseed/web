"use client";

import { useCallback, useState, type CSSProperties, type ReactNode } from "react";

import { EL } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { formatThaiDate } from "@/lib/content/shift-cohort";
import { PER_NETWORK_CAP } from "@/lib/hackathon/elemental/link-views-shared";
import { SHARE } from "@/lib/hackathon/elemental/share";
import { SEAT_RULE, seatProgressView, type ShareLinkView } from "@/lib/hackathon/elemental/share-rules";

import { lineHelp, recipientError } from "./copy-shared";
import { Poster, ShareBar, usePosterShare } from "./PosterBlock";
import { SchoolPicker, type SchoolChoice } from "./SchoolPicker";
import { SeatCard } from "./SeatCard";
import { seatHeadline } from "./seat-card-model";
import { Rules } from "./Rules";
import { needsName, SeatList } from "./SeatNote";
import { EditorialLink, Fine, H1, Page, PrimaryButton, schoolLabel, SkyBand, StickyBar, v } from "./ui";
import { usePollLink } from "./usePoll";

/**
 * A signed-up student's share page, on the landing's dark ground (merged
 * direction §8): the sky band says what's left, then the SeatCard, then the
 * poster (poster first before anything has happened). The one action, "ส่งใน
 * LINE →", is pinned at the bottom; while a seat waits for a friend's code,
 * typing it is the action instead. Every 50 devices + 1 paid sign-up from the
 * link earns a free seat, up to 2 (SEAT_RULE).
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  pickTitle: "แชร์รับที่นั่งฟรี",
  pickLead: `ทุก ${SEAT_RULE.devicesPerSeat} เครื่อง + ${SEAT_RULE.paidPerSeat} คนจ่ายผ่านลิงก์ = ที่นั่งฟรี 1 ที่ ได้สูงสุด ${SEAT_RULE.maxSeatsPerLink} ที่`,
  changeTitle: "เปลี่ยนโรงเรียน",
  paidNote: "จ่ายแล้วก็แชร์ได้ ที่นั่งฟรีที่ได้ ยกให้เพื่อนที่ยังไม่จ่าย",
  pickLabel: "โรงเรียนของคุณ",
  confirm: "ยืนยัน รับโปสเตอร์ →",
  confirmChange: "เปลี่ยนเป็นโรงเรียนนี้ →",
  saving: "กำลังบันทึก…",
  cancelChange: "ไม่เปลี่ยนแล้ว",
  change: "เปลี่ยน",
  titles: {
    start: "ส่งโปสเตอร์เข้ากลุ่ม LINE",
    naming: "ได้ที่นั่งฟรีแล้ว ใส่รหัสเพื่อน",
    checking: "ได้ที่นั่งฟรีแล้ว รอทีมงานเช็ก",
  },
  friend: "เพื่อน",
  rules: [
    `ทุก ${SEAT_RULE.devicesPerSeat} เครื่อง + ${SEAT_RULE.paidPerSeat} คนจ่าย = ที่นั่งฟรี 1 ที่ ลิงก์ละไม่เกิน ${SEAT_RULE.maxSeatsPerLink} ที่`,
    "นับเป็นเครื่อง เปิดซ้ำจากเครื่องเดิมนับครั้งเดียว",
    `wifi เดียวกันนับได้ไม่เกิน ${PER_NETWORK_CAP} เครื่อง`,
    "นับคนจ่ายจากคนที่สแกน QR หรือกดลิงก์ของคุณ แล้วสมัครและจ่าย",
    "ที่นั่งแรกของคนที่ยังไม่จ่ายเป็นของตัวเอง ที่เหลือยกให้เพื่อนที่ยังไม่จ่าย",
    "ทีมงานเช็กก่อนให้ที่นั่งทุกครั้ง",
    `แชร์ได้ถึงวันปิดรับสมัคร ${formatThaiDate(ELEMENTAL.registrationClosesOn)}`,
    `ตัวเลขอัปเดตเองทุก ${SHARE.pollMs / 1000} วินาที`,
  ],
  closedTitle: "แชร์รับที่นั่งฟรี",
  closed: "ตอนนี้ยังไม่เปิด",
  afterClose: "ปิดรับสมัครแล้ว ลิงก์แชร์ปิดตามไปด้วย",
  frozenNote: "ปิดรับสมัครแล้ว ตัวเลขหยุดนับตอนปิด ทีมงานยังเช็กและให้ที่นั่งฟรีได้ถึงวัน Demo Day",
  cancelled: "การสมัครนี้ถูกยกเลิก แชร์รับที่นั่งไม่ได้",
  back: "กลับหน้าของฉัน",
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
  /** This sign-up's share code (its link's code once made): seeds the empty card before there's a link. */
  code: string;
  /** Whether this sign-up has paid; for the words before a link exists. */
  selfPaid: boolean;
  /** The school typed at sign-up, to start the search with. */
  startQuery: string;
  posterVersion: string;
  /** The team's line on the board (TeamLine), once the link has all its seats or sign-up closed. */
  teamRow?: ReactNode;
  demo?: boolean;
};

const EMPTY_VIEW = seatProgressView({ progress: { devices: 0, paid: 0 }, rows: [], ownRegistrationId: null, selfPaid: false, phase: "open" });

/** Ink on the pale sky (the lead line's links read the surface's text colour). */
const ON_SKY = { "--el-text": EL.ink } as CSSProperties;

function titleFor(link: ShareLinkView, open: boolean): string {
  const t = COPY.titles;
  const view = link.seats;
  if (!open) return seatHeadline(view);
  if (needsName(view)) return t.naming;
  if (view.seats.some((s) => s.status === "qualified" && s.mine)) return t.checking;
  if (view.seats.length === 0 && view.devices === 0 && view.paid === 0) return t.start;
  return seatHeadline(view);
}

function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" style={{ fontSize: 14, lineHeight: "22px", color: v.error }}>
      {children}
    </p>
  );
}

/** Pick (or change) the school; the sticky bar saves it. */
function PickSchool({
  token,
  code,
  startQuery,
  changing,
  selfPaid,
  demo,
  onSaved,
  onCancel,
}: {
  token: string;
  code: string;
  startQuery: string;
  changing: boolean;
  selfPaid: boolean;
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
          code,
          school: { name: pick.name, province: pick.province || null },
          canChangeSchool: true,
          selfPaid,
          verified: false,
          invited: false,
          seats: EMPTY_VIEW,
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
    <Page
      surface="ground"
      back={{ href: `/hackathon/join/${token}` }}
      sky={<SkyBand title={<H1>{changing ? COPY.changeTitle : COPY.pickTitle}</H1>} lead={changing ? undefined : COPY.pickLead} height={200} />}
      bar={
        pick ? (
          <StickyBar>
            <PrimaryButton onClick={save} disabled={busy} full>
              {busy ? COPY.saving : changing ? COPY.confirmChange : COPY.confirm}
            </PrimaryButton>
          </StickyBar>
        ) : undefined
      }
    >
      {!changing && <SeatCard view={EMPTY_VIEW} code={code} preview />}
      <div className={changing ? "" : "mt-8"}>
        <SchoolPicker label={COPY.pickLabel} startQuery={startQuery} value={pick} onChange={setPick} />
      </div>
      {error && (
        <div className="mt-4">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      {selfPaid && !changing && <Fine className="mt-6">{COPY.paidNote}</Fine>}
      {onCancel && (
        <div className="mt-6">
          <EditorialLink size="sm" arrow={false} onClick={onCancel}>
            {COPY.cancelChange}
          </EditorialLink>
        </div>
      )}
    </Page>
  );
}

/** The link's earned seats, with a code field where a friend still needs to be named. */
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

function StudentLink(props: Props & { link: ShareLinkView; onLink: (l: ShareLinkView) => void; onChange: () => void }) {
  const { token, link, demo, onLink, state } = props;
  const open = state === "open";
  const poster = usePosterShare(link.code, "student", props.posterVersion);
  // The page's phase wins (a link loaded just before close still reads as closed).
  const view = open ? link.seats : { ...link.seats, phase: "after-close" as const };
  const naming = needsName(view);
  const start = open && view.seats.length === 0 && view.devices === 0 && view.paid === 0;

  const card = <SeatCard view={view} code={link.code} kind="student" />;
  const shown = { ...link, seats: view };
  const seats = <Seats token={token} link={link} demo={demo} onLink={onLink} />;
  const posterBlock = open ? <Poster poster={poster} /> : null;
  // Nothing yet: the poster is the thing to do. A seat waiting for a code: that comes first. Otherwise the numbers lead.
  const blocks = naming ? [seats, card, posterBlock] : start ? [posterBlock, card] : [card, seats, posterBlock];

  return (
    <Page
      surface="ground"
      back={{ href: `/hackathon/join/${token}` }}
      sky={
        <SkyBand
          title={<H1>{titleFor(shown, open)}</H1>}
          lead={
            <span style={ON_SKY}>
              {schoolLabel(link.school.name, link.school.province)}
              {open && link.canChangeSchool && (
                <>
                  {" "}
                  <EditorialLink size="sm" arrow={false} onClick={props.onChange} className="whitespace-nowrap px-1">
                    {COPY.change}
                  </EditorialLink>
                </>
              )}
            </span>
          }
        />
      }
      bar={open && !naming ? <ShareBar poster={poster} /> : undefined}
    >
      {!open && <Fine className="mb-6">{COPY.frozenNote}</Fine>}
      <div className="space-y-10">
        {blocks.map((b, i) => (b ? <div key={i}>{b}</div> : null))}
        {props.teamRow && (view.maxed || !open) && <section className="border-t pt-6" style={{ borderColor: v.rule }}>{props.teamRow}</section>}
      </div>
      <Rules rules={COPY.rules} />
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

  if (!live || (state === "after-close" && !link)) {
    return (
      <Page
        surface="ground"
        back={{ href: `/hackathon/join/${token}` }}
        sky={<SkyBand title={<H1>{COPY.closedTitle}</H1>} lead={state === "cancelled" ? COPY.cancelled : state === "after-close" ? COPY.afterClose : COPY.closed} />}
      >
        <EditorialLink href={`/hackathon/join/${token}`}>{COPY.back}</EditorialLink>
      </Page>
    );
  }

  if (!link || changing) {
    return (
      <PickSchool
        token={token}
        code={link?.code ?? props.code}
        startQuery={changing ? "" : props.startQuery}
        changing={changing}
        selfPaid={props.selfPaid}
        demo={demo}
        onSaved={(l) => {
          setLink(l);
          setChanging(false);
        }}
        onCancel={changing ? () => setChanging(false) : undefined}
      />
    );
  }

  return <StudentLink {...props} link={link} onLink={onLink} onChange={() => setChanging(true)} />;
}
