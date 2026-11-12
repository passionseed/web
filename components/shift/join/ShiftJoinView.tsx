import type { ReactNode } from "react";
import { ArrowRight, Check, CircleCheck, MessageCircle } from "lucide-react";

import { RisoBand, RisoPageTexture, labelClass } from "@/components/shift/ShiftRiso";
import { ShiftPayment } from "@/components/shift/ShiftPayment";
import { ShiftTopBar } from "@/components/shift/ShiftTopBar";
import { ConnectDiscordButton, SyncRolesButton } from "@/components/shift/join/ShiftJoinActions";
import { FLOW_TEXT, flowButtonClass, paper } from "@/components/shift/join/shiftFlowInk";
import { INK, MISREG_TEXT } from "@/components/shift/poster/riso";
import { SHIFT_PAYMENT, type ShiftCohort } from "@/lib/content/shift-cohort";
import type { ShiftDiscordAuthError } from "@/lib/shift/discordAuth";
import type { ApplicantSummary } from "@/lib/shift/paymentMessage";
import { DiscordIcon } from "./DiscordIcon";
import { DiscordSteps } from "./DiscordSteps";

/**
 * What an applicant sees at /shift/join/{token}, opened straight from the
 * apply page. One job per state: connect Discord, get into the server, or
 * open it. Until the slip is checked, every state also carries the payment
 * step, since leaving for Discord sign-in (or failing it) drops the apply page.
 */

/** Present only while the applicant still owes the fee. */
export interface ShiftJoinPayment {
  cohort: ShiftCohort;
  /** Pre-fills the slip message. Only for the signed-in applicant: it
   *  echoes their parent contact, and the connect state is open to anyone
   *  holding the link. */
  applicant?: ApplicantSummary;
}

export type ShiftJoinState =
  | { kind: "invalid" }
  | {
      kind: "connect";
      nickname: string;
      cohortName: string;
      paid: boolean;
      error: "no_discord" | "taken" | ShiftDiscordAuthError | null;
      payment: ShiftJoinPayment | null;
    }
  | {
      kind: "needs_invite";
      nickname: string;
      cohortName: string;
      inviteUrl: string | null;
      payment: ShiftJoinPayment | null;
    }
  | {
      kind: "in_server";
      nickname: string;
      cohortName: string;
      serverUrl: string | null;
      /** e.g. "พรุ่งนี้ วันพุธที่ 14 ตุลาคม"; null once the round has met. */
      meetLabel: string | null;
      payment: ShiftJoinPayment | null;
    };

const CONNECT_ERRORS = {
  no_discord: "ยังไม่ได้เชื่อม Discord ลองกดอีกครั้งนะ",
  taken: "ลิงก์นี้ผูกกับ Discord อีกบัญชีไปแล้ว ถ้าไม่ใช่เรา ทักพี่ใน LINE ได้เลย",
  discord_identity_exists: "Discord นี้มีบัญชี PassionSeed อยู่แล้ว กดปุ่มด้านล่างเพื่อเข้าสู่บัญชีนั้นและใช้ลิงก์นี้ต่อได้เลย",
  discord_email: "Discord ยังส่งอีเมลให้ระบบไม่ได้ เปิด Discord > ตั้งค่าผู้ใช้ > บัญชีของฉัน เพิ่มอีเมลและยืนยันให้เรียบร้อย แล้วกลับมากดปุ่มด้านล่างอีกครั้ง",
  discord_auth: "เข้าสู่ระบบด้วย Discord ไม่สำเร็จ ลองกดอีกครั้งได้เลย ใบสมัครกับลิงก์นี้ยังอยู่ครบ",
} as const;

export function Shell({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div
      className="relative min-h-screen font-bai-jamjuree antialiased"
      style={{ backgroundColor: INK.black, color: INK.paper }}
      lang="th"
    >
      <RisoPageTexture />
      <ShiftTopBar />
      <RisoBand>
        <div className="mx-auto max-w-md px-6">
          <p className={labelClass(eyebrow)} style={{ color: INK.yellow }}>
            {eyebrow}
          </p>
          <h1 className="mt-3 text-balance font-kodchasan text-[28px] font-bold leading-snug sm:text-[32px]" style={MISREG_TEXT}>
            {title}
          </h1>
        </div>
      </RisoBand>
      <main className="relative mx-auto max-w-md space-y-6 px-6 pb-20 pt-7">{children}</main>
    </div>
  );
}

export function Body({ children }: { children: ReactNode }) {
  return (
    <p className="text-[17px] leading-relaxed" style={{ color: FLOW_TEXT.body }}>
      {children}
    </p>
  );
}

export function LineHelp() {
  return (
    <p className="border-t pt-5 text-sm leading-relaxed" style={{ color: FLOW_TEXT.muted, borderColor: paper("33") }}>
      ติดตรงไหน ทักพี่ใน LINE{" "}
      <a
        href={SHIFT_PAYMENT.lineUrl}
        className="inline-flex min-h-12 items-center gap-2 font-semibold underline underline-offset-4"
        style={{ color: INK.paper }}
      >
        <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        {SHIFT_PAYMENT.lineId}
      </a>
    </p>
  );
}

