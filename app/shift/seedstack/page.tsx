import type { Metadata } from "next";

import { Body, LineHelp, Shell } from "@/components/shift/join/ShiftJoinView";
import { SeedstackConnect } from "@/components/shift/seedstack/SeedstackConnect";
import { SeedstackDiscordButton } from "@/components/shift/seedstack/SeedstackDiscordButton";
import { SeedstackNotice } from "@/components/shift/seedstack/SeedstackNotice";
import { isAnonymousUser } from "@/lib/supabase/auth";
import { seedstackConsentState } from "@/lib/seedstack/consent";
import { findShiftStudent, getSeedstackConsent } from "@/lib/seedstack/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "เชื่อม SeedStack | PassionSeed",
  robots: { index: false, follow: false },
};

const TITLES = {
  none: "ให้พี่ mentor เห็นความคืบหน้า",
  withdrawn: "ให้พี่ mentor เห็นความคืบหน้า",
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
        <Body>ใช้ Discord บัญชีเดียวกับที่เชื่อมตอนเข้าเซิร์ฟ SHIFT ระบบจะรู้เองว่าเป็นเรา</Body>
        <SeedstackDiscordButton next={here} />
        <LineHelp />
      </Shell>
    );
  }

  const student = await findShiftStudent(user.id);
  if (!student) {
    return (
      <Shell eyebrow="SeedStack" title="บัญชีนี้ยังไม่ได้ผูกกับ SHIFT">
        <Body>
          SeedStack เชื่อมได้เฉพาะนักเรียน SHIFT ที่เชื่อม Discord ผ่านลิงก์ในข้อความยืนยันการจ่ายเงินแล้ว
          ถ้าเคยเชื่อมด้วย Discord อีกบัญชี ลองเข้าใหม่ด้วยบัญชีนั้น
        </Body>
        <SeedstackDiscordButton next={here} label="เข้าด้วย Discord บัญชีอื่น" />
        <LineHelp />
      </Shell>
    );
  }

  const state = seedstackConsentState(await getSeedstackConsent(user.id));

  return (
    <Shell eyebrow={`SeedStack · ${student.nickname}`} title={TITLES[state]}>
      <Body>
        SeedStack ทำงานได้เต็มที่โดยไม่ต้องเชื่อมอะไรเลย หน้านี้มีไว้ถ้าอยากให้พี่ mentor เห็นว่าเราอยู่ขั้นไหน
        จะได้เข้ามาช่วยตอนติด โดยไม่ต้องรอเราโพสต์
      </Body>
      <SeedstackNotice />
      <SeedstackConnect state={state} />
      <LineHelp />
    </Shell>
  );
}
