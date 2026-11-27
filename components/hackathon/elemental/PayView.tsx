import { EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";
import { SHIFT_PAYMENT } from "@/lib/content/shift-cohort";
import { shareSource } from "@/lib/hackathon/elemental/share";
import type { ElementalDiscordOutcome } from "@/lib/hackathon/elemental/discordLink";
import { teamLabel } from "@/lib/hackathon/elemental/team-name";
import type { TeamStyleCardData } from "@/lib/hackathon/elemental/team-style";
import type { PublicRegistration } from "@/lib/supabase/hackathon-event-registrations";

import { BuddyPass, IouSlip } from "./BuddyPass";
import { ConnectDiscord } from "./ConnectDiscord";
import { PayWithSlip } from "./PayWithSlip";
import { placeFor, ticketNumber } from "./places";
import { TeamInvite } from "./TeamInvite";
import { Ticket } from "./Ticket";
import { ShareCard, type ShareCardData } from "./share/ShareCard";
import shell from "./share/shell.module.css";
import { Body, EditorialLink, Fine, H1, Page, PrimaryButton, SecondaryButton, v } from "./share/ui";
import { TeamLine } from "./team-style/TeamLine";
import { TrackStep } from "./TrackStep";

/**
 * One person's own page after signing up: pay, wait for a check, or the
 * seat. Shared by /hackathon/join/[token] and the dev demo. Cream paper
 * (merged direction §1): the paper Page gives the ink top bar, the body font
 * and the wordmark footer; the Ticket and the share slab are dark objects on it.
 */

type Props = {
  token: string;
  reg: Pick<PublicRegistration, "status" | "teamName" | "memberCount" | "amountBaht" | "memberNicknames" | "team" | "isTeamStarter" | "teamPosition" | "discordJoined"> &
    Partial<Pick<PublicRegistration, "buddyPass" | "buddyOf">>;
  qrSrc: string | null;
  links: { line: string | null; discord: string | null };
  /** How the last Discord sign-in from this page went (?discord=…). */
  discordOutcome?: ElementalDiscordOutcome | null;
  /** Share-for-a-free-seat card (./share/ShareCard), while sharing is open; paid or not. */
  share?: ShareCardData | null;
  /**
   * The team's board name, style and rank, once the board has launched. Rendered as
   * <TeamLine token={token} data={teamStyle} demo={demo} /> (./team-style/TeamLine)
   * inside the share slab.
   */
  teamStyle?: TeamStyleCardData | null;
  demo?: boolean;
};

export type { ShareCardData };

/** The page title, with the event's date and venue in one fine line under it. */
function Title({ children }: { children: string }) {
  return (
    <div>
      <H1>{children}</H1>
      <Fine className="mt-2">
        {ELEMENTAL.edition} Hackathon · {thaiDateLine()} · {ELEMENTAL.venueTh}
      </Fine>
    </div>
  );
}

/** ConnectDiscord draws its own button: the SecondaryButton's look, from the same classes. */
const secondaryClass = `${shell.button} ${shell.secondary} inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-[2px] px-6 py-3 text-center text-base`;
const secondaryStyle = { fontFamily: EL_FONT.body, fontWeight: 600, lineHeight: "24px" } as const;

/** "มีคำถามทักไลน์ @passionseed", the page's help line. */
function Help() {
  return (
    <Fine>
      มีคำถามทักไลน์{" "}
      <a href={SHIFT_PAYMENT.lineUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
        {SHIFT_PAYMENT.lineId}
      </a>
    </Fine>
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

/** The team card; the person who started the team can rename it from here. */
function Team(props: Props) {
  const { token, reg, demo, share } = props;
  if (!reg.team) return null;
  // While sharing runs, the invite carries this person's share tag, so friends who join count toward their link.
  const source = share ? shareSource(share.code) : undefined;
  return <TeamInvite team={reg.team} renameToken={reg.isTeamStarter ? token : undefined} demo={demo} source={source} nameStyle={props.teamStyle?.style} />;
}

/**
 * "ลิงก์ของฉัน": the dark share slab (the link, its SeatCard and the team's
 * one-line TeamLine), under the payment so paying stays the first thing.
 */
function ShareSlot({ token, share, teamStyle, demo, className }: Props & { className?: string }) {
  if (!share) return null;
  return (
    <div className={className}>
      <ShareCard share={share} teamRow={teamStyle ? <TeamLine token={token} data={teamStyle} demo={demo} /> : undefined} />
    </div>
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
      <SecondaryButton href={links.discord} external full arrow>
        อยู่ใน Discord แล้ว เปิดเลย
      </SecondaryButton>
    ) : (
      <Body className="self-center">อยู่ใน Discord ของงานแล้ว</Body>
    );
  }
  const message = discordOutcome ? DISCORD_OUTCOME_COPY[discordOutcome] : undefined;
  return (
    <div className="space-y-2">
      <ConnectDiscord token={token} className={secondaryClass} style={secondaryStyle} demo={demo} />
      {message && (
        <p role="status" style={{ fontSize: 14, lineHeight: "22px", color: v.error }}>
          {message}
        </p>
      )}
      {links.discord && (
        <EditorialLink href={links.discord} external size="sm">
          หรือเข้าด้วยลิงก์เชิญ
        </EditorialLink>
      )}
    </div>
  );
}

function PaidSection(props: Props) {
  const { reg, links, demo } = props;
  const { who, people } = whoAndPeople(reg);
  return (
    <section className="space-y-6">
      {!demo && <TrackStep step="paid" />}
      <Title>ได้ที่นั่งแล้ว</Title>
      <Ticket
        who={who}
        people={people}
        place={placeFor(props.token, reg.teamPosition)}
        number={ticketNumber(props.token)}
      />
      <div className="space-y-3">
        <Body>ขั้นต่อไป เข้ากลุ่มของงาน ประกาศ ทีม และงานทั้งหมดอยู่ที่นี่</Body>
        <div className="grid gap-2 sm:grid-cols-2">
          {links.line && (
            <PrimaryButton href={links.line} external icon="chat" full>
              เข้ากลุ่ม LINE
            </PrimaryButton>
          )}
          <DiscordStep {...props} />
        </div>
        {!reg.discordJoined && <Body secondary>กดเข้า Discord แล้วระบบพาเข้ากลุ่มของงานให้เลย และได้บัญชี PassionSeed ไปด้วย ไม่ต้องสมัครแยก</Body>}
      </div>
      <Team {...props} />
      <BuddySection reg={reg} />
      <ShareSlot {...props} />
      <Help />
    </section>
  );
}

function ReviewSection(props: Props) {
  return (
    <section className="space-y-4">
      <Title>ได้รับสลิปแล้ว</Title>
      <Body>ระบบตรวจสลิปอัตโนมัติไม่ได้ในตอนนี้ ทีมงานจะตรวจให้เองภายใน 24 ชั่วโมง แล้วหน้านี้จะเปลี่ยนเป็นยืนยันที่นั่ง</Body>
      <Body secondary>ลิงก์กลุ่ม LINE และ Discord ของงานขึ้นที่หน้านี้เมื่อสลิปผ่าน</Body>
      <SecondaryButton href={SHIFT_PAYMENT.lineUrl} external icon="chat" full>
        {`มีคำถาม ทักไลน์ ${SHIFT_PAYMENT.lineId}`}
      </SecondaryButton>
      <Team {...props} />
      <BuddySection reg={props.reg} />
      <ShareSlot {...props} />
    </section>
  );
}

function CancelledSection() {
  return (
    <section className="space-y-4">
      <Title>การสมัครนี้ถูกยกเลิก</Title>
      <Body>ถ้าคิดว่าผิดพลาด ทักทีมงานได้เลย</Body>
      <PrimaryButton href={SHIFT_PAYMENT.lineUrl} external icon="chat" full>
        {`ทักไลน์ ${SHIFT_PAYMENT.lineId}`}
      </PrimaryButton>
    </section>
  );
}

function PendingSection(props: Props) {
  const { token, reg, qrSrc, demo } = props;
  return (
    <section>
      {!demo && <TrackStep step="pay" />}
      <Title>อีกขั้นเดียว</Title>
      <Body secondary className="mt-3">
        โอนแล้วส่งสลิป ที่นั่งยืนยันทันทีที่สลิปผ่าน
      </Body>
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
      {reg.team && (
        <div className="mt-10">
          <Team {...props} />
        </div>
      )}
      <ShareSlot {...props} className="mt-10" />
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
    <Page surface="paper">
      <StatusSection {...props} />
    </Page>
  );
}
