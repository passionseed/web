import Link from "next/link";
import type { ReactNode } from "react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, teamChangeDeadlineTh, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";
import { SHIFT_PAYMENT } from "@/lib/content/shift-cohort";
import type { ElementalDiscordOutcome } from "@/lib/hackathon/elemental/discordLink";
import { teamChangeOpen } from "@/lib/hackathon/elemental/team-change";
import { teamLabel } from "@/lib/hackathon/elemental/team-name";
import type { PublicRegistration } from "@/lib/supabase/hackathon-event-registrations";

import { BuddyPass, IouSlip } from "./BuddyPass";
import { ConnectDiscord } from "./ConnectDiscord";
import { PayWithSlip } from "./PayWithSlip";
import { RememberMyPage } from "./RememberMyPage";
import { placeFor, ticketNumber } from "./places";
import { TeamInvite } from "./TeamInvite";
import { TeamJoin } from "./TeamJoin";
import { TeamOffer, type TeamOfferTarget } from "./TeamOffer";
import { Ticket } from "./Ticket";
import { TrackStep } from "./TrackStep";

/**
 * One person's own page after signing up: pay, wait for a check, or the
 * seat. Shared by /hackathon/join/[token] and the dev demo.
 */

type Props = {
  token: string;
  reg: Pick<PublicRegistration, "status" | "teamName" | "memberCount" | "amountBaht" | "memberNicknames" | "team" | "isTeamStarter" | "teamPosition" | "discordJoined"> &
    Partial<Pick<PublicRegistration, "buddyPass" | "buddyOf" | "onBuddyPass">>;
  qrSrc: string | null;
  links: { line: string | null; discord: string | null };
  /** The find-a-team OpenChat, set only on an unpaid page that still needs teammates. */
  teamUpUrl?: string | null;
  /** How the last Discord sign-in from this page went (?discord=…). */
  discordOutcome?: ElementalDiscordOutcome | null;
  /** The share page, set only on a paid page while sharing is open. */
  shareHref?: string | null;
  /** Whether team changes are still open. Left out, it follows the clock (ELEMENTAL.teamChangeClosesAt). */
  teamChangeOpen?: boolean;
  /** Came from a friend's team link (?join=<code>): the team it points at, shown at the top to join or move to. */
  joinOffer?: { code: string; target: TeamOfferTarget } | null;
  demo?: boolean;
};

function Title({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-5xl sm:text-6xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.05 }}>
      {children}
    </h1>
  );
}

const primary = "inline-flex items-center justify-center rounded-full px-6 py-3.5 text-base font-semibold";
const filled = { backgroundColor: EL.flame, color: EL.flameWhite };
const outline = { boxShadow: `inset 0 0 0 1px ${EL.ink}` };

function LineButton({ label, style }: { label: string; style: typeof filled | typeof outline }) {
  return (
    <a href={SHIFT_PAYMENT.lineUrl} target="_blank" rel="noopener noreferrer" className={primary} style={style}>
      {label}
    </a>
  );
}

function whoAndPeople(reg: Props["reg"]): { who: string; people: string } {
  const who = reg.team ? reg.memberNicknames.join(", ") : (reg.teamName ?? reg.memberNicknames.join(", "));
  if (reg.team) return { who, people: teamLabel(reg.team.name) };
  if (reg.buddyOf) return { who, people: `บัตรเพื่อนจาก ${reg.buddyOf.name}` };
  return { who, people: reg.memberCount > 1 ? `${reg.memberCount} คน` : "มาคนเดียว" };
}

/** The buddy pass (for a ฿199 solo payer) or joke receipt (for a friend on a pass). */
function BuddySection({ reg }: { reg: Props["reg"] }) {
  return (
    <>
      {reg.buddyPass && <BuddyPass pass={reg.buddyPass} />}
      {reg.buddyOf && <IouSlip debt={`คุณติด ${reg.buddyOf.name}`} owe={reg.buddyOf.owe} />}
    </>
  );
}

