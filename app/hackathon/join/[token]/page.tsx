import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { PaidBadge, PayWithSlip } from "@/components/hackathon/elemental/PayWithSlip";
import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";
import { SHIFT_PAYMENT } from "@/lib/content/shift-cohort";
import { getRegistrationByToken } from "@/lib/supabase/hackathon-event-registrations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `ชำระค่าสมัคร ${ELEMENTAL.edition} Hackathon`,
  robots: { index: false, follow: false },
  // The URL holds the pay token: don't leak it to other sites.
  referrer: "no-referrer",
};

/** The pay page for one sign-up. The token in the URL is the only key. */
export default async function ElementalPayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const reg = await getRegistrationByToken(token);
  if (!reg) notFound();

  const who = reg.teamName ?? reg.memberNicknames.join(", ");

  return (
    <main className={`${trirong.variable} min-h-screen px-4 py-10 sm:px-8 sm:py-16`} style={{ backgroundColor: EL.cream, color: EL.ink }}>
      <div className="mx-auto max-w-3xl">
        <p className="text-xs" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
          [{ELEMENTAL.edition} Hackathon · {thaiDateLine()}]
        </p>

        {reg.status === "paid" ? (
          <section className="mt-6 space-y-4">
            <PaidBadge />
            <h1 className="text-5xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.05 }}>
              ได้ที่นั่งแล้ว
            </h1>
            <p className="text-lg">
              {who} · {reg.memberCount} คน · ชำระแล้ว ฿{reg.amountBaht.toLocaleString("en-US")}
            </p>
            <p style={{ color: EL.inkSoft }}>
              ทีมงานจะติดต่อทางอีเมลและเบอร์โทรที่ให้ไว้ ก่อนวันงาน มีคำถามทักไลน์ {SHIFT_PAYMENT.lineId}
            </p>
            <Link href="/hackathon" className="inline-block text-sm underline underline-offset-4" style={{ color: EL.inkSoft }}>
              กลับหน้า {ELEMENTAL.edition} Hackathon
            </Link>
          </section>
        ) : reg.status === "review" ? (
          <section className="mt-6 space-y-4">
            <h1 className="text-5xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.05 }}>
              ได้รับสลิปแล้ว
            </h1>
            <p className="text-lg">
              ระบบตรวจสลิปอัตโนมัติไม่ได้ในตอนนี้ ทีมงานจะตรวจให้เองภายใน 24 ชั่วโมง แล้วหน้านี้จะเปลี่ยนเป็นยืนยันที่นั่ง
            </p>
            <p style={{ color: EL.inkSoft }}>เก็บลิงก์หน้านี้ไว้ มีคำถามทักไลน์ {SHIFT_PAYMENT.lineId}</p>
          </section>
        ) : reg.status === "cancelled" ? (
          <section className="mt-6 space-y-4">
            <h1 className="text-5xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200 }}>การสมัครนี้ถูกยกเลิก</h1>
            <p>ถ้าคิดว่าผิดพลาด ทักไลน์ {SHIFT_PAYMENT.lineId}</p>
          </section>
        ) : (
          <section className="mt-6">
            <h1 className="text-5xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.05 }}>
              อีกขั้นเดียว
            </h1>
            <p className="mt-3 text-lg" style={{ color: EL.inkSoft }}>
              {who} · {reg.memberCount} คน · ที่นั่งยืนยันเมื่อสลิปผ่าน
            </p>
            <div className="mt-10">
              <PayWithSlip token={token} amountBaht={reg.amountBaht} />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
