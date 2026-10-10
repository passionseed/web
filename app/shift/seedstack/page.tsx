import type { Metadata } from "next";

import { Body, LineHelp, Shell } from "@/components/shift/join/ShiftJoinView";
import { SeedstackAccount } from "@/components/shift/seedstack/SeedstackAccount";
import { SeedstackConnect } from "@/components/shift/seedstack/SeedstackConnect";
import { SeedstackDiscordButton } from "@/components/shift/seedstack/SeedstackDiscordButton";
import { SeedstackNotice } from "@/components/shift/seedstack/SeedstackNotice";
import { describeSeedstackAccount } from "@/components/shift/seedstack/seedstackAccountInfo";
import { isAnonymousUser } from "@/lib/supabase/auth";
import { seedstackConsentState } from "@/lib/seedstack/consent";
import { findShiftNickname, getSeedstackConsent } from "@/lib/seedstack/server";
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

  return (
    <Shell eyebrow={nickname ? `SeedStack · ${nickname}` : "SeedStack"} title={TITLES[state]}>
      <SeedstackAccount account={account} next={here} />
      <Body>
        SeedStack ใช้ AI เป็นไกด์ส่วนตัว แต่คนที่ช่วยเราจริงคือพี่ mentor เชื่อมครั้งเดียว พี่จะเห็นว่าเราอยู่ขั้นไหน
        แล้วเข้ามาช่วยตอนติด โดยไม่ต้องรอเราโพสต์
      </Body>
      <SeedstackNotice />
      <SeedstackConnect state={state} />
      <LineHelp />
    </Shell>
  );
}
