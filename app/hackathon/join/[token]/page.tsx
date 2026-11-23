import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { NextSteps } from "@/components/hackathon/elemental/NextSteps";
import { PaidBadge, PayWithSlip } from "@/components/hackathon/elemental/PayWithSlip";
import { TeamInvite } from "@/components/hackathon/elemental/TeamInvite";
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
  const reg = await getRegistrationByToken(token, ELEMENTAL.maxGroupSize);
  if (!reg) notFound();

  const who = reg.team ? reg.memberNicknames.join(", ") : (reg.teamName ?? reg.memberNicknames.join(", "));
  const people = reg.team ? `ทีม ${reg.team.name}` : `${reg.memberCount} คน`;

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
              {who} · {people} · ชำระแล้ว ฿{reg.amountBaht.toLocaleString("en-US")}
            </p>
            {reg.team && <TeamInvite team={reg.team} />}
            <div className="pt-4">
              <NextSteps inTeam={Boolean(reg.team)} paid={reg.status === "paid"} />
            </div>
            <Link href="/hackathon/elemental" className="inline-block text-sm underline underline-offset-4" style={{ color: EL.inkSoft }}>
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
            {reg.team && <TeamInvite team={reg.team} />}
            <div className="pt-4">
              <NextSteps inTeam={Boolean(reg.team)} paid={reg.status === "paid"} />
            </div>
          </section>
        ) : reg.status === "cancelled" ? (
          <section className="mt-6 space-y-4">
            <h1 className="text-5xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200 }}>การสมัครนี้ถูกยกเลิก</h1>
            <p>ถ้าคิดว่าผิดพลาด ทักไลน์ {SHIFT_PAYMENT.lineId}</p>
          </section>
        ) : (
          <section className="mt-6">
            <h1 className="text-5xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.05 }}>
              สมัครแล้ว
            </h1>
            <p className="mt-3 text-lg" style={{ color: EL.inkSoft }}>
              {who} · {people} · จ่ายตอนนี้หรือทีหลังก็ได้ ที่นั่งยืนยันเมื่อสลิปผ่าน เราส่งลิงก์หน้านี้ไปที่อีเมลแล้ว
            </p>
            {reg.team && (
              <div className="mt-8">
                <TeamInvite team={reg.team} />
              </div>
            )}
            <div className="mt-10">
              <PayWithSlip token={token} amountBaht={reg.amountBaht} />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
