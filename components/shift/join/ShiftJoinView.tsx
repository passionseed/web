import type { ReactNode } from "react";
import { Check } from "lucide-react";

import { RisoBand, RisoPageTexture, labelClass } from "@/components/shift/ShiftRiso";
import { ShiftTopBar } from "@/components/shift/ShiftTopBar";
import { ConnectDiscordButton, SyncRolesButton } from "@/components/shift/join/ShiftJoinActions";
import { FLOW_TEXT, flowButtonClass, paper } from "@/components/shift/join/shiftFlowInk";
import { INK, MISREG_TEXT } from "@/components/shift/poster/riso";
import { SHIFT_PAYMENT } from "@/lib/content/shift-cohort";
import type { ShiftDiscordAuthError } from "@/lib/shift/discordAuth";

/**
 * What a paid student sees at /shift/join/{token}. One job per state:
 * connect Discord, get into the server, or open it.
 */

export type ShiftJoinState =
  | { kind: "invalid" }
  | { kind: "pending"; nickname: string; cohortName: string }
  | {
      kind: "connect";
      nickname: string;
      cohortName: string;
      error: "no_discord" | "taken" | ShiftDiscordAuthError | null;
    }
  | { kind: "needs_invite"; nickname: string; cohortName: string; inviteUrl: string | null }
  | {
      kind: "in_server";
      nickname: string;
      cohortName: string;
      serverUrl: string | null;
      /** e.g. "พรุ่งนี้ วันพุธที่ 14 ตุลาคม"; null once the round has met. */
      meetLabel: string | null;
    };

const CONNECT_ERRORS = {
  no_discord: "ยังไม่ได้เชื่อม Discord ลองกดอีกครั้งนะ",
  taken: "ลิงก์นี้ผูกกับ Discord อีกบัญชีไปแล้ว ถ้าไม่ใช่เรา ทักพี่ใน LINE ได้เลย",
  discord_identity_exists: "Discord นี้มีบัญชี PassionSeed อยู่แล้ว กดปุ่มด้านล่างเพื่อเข้าสู่บัญชีนั้นและใช้ลิงก์นี้ต่อได้เลย",
  discord_email: "Discord ยังส่งอีเมลให้ระบบไม่ได้ เปิด Discord > ตั้งค่าผู้ใช้ > บัญชีของฉัน เพิ่มอีเมลและยืนยันให้เรียบร้อย แล้วกลับมากดปุ่มด้านล่างอีกครั้ง",
  discord_auth: "เข้าสู่ระบบด้วย Discord ไม่สำเร็จ ลองกดอีกครั้งได้เลย ลิงก์และที่นั่งยังอยู่",
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
        className="inline-flex min-h-12 items-center font-semibold underline underline-offset-4"
        style={{ color: INK.paper }}
      >
        {SHIFT_PAYMENT.lineId}
      </a>
    </p>
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
          <Body>ลิงก์อาจคัดลอกมาไม่ครบ ส่งลิงก์นี้ให้พี่ดูใน LINE ได้เลย</Body>
          <LineHelp />
        </Shell>
      );

    case "pending":
      return (
        <Shell eyebrow={state.cohortName} title={`รอพี่ยืนยันสลิปอยู่นะ ${state.nickname}`}>
          <Body>
            ลิงก์นี้เป็นของเราคนเดียว เก็บไว้ได้เลย พอพี่เช็กสลิปใน LINE เสร็จ กลับมากดลิงก์เดิมนี้ แล้วเชื่อม Discord
            เพื่อเข้าห้องของรุ่น
          </Body>
          <LinkButton href={SHIFT_PAYMENT.lineUrl}>ยังไม่ได้ส่งสลิป? ส่งใน LINE</LinkButton>
          <LineHelp />
        </Shell>
      );

    case "connect":
      return (
        <Shell eyebrow={state.cohortName} title={`${state.nickname} เหลืออีกขั้นเดียว`}>
          <Body>
            ได้รับเงินแล้ว ที่นั่งเป็นของเรา กดเชื่อม Discord ทีเดียว ระบบพาเข้าเซิร์ฟ {state.cohortName}{" "}
            พร้อมห้องของรุ่นให้เลย ไม่ต้องสมัครบัญชีใหม่ ไม่ต้องกรอกโปรไฟล์
          </Body>
          {state.error && (
            <p className="text-sm font-semibold leading-relaxed" style={{ color: FLOW_TEXT.warn }} role="alert">
              {CONNECT_ERRORS[state.error]}
            </p>
          )}
          <ConnectDiscordButton
            token={token}
            label={state.error === "discord_identity_exists" ? "เข้าสู่ระบบด้วย Discord บัญชีเดิม" : undefined}
          />
          <LineHelp />
        </Shell>
      );

    case "needs_invite":
      return (
        <Shell eyebrow={state.cohortName} title="เชื่อม Discord แล้ว">
          <Body>
            เหลือแค่เข้าเซิร์ฟ กดลิงก์เชิญ เข้าให้เรียบร้อย แล้วกลับมากดรับ role ที่หน้านี้ ห้องของรุ่นจะโผล่ขึ้นมาเอง
          </Body>
          {state.inviteUrl && (
            <LinkButton href={state.inviteUrl} primary>
              1. เข้าเซิร์ฟ Discord
            </LinkButton>
          )}
          <SyncRolesButton token={token} />
          <LineHelp />
        </Shell>
      );

    case "in_server":
      return (
        <Shell eyebrow={state.cohortName} title={`เรียบร้อย ${state.nickname}`}>
          <div className="flex items-center gap-3" style={{ color: FLOW_TEXT.body }}>
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: INK.yellow, color: INK.black }}
            >
              <Check className="h-5 w-5" />
            </span>
            <span>
              {state.meetLabel ? `เจอกัน${state.meetLabel} ใน Discord` : "เจอกันในห้องของรุ่น"}
            </span>
          </div>
          {state.serverUrl && (
            <LinkButton href={state.serverUrl} primary>
              เปิด Discord
            </LinkButton>
          )}
          <LineHelp />
        </Shell>
      );
  }
}
