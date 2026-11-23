import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { JoinForm } from "@/components/hackathon/elemental/JoinForm";
import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";
import { elementalRegistrationOpen, normalizeSource } from "@/lib/hackathon/elemental/registration";
import { getTeamByInviteCode } from "@/lib/supabase/hackathon-event-registrations";

export const metadata: Metadata = {
  title: `สมัคร ${ELEMENTAL.edition} Hackathon`,
  description: `สมัคร ${ELEMENTAL.edition} Hackathon ${thaiDateLine()}`,
  robots: { index: false, follow: true },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ElementalJoinPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const source = normalizeSource(first(params.src) ?? first(params.utm_source));
  const utm: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
    const v = first(params[key]);
    if (v) utm[key] = v.slice(0, 120);
  }
  const open = elementalRegistrationOpen();
  const inviteCode = first(params.team);
  const team = inviteCode ? await getTeamByInviteCode(ELEMENTAL.slug, inviteCode, ELEMENTAL.maxGroupSize) : null;
  const teamFull = team !== null && team.spotsLeft === 0;

  return (
    <main className={`${trirong.variable} min-h-screen px-4 py-10 sm:px-8 sm:py-16`} style={{ backgroundColor: EL.cream, color: EL.ink }}>
      <div className="mx-auto max-w-3xl">
        <Link href={source ? `/hackathon?src=${source}` : "/hackathon"} className="inline-flex items-center gap-2 text-sm" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
          <ArrowLeft className="h-4 w-4" /> {ELEMENTAL.edition} Hackathon
        </Link>
        <h1 className="mt-6 text-5xl sm:text-6xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.05 }}>
          สมัคร <span style={{ fontStyle: "italic", fontWeight: 300 }}>{ELEMENTAL.edition}</span>
        </h1>
        <p className="mt-3 text-lg" style={{ color: EL.inkSoft }}>
          {thaiDateLine()} · สมัครก่อน จ่ายทีหลังได้ มากับเพื่อนก็ส่งลิงก์ให้เพื่อนสมัครเอง
        </p>
        {inviteCode && !team && (
          <p className="mt-6 rounded-xl p-4 text-sm" style={{ backgroundColor: "rgba(236,100,36,0.08)" }}>
            ไม่เจอทีมจากลิงก์นี้ ขอลิงก์ใหม่จากเพื่อน หรือสมัครด้านล่างไปก่อน
          </p>
        )}
        {teamFull && (
          <p className="mt-6 rounded-xl p-4 text-sm" style={{ backgroundColor: "rgba(236,100,36,0.08)" }}>
            ทีม {team.name} ครบ {ELEMENTAL.maxGroupSize} คนแล้ว สร้างทีมใหม่หรือมาคนเดียวได้
          </p>
        )}
        <div className="mt-10">
          {open ? (
            <JoinForm source={source} utm={Object.keys(utm).length ? utm : undefined} team={team && !teamFull ? team : undefined} />
          ) : (
            <p className="text-lg">ปิดรับสมัครแล้ว ขอบคุณที่สนใจ</p>
          )}
        </div>
      </div>
    </main>
  );
}
