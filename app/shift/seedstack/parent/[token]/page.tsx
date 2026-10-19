import type { Metadata } from "next";

import { Body, LineHelp, Shell } from "@/components/shift/join/ShiftJoinView";
import { SeedstackNotice } from "@/components/shift/seedstack/SeedstackNotice";
import { SeedstackParentForm } from "@/components/shift/seedstack/SeedstackParentForm";
import { findParentLinkTarget, parentNoLongerNeeded } from "@/lib/seedstack/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ความยินยอมของผู้ปกครอง | SeedStack",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function SeedstackParentPage({ params }: PageProps) {
  const { token } = await params;
  const target = token.length >= 32 ? await findParentLinkTarget(token) : null;

  if (!target || target.state === "none" || target.state === "withdrawn") {
    return (
      <Shell eyebrow="SeedStack" title="ลิงก์นี้ใช้ไม่ได้แล้ว">
        <Body>ลิงก์อาจหมดอายุหรือถูกยกเลิก ขอลิงก์ใหม่ได้ ผู้เรียนสร้างได้เองที่หน้า SeedStack ค่ะ</Body>
        <LineHelp />
      </Shell>
    );
  }

  const who = target.nickname ?? "ผู้เรียน";

  if (parentNoLongerNeeded(target)) {
    return (
      <Shell eyebrow="SeedStack" title="ไม่ต้องใช้ลิงก์นี้แล้วค่ะ">
        <Body>
          {who} อายุครบ 20 ปีแล้ว ตามกฎหมาย PDPA ความยินยอมของ {who} เองก็เพียงพอ
          ไม่ต้องให้ผู้ปกครองยินยอมเพิ่มแล้วค่ะ ขอบคุณที่สละเวลาเปิดลิงก์นี้นะคะ
        </Body>
        <LineHelp />
      </Shell>
    );
  }

  return (
    <Shell eyebrow="SHIFT x SeedStack" title={`ขอความยินยอมจากผู้ปกครองของ ${who}`}>
      <Body>
        ใน SHIFT {who} ใช้ SeedStack เครื่องมือที่ใช้ AI เป็นไกด์ส่วนตัว ช่วยตั้งเครื่องและสร้างโปรเจกต์ของตัวเอง
        AI ไม่ได้ทำแทน {who} เป็นคนลงมือเอง ถ้ายินยอม ระบบจะส่งความคืบหน้าสั้นๆ ให้พี่ mentor เห็น
        เพื่อเข้าไปช่วยได้ทันเวลาที่ติด กฎหมาย PDPA กำหนดให้ผู้ที่อายุยังไม่ถึง 20 ปีต้องได้รับความยินยอมจากผู้ปกครองด้วย
        ไม่ยินยอมก็ยังเรียน SHIFT ได้ครบทุกอย่างค่ะ
      </Body>
      <SeedstackNotice />
      <SeedstackParentForm token={token} parentDecision={target.parentDecision} />
      <LineHelp />
    </Shell>
  );
}