/**
 * The team card. In a team: the roster, the invite link and team code, a way
 * to leave, and for the person who started it, a way to rename it. Without a
 * team: join one with its code, or start one. Joining, starting and leaving
 * close at ELEMENTAL.teamChangeClosesAt.
 *
 * The lines about money follow amountAfterTeamChange
 * (lib/hackathon/elemental/team-change.ts): only a sign-up that hasn't paid
 * changes price, and a buddy pass price never does. The slip checker wants
 * the exact amount, so a person who has already transferred is told to send
 * the slip before the price changes under it.
 */
const closedNoteFor = (until: string) => `ปิดการเปลี่ยนทีมแล้วเมื่อ ${until}`;
const priceFollowsTeam = (reg: Props["reg"]) => reg.status === "pending" && !reg.onBuddyPass && !reg.buddyOf;

/** What joining a team does to a sign-up that has none: its price, its slip, its buddy pass. */
function joinNotes(reg: Props["reg"]): string[] {
  const priceFollows = priceFollowsTeam(reg);
  const notes = !priceFollows
    ? [reg.status === "pending" ? "ค่าสมัครของหน้านี้ไม่เปลี่ยน" : "ค่าสมัครที่จ่ายแล้วไม่เปลี่ยน ไม่มีคืนเงินและไม่ต้องจ่ายเพิ่ม"]
    : reg.memberCount === 1
      ? [
          `เข้าทีมแล้ว ค่าสมัครเป็น ฿${ELEMENTAL.groupPriceBaht} เท่ากับเพื่อนในทีม`,
          `ถ้าโอน ฿${ELEMENTAL.priceBaht} ไปแล้ว ส่งสลิปก่อน แล้วค่อยเข้าทีม`,
        ]
      : [`ค่าสมัครยังเป็นคนละ ฿${ELEMENTAL.groupPriceBaht}`];
  // The pass follows the ฿199 (lib/hackathon/elemental/buddy-pass.ts).
  if (reg.buddyPass && priceFollows) {
    notes.push(`บัตรเพื่อนมากับราคา ฿${ELEMENTAL.priceBaht} เข้าทีมก่อนจ่ายจะไม่มีบัตรเพื่อน`);
  } else if (reg.buddyPass?.state === "locked" || reg.buddyPass?.state === "available") {
    notes.push("บัตรเพื่อนยังใช้ได้หลังเข้าทีม เพื่อนที่ใช้บัตรจะได้เข้าทีมเดียวกัน ถ้าทีมยังมีที่ว่าง");
  }
  return notes;
}

/** What moving from one team to another does: in a team before and after, so the price stays. */
function switchNotes(reg: Props["reg"]): string[] {
  const notes = [
    priceFollowsTeam(reg)
      ? `ค่าสมัครยังเป็น ฿${ELEMENTAL.groupPriceBaht * reg.memberCount} เท่าเดิม`
      : reg.status === "pending"
        ? "ค่าสมัครของหน้านี้ไม่เปลี่ยน"
        : "ค่าสมัครที่จ่ายแล้วไม่เปลี่ยน ไม่มีคืนเงินและไม่ต้องจ่ายเพิ่ม",
  ];
  if (reg.isTeamStarter) notes.push("ทีมเดิมยังอยู่ เพื่อนในทีมเดิมได้สิทธิ์เปลี่ยนชื่อทีมต่อ");
  if (reg.buddyPass?.state === "locked" || reg.buddyPass?.state === "available") {
    notes.push("บัตรเพื่อนยังใช้ได้ เพื่อนที่ใช้บัตรจะได้เข้าทีมใหม่นี้ ถ้ายังมีที่ว่าง");
  }
  return notes;
}

