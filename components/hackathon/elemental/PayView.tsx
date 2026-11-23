import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";
import { SHIFT_PAYMENT } from "@/lib/content/shift-cohort";
import type { PublicRegistration } from "@/lib/supabase/hackathon-event-registrations";

import styles from "./join/join.module.css";
import { PayWithSlip } from "./PayWithSlip";
import { TeamInvite } from "./TeamInvite";
import { TrackStep } from "./TrackStep";

/**
 * One person's own page after signing up: pay, wait for a check, or the
 * seat. Shared by /hackathon/join/[token] and the dev demo.
 */

type Props = {
  token: string;
  reg: Pick<PublicRegistration, "status" | "teamName" | "memberCount" | "amountBaht" | "memberNicknames" | "team">;
  qrSrc: string | null;
  links: { line: string | null; discord: string | null };
  demo?: boolean;
};

function Title({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-5xl sm:text-6xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.05 }}>
      {children}
    </h1>
  );
}

function Seat({ who, people, amountBaht }: { who: string; people: string; amountBaht: number }) {
  return (
    <div className={`${styles.pop} overflow-hidden rounded-3xl`} style={{ backgroundColor: EL.char, color: EL.cream }}>
      <div className="p-6 sm:p-8">
        <p className="text-4xl sm:text-5xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300, fontStyle: "italic" }}>
          {ELEMENTAL.edition}
        </p>
        <p className="mt-6 text-2xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
          {who}
        </p>
        <p className="mt-1 text-sm" style={{ color: EL.creamSoft }}>{people}</p>
      </div>
      <div
        className="grid grid-cols-2 gap-4 border-t border-dashed px-6 py-5 text-sm sm:px-8"
        style={{ borderColor: "rgba(243,239,230,0.25)" }}
      >
        <div>
          <p className="text-xs" style={{ color: EL.creamSoft }}>วันงาน</p>
          <p className="mt-1">{thaiDateLine()}</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: EL.creamSoft }}>ที่ไหน</p>
          <p className="mt-1">{ELEMENTAL.venueTh}</p>
        </div>
        <div className="col-span-2">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" style={{ color: EL.toxicGreen }} aria-hidden="true" /> ชำระแล้ว ฿{amountBaht.toLocaleString("en-US")}
          </span>
        </div>
      </div>
    </div>
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
  if (reg.team) return { who, people: `ทีม ${reg.team.name}` };
  return { who, people: reg.memberCount > 1 ? `${reg.memberCount} คน` : "มาคนเดียว" };
}

function PaidSection({ reg, links, demo }: Props) {
  const { who, people } = whoAndPeople(reg);
  return (
    <section className="mt-6 space-y-6">
      {!demo && <TrackStep step="paid" />}
      <Title>ได้ที่นั่งแล้ว</Title>
      <Seat who={who} people={people} amountBaht={reg.amountBaht} />
      {links.line || links.discord ? (
        <div className="space-y-3">
          <p className="text-lg">ขั้นต่อไป เข้ากลุ่มของงาน ประกาศ ทีม และงานทั้งหมดอยู่ที่นี่</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {links.line && (
              <a href={links.line} target="_blank" rel="noopener noreferrer" className={primary} style={filled}>
                เข้ากลุ่ม LINE
              </a>
            )}
            {links.discord && (
              <a href={links.discord} target="_blank" rel="noopener noreferrer" className={primary} style={outline}>
                เข้า Discord
              </a>
            )}
          </div>
        </div>
      ) : (
        <p style={{ color: EL.inkSoft }}>ทีมงานจะส่งลิงก์เข้า Discord ทางอีเมลและเบอร์โทรที่ให้ไว้ ก่อนวันงาน</p>
      )}
      {reg.team && <TeamInvite team={reg.team} />}
      <p className="text-sm" style={{ color: EL.inkSoft }}>
        มีคำถามทักไลน์ {SHIFT_PAYMENT.lineId} ·{" "}
        <Link href="/hackathon/elemental" className="underline underline-offset-4">
          กลับหน้า {ELEMENTAL.edition} Hackathon
        </Link>
      </p>
    </section>
  );
}

function ReviewSection({ reg }: Props) {
  return (
    <section className="mt-6 space-y-4">
      <Title>ได้รับสลิปแล้ว</Title>
      <p className="text-lg">
        ระบบตรวจสลิปอัตโนมัติไม่ได้ในตอนนี้ ทีมงานจะตรวจให้เองภายใน 24 ชั่วโมง แล้วหน้านี้จะเปลี่ยนเป็นยืนยันที่นั่ง
      </p>
      <p style={{ color: EL.inkSoft }}>ลิงก์กลุ่ม LINE และ Discord ของงานขึ้นที่หน้านี้เมื่อสลิปผ่าน</p>
      <LineButton label={`มีคำถาม ทักไลน์ ${SHIFT_PAYMENT.lineId}`} style={outline} />
      {reg.team && <TeamInvite team={reg.team} />}
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

function PendingSection({ token, reg, qrSrc, demo }: Props) {
  return (
    <section className="mt-6">
      {!demo && <TrackStep step="pay" />}
      <Title>อีกขั้นเดียว</Title>
      <p className="mt-3 text-pretty text-lg" style={{ color: EL.inkSoft }}>
        โอนแล้วส่งสลิป ที่นั่งยืนยันทันทีที่สลิปผ่าน
      </p>
      <div className="mt-8">
        <PayWithSlip token={token} amountBaht={reg.amountBaht} qrSrc={qrSrc} demo={demo} />
      </div>
      {reg.team && (
        <div className="mt-10">
          <TeamInvite team={reg.team} />
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
          {ELEMENTAL.edition} Hackathon · {thaiDateLine()}
        </p>
        <StatusSection {...props} />
      </div>
    </main>
  );
}
