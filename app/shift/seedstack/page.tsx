import type { Metadata } from "next";
import Link from "next/link";

import { Body, LineHelp, Shell } from "@/components/shift/join/ShiftJoinView";
import { shiftJoinButtonClass } from "@/components/shift/join/ShiftJoinActions";
import { INK } from "@/components/shift/poster/riso";
import { SeedstackConnect } from "@/components/shift/seedstack/SeedstackConnect";
import { SeedstackNotice } from "@/components/shift/seedstack/SeedstackNotice";
import { isAnonymousUser } from "@/lib/supabase/auth";
import { seedstackConsentState } from "@/lib/seedstack/consent";
import { getSeedstackConsent } from "@/lib/seedstack/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "เชื่อม SeedStack | PassionSeed",
  robots: { index: false, follow: false },
};

const TITLES = {
  none: "ให้พี่ mentor เห็นความคืบหน้า",
  withdrawn: "ให้พี่ mentor เห็นความคืบหน้า",
  awaiting_parent: "รอผู้ปกครองตอบ",
  parent_declined: "ผู้ปกครองยังไม่ยินยอม",
  active: "พร้อมเชื่อม OpenCode",
} as const;

export default async function SeedstackConnectPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user && !isAnonymousUser(data.user) ? data.user : null;

  if (!user) {
    return (
      <Shell eyebrow="SeedStack" title="เข้าสู่ระบบก่อน">
        <Body>ใช้บัญชี PassionSeed เดียวกับที่ผูก Discord ตอนเข้า SHIFT</Body>
        <Link
          href="/login?next=/shift/seedstack"
          className={shiftJoinButtonClass}
          style={{ backgroundColor: INK.yellow, color: INK.black }}
        >
          เข้าสู่ระบบ
        </Link>
        <LineHelp />
      </Shell>
    );
  }

  const state = seedstackConsentState(await getSeedstackConsent(user.id));

  return (
    <Shell eyebrow="SeedStack" title={TITLES[state]}>
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
