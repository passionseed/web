import type { Metadata } from "next";

import { PdpaNotice } from "@/components/shift/consent/PdpaNotice";
import { Body, LineHelp, Shell } from "@/components/shift/join/ShiftJoinView";
import { ShiftParentForm, type ShiftParentDecision } from "@/components/shift/parent/ShiftParentForm";
import { formatThaiDateRange, getShiftCohortByName, priceLabel } from "@/lib/content/shift-cohort";
import { REFUND_HOW } from "@/lib/content/shift-refund";
import { SEEDSTACK_NOTICE } from "@/lib/seedstack/consent";
import { SHIFT_NOTICE, parentConsentState, type ParentConsentState } from "@/lib/shift/parentConsent";
import { findShiftParentTarget } from "@/lib/shift/parentConsentServer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ความยินยอมของผู้ปกครอง | SHIFT",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

function parentDecision(state: ParentConsentState): ShiftParentDecision | null {
  return state === "agreed" || state === "declined" || state === "withdrawn" ? state : null;
}

export default async function ShiftParentPage({ params }: PageProps) {
  const { token } = await params;
  const app = await findShiftParentTarget(token);
  const cohort = app ? getShiftCohortByName(app.cohort) : null;

  if (!app || !cohort) {
    return (
      <Shell eyebrow="SHIFT" title="ลิงก์นี้ใช้ไม่ได้แล้ว">
        <Body>ลิงก์อาจหมดอายุหรือถูกเปลี่ยนแล้ว ขอลิงก์ใหม่ได้จากทีมงานทาง LINE ค่ะ</Body>
        <LineHelp />
      </Shell>
    );
  }

  const state = parentConsentState(app);
  const who = app.nickname;

  if (state === "not_needed") {
    return (
      <Shell eyebrow="SHIFT" title="ไม่ต้องใช้ลิงก์นี้แล้วค่ะ">
        <Body>
          {who} อายุครบ 20 ปีแล้ว ตามกฎหมาย PDPA ความยินยอมของ {who} เองก็เพียงพอ
          ไม่ต้องให้ผู้ปกครองยินยอมเพิ่มแล้วค่ะ ขอบคุณที่สละเวลาเปิดลิงก์นี้นะคะ
        </Body>
        <LineHelp />
      </Shell>
    );
  }

  return (
    <Shell eyebrow={cohort.name} title={`ขอความยินยอมจากผู้ปกครองของ ${who}`}>
      <Body>
        {app.full_name} ({who}) สมัครเข้าร่วม {cohort.name} ของ PassionSeed
        วันที่ {formatThaiDateRange(cohort.startDate, cohort.endDate)} เวลา {cohort.sessionTime} น. ทางออนไลน์
        ค่าเข้าร่วม {priceLabel(cohort)}
      </Body>
      {cohort.priceBaht > 0 && <Body>{REFUND_HOW}</Body>}
      <Body>
        {who} อายุยังไม่ถึง 20 ปี กฎหมาย PDPA จึงกำหนดให้ผู้ปกครองยินยอมด้วย
        ทีมงานยืนยันที่นั่งได้หลังผู้ปกครองยินยอมแล้วเท่านั้นค่ะ
      </Body>
      <PdpaNotice notice={SHIFT_NOTICE} variant="full" />
      <PdpaNotice
        notice={SEEDSTACK_NOTICE}
        variant="collapsed"
        collapsedLabel="AI ติดตามความคืบหน้า (SeedStack) เก็บอะไรบ้าง"
      />
      <ShiftParentForm
        token={token}
        decision={parentDecision(state)}
        nickname={who}
        fullName={app.full_name}
        cohortName={cohort.name}
      />
      <LineHelp />
    </Shell>
  );
}
