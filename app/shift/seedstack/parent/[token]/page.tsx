import type { Metadata } from "next";

import { Body, LineHelp, Shell } from "@/components/shift/join/ShiftJoinView";
import { SeedstackNotice } from "@/components/shift/seedstack/SeedstackNotice";
import { SeedstackParentForm } from "@/components/shift/seedstack/SeedstackParentForm";
import { findParentLinkTarget } from "@/lib/seedstack/server";

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
        <Body>ลิงก์อาจหมดอายุหรือถูกยกเลิก ให้น้องสร้างลิงก์ใหม่ที่หน้า SeedStack แล้วส่งมาอีกครั้งค่ะ</Body>
        <LineHelp />
      </Shell>
    );
  }

  const who = target.nickname ? `น้อง${target.nickname}` : "น้อง";

  return (
    <Shell eyebrow="SHIFT x SeedStack" title={`ขอความยินยอมจากผู้ปกครองของ${who}`}>
      <Body>
        ใน SHIFT {who}ใช้เครื่องมือชื่อ SeedStack ช่วยตั้งเครื่องและสร้างโปรเจกต์ของตัวเอง
        ถ้าคุณพ่อคุณแม่ยินยอม ระบบจะส่งความคืบหน้าสั้นๆ ให้พี่ mentor เห็น เพื่อเข้าไปช่วยได้ทันเวลาที่น้องติด
        ไม่ยินยอมก็ไม่กระทบการเรียนค่ะ
      </Body>
      <SeedstackNotice />
      <SeedstackParentForm token={token} state={target.state} />
      <LineHelp />
    </Shell>
  );
}
