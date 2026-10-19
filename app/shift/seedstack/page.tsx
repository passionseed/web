import type { Metadata } from "next";

import { Body, LineHelp, Shell } from "@/components/shift/join/ShiftJoinView";
import { SeedstackAccount } from "@/components/shift/seedstack/SeedstackAccount";
import { SeedstackConnect } from "@/components/shift/seedstack/SeedstackConnect";
import { SeedstackDashboard } from "@/components/shift/seedstack/SeedstackDashboard";
import { SeedstackDiscordButton } from "@/components/shift/seedstack/SeedstackDiscordButton";
import { SeedstackNotice } from "@/components/shift/seedstack/SeedstackNotice";
import { SeedstackPrivacy } from "@/components/shift/seedstack/SeedstackPrivacy";
import { describeSeedstackAccount } from "@/components/shift/seedstack/seedstackAccountInfo";
import { NOTES } from "@/lib/content/pathlab-page";
import { isAnonymousUser } from "@/lib/supabase/auth";
import { canLinkDevice, seedstackConsentState, type SeedstackConsentState } from "@/lib/seedstack/consent";
import { findShiftNickname, getSeedstackConsent, getSeedstackDashboard } from "@/lib/seedstack/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "เชื่อม SeedStack | PassionSeed",
  robots: { index: false, follow: false },
};

const TITLES = {
  none: "เชื่อม SeedStack กับพี่ mentor",
  withdrawn: "เชื่อม SeedStack กับพี่ mentor",
  awaiting_parent: "เชื่อมเครื่องได้เลย รอผู้ปกครองตอบ",
  parent_declined: "ผู้ปกครองยังไม่ยินยอม",
  active: "พร้อมเชื่อม OpenCode",
} as const;

/** Once a computer is linked, the page is the student's own SeedStack home. */
function titleFor(state: SeedstackConsentState, linked: boolean): string {
  if (!linked) return TITLES[state];
  if (state === "awaiting_parent") return "เชื่อมแล้ว รอผู้ปกครองตอบ";
  if (state === "parent_declined") return "เชื่อมแล้ว ข้อมูลอยู่ในเครื่องเรา";
  return "SeedStack ของเรา";
}

async function signedInUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user && !isAnonymousUser(data.user) ? data.user : null;
}

export default async function SeedstackConnectPage() {
  const here = "/shift/seedstack";
  const user = await signedInUser();

  if (!user) {
    return (
      <Shell eyebrow="SeedStack" title="เข้าสู่ระบบด้วย Discord">
        <Body>ถ้าอยู่ SHIFT ใช้ Discord บัญชีเดียวกับที่เข้าเซิร์ฟ พี่จะได้รู้ว่าเป็นเรา ถ้าไม่ได้อยู่ SHIFT ใช้บัญชีไหนก็ได้</Body>
        <SeedstackDiscordButton next={here} />
        <LineHelp />
      </Shell>
    );
  }

  const [nickname, consent] = await Promise.all([findShiftNickname(user.id), getSeedstackConsent(user.id)]);
  const state = seedstackConsentState(consent);
  const account = describeSeedstackAccount(user, nickname);
  const agreed = canLinkDevice(state);
  const dashboard = agreed ? await getSeedstackDashboard(user.id) : null;
  const linked = (dashboard?.devices ?? 0) > 0;

  return (
    <Shell eyebrow={nickname ? `SeedStack · ${nickname}` : "SeedStack"} title={titleFor(state, linked)}>
      <SeedstackAccount account={account} next={here} />
      {!agreed && (
        <>
          <Body>
            SeedStack ใช้ AI เป็นไกด์ส่วนตัว แต่คนที่ช่วยเราจริงคือพี่ mentor เชื่อมครั้งเดียว พี่จะเห็นว่าเราอยู่ขั้นไหน
            แล้วเข้ามาช่วยตอนติด โดยไม่ต้องรอเราโพสต์
          </Body>
          <SeedstackNotice variant="summary" />
          <p className="text-[13px]">
            <span className="pathlab-note">{NOTES.seedstack}</span>
          </p>
        </>
      )}
      {dashboard && linked ? (
        <SeedstackDashboard state={state} data={dashboard} now={Date.now()} />
      ) : (
        <SeedstackConnect state={state} devices={dashboard?.devices ?? 0} />
      )}
      {agreed && <SeedstackPrivacy />}
      <LineHelp />
    </Shell>
  );
}