/** Whether ?join= points at a team this sign-up can join or move to right now, so the card at the top is the way in. */
function offerActionable({ reg, joinOffer, teamChangeOpen: openProp }: Props): boolean {
  const target = joinOffer?.target;
  if (!target || !(openProp ?? teamChangeOpen())) return false;
  return reg.team?.id !== target.id && target.spotsLeft >= reg.memberCount;
}

function Team(props: Props) {
  const { token, reg, demo, teamChangeOpen: openProp } = props;
  const open = openProp ?? teamChangeOpen();
  const until = teamChangeDeadlineTh();
  const closedNote = closedNoteFor(until);
  const priceFollows = priceFollowsTeam(reg);
  const alone = reg.memberCount === 1;
  if (!reg.team) {
    if (!open) {
      return (
        <p className="text-sm" style={{ color: EL.inkSoft }}>
          {closedNote}
        </p>
      );
    }
    // The card at the top already offers the friend's team.
    if (offerActionable(props)) return null;
    return <TeamJoin token={token} notes={joinNotes(reg)} until={until} demo={demo} />;
  }
  const leaveNotes =
    priceFollows && alone
      ? [
          `ออกแล้ว ค่าสมัครกลับเป็น ฿${ELEMENTAL.priceBaht} ราคามาคนเดียว`,
          `ถ้าโอน ฿${ELEMENTAL.groupPriceBaht} ไปแล้ว ส่งสลิปก่อน แล้วค่อยออกจากทีม`,
        ]
      : [];
  return (
    <TeamInvite
      team={reg.team}
      renameToken={reg.isTeamStarter ? token : undefined}
      leave={open ? { token, notes: leaveNotes, until } : undefined}
      closedNote={closedNote}
      demo={demo}
    />
  );
}

/**
 * The find-a-team LINE OpenChat, for someone who signed up without enough
 * teammates (Big, 2026-11-26). It sits under the payment, so paying stays the
 * main step.
 */
function TeamUp({ url }: { url: string }) {
  return (
    <section className="space-y-3 rounded-2xl border p-5 sm:p-6" style={{ borderColor: "rgba(29,33,31,0.18)" }}>
      <p className="text-lg">หาเพื่อนร่วมทีม</p>
      <p className="text-sm" style={{ color: EL.inkSoft }}>
        เข้าโอเพนแชท {ELEMENTAL.edition} Hackathon หาเพื่อนร่วมทีม จากโรงเรียนเดียวกันหรือต่างโรงเรียนก็ได้ ทีมละ{" "}
        {ELEMENTAL.teamMin}–{ELEMENTAL.maxGroupSize} คน
      </p>
      <a href={url} target="_blank" rel="noopener noreferrer" className={`${primary} w-full`} style={outline}>
        เข้าโอเพนแชทหาทีม
      </a>
    </section>
  );
}

const DISCORD_FAILED = "เชื่อม Discord ไม่สำเร็จ ลองอีกครั้ง หรือทักไลน์ทีมงาน";

const DISCORD_OUTCOME_COPY: Partial<Record<ElementalDiscordOutcome, string>> = {
  not_member: "เชื่อมบัญชีแล้ว แต่ยังพาเข้ากลุ่มให้ไม่ได้ เข้าด้วยลิงก์เชิญด้านล่างแทนได้เลย",
  taken: "หน้านี้เชื่อมกับ Discord อีกบัญชีไปแล้ว ถ้าไม่ใช่เรา ทักไลน์ทีมงาน",
  not_paid: "ปุ่มนี้ใช้ได้หลังสลิปผ่านแล้ว",
  no_discord: DISCORD_FAILED,
  auth: DISCORD_FAILED,
  error: DISCORD_FAILED,
};