/** The seat is held by the slip, not by joining Discord. */
function PaymentStep({ payment }: { payment: ShiftJoinPayment | null }) {
  if (!payment) return null;
  return (
    <section className="border-t pt-6" style={{ borderColor: paper("33") }}>
      <p className="mb-5 font-kodchasan text-xl font-semibold">ยืนยันที่นั่ง: โอนแล้วส่งสลิป</p>
      <ShiftPayment cohort={payment.cohort} applicant={payment.applicant} stacked />
    </section>
  );
}

function LinkButton({ href, children, primary }: { href: string; children: ReactNode; primary?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={flowButtonClass}
      data-variant={primary ? "discord" : "quiet"}
    >
      {children}
    </a>
  );
}

export function ShiftJoinView({ token, state }: { token: string; state: ShiftJoinState }) {
  switch (state.kind) {
    case "invalid":
      return (
        <Shell eyebrow="SHIFT" title="ลิงก์นี้ใช้ไม่ได้">
          <Body>ลิงก์อาจคัดลอกมาไม่ครบ หรือปิดไปแล้ว ส่งลิงก์นี้ให้พี่ดูใน LINE ได้เลย</Body>
          <LineHelp />
        </Shell>
      );

    case "connect":
      return (
        <Shell
          eyebrow={state.cohortName}
          title="เข้าห้องเรียน SHIFT"
        >
          {state.paid && (
            <p className="flex items-center gap-3 font-semibold" style={{ color: FLOW_TEXT.body }}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: INK.yellow, color: INK.black }}>
                <CircleCheck className="h-6 w-6" aria-hidden="true" />
              </span>
              {state.nickname} ชำระเงินแล้ว
            </p>
          )}
          <Body>เราเรียนและคุยกันใน Discord กดปุ่มนี้เพื่อเข้าห้องของ {state.cohortName}</Body>
          {state.error && (
            <p className="text-sm font-semibold leading-relaxed" style={{ color: FLOW_TEXT.warn }} role="alert">
              {CONNECT_ERRORS[state.error]}
            </p>
          )}
          <ConnectDiscordButton
            token={token}
            label={state.error === "discord_identity_exists" ? "ใช้ Discord บัญชีเดิมเข้าห้องเรียน" : "เข้าห้องเรียนด้วย Discord"}
          />
          <DiscordSteps />
          <PaymentStep payment={state.payment} />
          <LineHelp />
        </Shell>
      );

    case "needs_invite":
      return (
        <Shell eyebrow={state.cohortName} title="ต่อไป: เข้ากลุ่ม SHIFT">
          <Body>กดปุ่มที่ 1 แล้วเลือก Accept Invite / รับคำเชิญ ใน Discord</Body>
          {state.inviteUrl && (
            <LinkButton href={state.inviteUrl} primary>
              <DiscordIcon className="h-5 w-5 shrink-0" />
              1. เข้ากลุ่ม SHIFT ใน Discord
            </LinkButton>
          )}
          <p className="text-sm leading-relaxed" style={{ color: FLOW_TEXT.muted }}>
            เข้ากลุ่มแล้ว กลับมาหน้านี้ กดปุ่มที่ 2 เพื่อเปิดห้องของ {state.cohortName}
          </p>
          <SyncRolesButton token={token} />
          <PaymentStep payment={state.payment} />
          <LineHelp />
        </Shell>
      );

    case "in_server": {
      // Unpaid: in the server, but the seat waits on the slip, so paying
      // comes before the way out to Discord.
      const owes = state.payment !== null;
      const openDiscord = state.serverUrl && (
        <LinkButton href={state.serverUrl} primary={!owes}>
          <DiscordIcon className="h-5 w-5 shrink-0" />
          เปิดห้องเรียนใน Discord
          <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
        </LinkButton>
      );
      return (
        <Shell
          eyebrow={state.cohortName}
          title={owes ? `เข้าเซิร์ฟแล้ว ${state.nickname}` : `เรียบร้อย ${state.nickname}`}
        >
          <div className="flex items-center gap-3" style={{ color: FLOW_TEXT.body }}>
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: INK.yellow, color: INK.black }}
            >
              <Check className="h-5 w-5" />
            </span>
            <span>
              {owes
                ? "เข้าห้องของรุ่นแล้ว เหลือโอนค่าสมัครแล้วส่งสลิป รอพี่ยืนยันที่นั่งในแชท"
                : state.meetLabel
                  ? `เจอกัน${state.meetLabel} ใน Discord`
                  : "เจอกันในห้องของรุ่น"}
            </span>
          </div>
          {owes ? (
            <>
              <PaymentStep payment={state.payment} />
              {openDiscord}
            </>
          ) : (
            openDiscord
          )}
          <LineHelp />
        </Shell>
      );
    }
  }
}
