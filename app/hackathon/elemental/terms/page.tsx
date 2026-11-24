import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { ADULT_AGE } from "@/lib/hackathon/elemental/registration";
import { SHIFT_PAYMENT } from "@/lib/content/shift-cohort";

export const metadata: Metadata = {
  title: `ข้อตกลงการสมัคร ${ELEMENTAL.edition} Hackathon`,
  alternates: { canonical: "/hackathon/elemental/terms" },
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2 border-t pt-6" style={{ borderColor: "rgba(29,33,31,0.12)" }}>
      <h2 className="text-xl" style={{ fontFamily: EL_FONT.display, fontWeight: 400 }}>{title}</h2>
      <div className="space-y-2 text-base leading-relaxed">{children}</div>
    </section>
  );
}

const link = "underline underline-offset-4";

/**
 * What someone agrees to when they sign up for Elemental. The sign-up's
 * review step links here, above the button. It sits on top of the site-wide
 * /terms and /privacy, which it links to.
 */
export default function ElementalTermsPage() {
  return (
    <main className={`${trirong.variable} min-h-[100dvh] px-5 py-10 sm:px-8 sm:py-16`} style={{ backgroundColor: EL.cream, color: EL.ink }}>
      <div className="mx-auto max-w-xl space-y-6">
        <Link href="/hackathon/elemental" className="text-sm" style={{ color: EL.inkSoft }}>
          {ELEMENTAL.edition} Hackathon
        </Link>
        <h1 className="text-4xl sm:text-5xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.1 }}>
          ข้อตกลงการสมัคร
        </h1>
        <p style={{ color: EL.inkSoft }}>
          การกดสมัคร {ELEMENTAL.edition} Hackathon ถือว่าผู้สมัคร (และผู้ปกครอง สำหรับผู้สมัครอายุต่ำกว่า {ADULT_AGE} ปี) ยอมรับข้อตกลงนี้
          ร่วมกับ
          <Link href="/terms" className={`mx-1 ${link}`}>ข้อตกลงการใช้งาน</Link>
          และ
          <Link href="/privacy" className={`mx-1 ${link}`}>นโยบายความเป็นส่วนตัว</Link>
          ของ PassionSeed
        </p>

        <Section title="ค่าสมัคร">
          <p>ที่นั่งยืนยันเมื่อสลิปผ่านการตรวจแล้ว ไม่มีการคืนเงินหลังชำระค่าสมัครแล้ว</p>
        </Section>

        <Section title={`ผู้สมัครอายุต่ำกว่า ${ADULT_AGE} ปี`}>
          <p>ต้องได้รับความยินยอมจากผู้ปกครองก่อนสมัคร ทีมงานอาจโทรยืนยันกับผู้ปกครองตามเบอร์ที่ให้ไว้</p>
        </Section>

        <Section title="ผลงาน และการนำไปประชาสัมพันธ์">
          <p>ผลงานที่ทีมสร้างในงานยังเป็นของทีม</p>
          <p>
            ผู้สมัครอนุญาตให้ PassionSeed นำชื่อและคำอธิบายโปรเจกต์ ภาพหน้าจอ วิดีโอเดโม ชื่อทีม ชื่อเล่น
            และภาพถ่ายหรือวิดีโอบรรยากาศในงาน ไปใช้ประชาสัมพันธ์งานนี้ งานครั้งต่อไป และ PassionSeed ได้ ทั้งออนไลน์และออฟไลน์
            โดยไม่มีค่าตอบแทน
          </p>
        </Section>

        <Section title="ข้อมูลส่วนตัว">
          <p>
            ข้อมูลที่กรอกตอนสมัคร (ชื่อ-นามสกุล ชื่อเล่น อายุ โรงเรียน อีเมล เบอร์โทร LINE ID ข้อมูลผู้ปกครอง) และสลิปโอนเงิน
            ใช้เพื่อจัดงาน ยืนยันการชำระเงิน และติดต่อเรื่องงานนี้
          </p>
          <p>ทีมงานจะติดต่อเรื่องกิจกรรมอื่นหลังจบงาน เฉพาะคนที่ติ๊กยินยอมไว้ตอนสมัคร</p>
        </Section>

        <Section title="ติดต่อทีมงาน">
          <p>ทักไลน์ {SHIFT_PAYMENT.lineId}</p>
        </Section>
      </div>
    </main>
  );
}