/** Joined: a way back into the server. Otherwise: sign in with Discord, with the invite as a fallback. */
function DiscordStep({ token, reg, links, discordOutcome, demo }: Props) {
  if (reg.discordJoined) {
    return links.discord ? (
      <a href={links.discord} target="_blank" rel="noopener noreferrer" className={primary} style={outline}>
        อยู่ใน Discord แล้ว เปิดเลย
      </a>
    ) : (
      <p className="self-center text-base">อยู่ใน Discord ของงานแล้ว</p>
    );
  }
  const message = discordOutcome ? DISCORD_OUTCOME_COPY[discordOutcome] : undefined;
  return (
    <div className="space-y-2">
      <ConnectDiscord token={token} className={`${primary} w-full`} style={outline} demo={demo} />
      {message && (
        <p className="text-sm" style={{ color: EL.flame }} role="status">
          {message}
        </p>
      )}
      {links.discord && (
        <a href={links.discord} target="_blank" rel="noopener noreferrer" className="block text-center text-sm underline underline-offset-4" style={{ color: EL.inkSoft }}>
          หรือเข้าด้วยลิงก์เชิญ
        </a>
      )}
    </div>
  );
}

/**
 * While sharing is open, the way from the seat to the share page and the
 * waiting room: a dark card like the ticket, not a text line at the bottom,
 * because the point is that paid students find it (Big, 2026-11-28: "need
 * more engagement"). Copy is a placeholder until Angpao rewrites it.
 */
function ShareCard({ shareHref }: { shareHref: string }) {
  return (
    <section className="space-y-4 rounded-2xl p-5 sm:p-6" style={{ backgroundColor: EL.char, color: EL.cream }}>
      <div className="space-y-1">
        <p className="text-2xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300, lineHeight: 1.25 }}>
          custom ชื่อทีม ให้ขึ้นห้องรอ
        </p>
        <p className="text-sm" style={{ color: EL.creamSoft }}>
          แชร์โปสเตอร์ของคุณ ทุกเครื่องที่เปิดลิงก์ช่วยปลดล็อกสี ฟอนต์ และเอฟเฟกต์ให้ชื่อทีม แล้วชื่อทีมไปโชว์ในห้องรอก่อนเปิดงาน
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Link href={shareHref} className={primary} style={filled}>
          แชร์โปสเตอร์ · custom ชื่อทีม
        </Link>
        <Link href="/hackathon/elemental/lobby" className={primary} style={{ boxShadow: `inset 0 0 0 1px ${EL.cream}` }}>
          ดูห้องรอ
        </Link>
      </div>
    </section>
  );
}

function PaidSection(props: Props) {
  const { reg, links, demo } = props;
  const { who, people } = whoAndPeople(reg);
  return (
    <section className="mt-6 space-y-6">
      {!demo && <TrackStep step="paid" />}
      <Title>ได้ที่นั่งแล้ว</Title>
      <Ticket
        who={who}
        people={people}
        place={placeFor(props.token, reg.teamPosition)}
        number={ticketNumber(props.token)}
      />
      <div className="space-y-3">
        <p className="text-lg">ขั้นต่อไป เข้ากลุ่มของงาน ประกาศ ทีม และงานทั้งหมดอยู่ที่นี่</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {links.line && (
            <a href={links.line} target="_blank" rel="noopener noreferrer" className={primary} style={filled}>
              เข้ากลุ่ม LINE
            </a>
          )}
          <DiscordStep {...props} />
        </div>
        {!reg.discordJoined && (
          <p className="text-sm" style={{ color: EL.inkSoft }}>
            กดเข้า Discord แล้วระบบพาเข้ากลุ่มของงานให้เลย และได้บัญชี PassionSeed ไปด้วย ไม่ต้องสมัครแยก
          </p>
        )}
      </div>
      {props.shareHref && <ShareCard shareHref={props.shareHref} />}
      <Team {...props} />
      <BuddySection reg={reg} />
      <p className="text-sm" style={{ color: EL.inkSoft }}>
        มีคำถามทักไลน์ {SHIFT_PAYMENT.lineId} ·{" "}
        <Link href="/hackathon/elemental" className="underline underline-offset-4">
          กลับหน้า {ELEMENTAL.edition} Hackathon
        </Link>
      </p>
    </section>
  );
}

function ReviewSection(props: Props) {
  return (
    <section className="mt-6 space-y-4">
      <Title>ได้รับสลิปแล้ว</Title>
      <p className="text-lg">
        ระบบตรวจสลิปอัตโนมัติไม่ได้ในตอนนี้ ทีมงานจะตรวจให้เองภายใน 24 ชั่วโมง แล้วหน้านี้จะเปลี่ยนเป็นยืนยันที่นั่ง
      </p>
      <p style={{ color: EL.inkSoft }}>ลิงก์กลุ่ม LINE และ Discord ของงานขึ้นที่หน้านี้เมื่อสลิปผ่าน</p>
      <LineButton label={`มีคำถาม ทักไลน์ ${SHIFT_PAYMENT.lineId}`} style={outline} />
      <Team {...props} />
      <BuddySection reg={props.reg} />
    </section>
  );
}

function CancelledSection() {
  return (
    <section className="mt-6 space-y-4">
      <Title>การสมัครนี้ถูกยกเลิก</Title>
      <p className="text-lg">ถ้าคิดว่าผิดพลาด ทักทีมงานได้เลย</p>
      <LineButton label={`ทักไลน์ ${SHIFT_PAYMENT.lineId}`} style={filled} />
    </section>
  );
}

function PendingSection(props: Props) {
  const { token, reg, qrSrc, demo, teamUpUrl } = props;
  return (
    <section className="mt-6">
      {!demo && <TrackStep step="pay" />}
      <Title>อีกขั้นเดียว</Title>
      <p className="mt-3 text-pretty text-lg" style={{ color: EL.inkSoft }}>
        โอนแล้วส่งสลิป ที่นั่งยืนยันทันทีที่สลิปผ่าน
      </p>
      {reg.buddyOf && (
        <div className="mt-8">
          <IouSlip debt={`คุณติด ${reg.buddyOf.name}`} owe={reg.buddyOf.owe} />
        </div>
      )}
      <div className="mt-8">
        <PayWithSlip token={token} amountBaht={reg.amountBaht} qrSrc={qrSrc} demo={demo} />
      </div>
      {reg.buddyPass && (
        <div className="mt-10">
          <BuddyPass pass={reg.buddyPass} />
        </div>
      )}
      <div className="mt-10">
        <Team {...props} />
      </div>
      {teamUpUrl && (
        <div className="mt-4">
          <TeamUp url={teamUpUrl} />
        </div>
      )}
    </section>
  );
}

function StatusSection(props: Props) {
  switch (props.reg.status) {
    case "paid":
      return <PaidSection {...props} />;
    case "review":
      return <ReviewSection {...props} />;
    case "cancelled":
      return <CancelledSection />;
    default:
      return <PendingSection {...props} />;
  }
}

export function PayView(props: Props) {
  return (
    <main className="min-h-[100dvh] px-5 py-10 sm:px-8 sm:py-16" style={{ backgroundColor: EL.cream, color: EL.ink }}>
      <div className="mx-auto max-w-xl">
        <p className="text-sm" style={{ color: EL.inkSoft }}>
          {ELEMENTAL.edition} Hackathon · {thaiDateLine()} · {ELEMENTAL.venueTh}
        </p>
        {props.joinOffer && (
          <TeamOffer
            token={props.token}
            code={props.joinOffer.code}
            target={props.joinOffer.target}
            current={props.reg.team ? { id: props.reg.team.id, name: props.reg.team.name } : null}
            memberCount={props.reg.memberCount}
            notes={props.reg.team ? switchNotes(props.reg) : joinNotes(props.reg)}
            open={props.teamChangeOpen ?? teamChangeOpen()}
            closedNote={closedNoteFor(teamChangeDeadlineTh())}
            demo={props.demo}
          />
        )}
        <StatusSection {...props} />
        {!props.demo && <RememberMyPage token={props.token} />}
      </div>
    </main>
  );
}
