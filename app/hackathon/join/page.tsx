import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { JoinFlow } from "@/components/hackathon/elemental/join/JoinFlow";
import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";
import { parseBuddyOwe } from "@/lib/hackathon/elemental/buddy-pass";
import { elementalRegistrationOpen, normalizeSource } from "@/lib/hackathon/elemental/registration";
import { teamLabel } from "@/lib/hackathon/elemental/team-name";
import { getBuddyPass, getTeamByInviteCode } from "@/lib/supabase/hackathon-event-registrations";

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
  // A team link wins over a pass link: the two prices never mix.
  const passCode = inviteCode ? undefined : first(params.pass);
  const pass = passCode ? await getBuddyPass(ELEMENTAL.slug, passCode) : null;
  const buddyPass =
    pass?.state === "available" && passCode
      ? { code: passCode, senderName: pass.senderName || "เพื่อน", owe: parseBuddyOwe(first(params.owe)) }
      : undefined;
  const passNotice =
    pass?.state === "used"
      ? "บัตรเพื่อนใบนี้มีคนใช้ไปแล้ว ใบนึงใช้ได้คนเดียว สมัครแบบปกติด้านล่างได้เลย"
      : pass?.state === "locked"
        ? `บัตรเพื่อนใบนี้ยังไม่ปลดล็อก เพราะ${pass.senderName || "เพื่อน"}ยังจ่ายไม่เสร็จ รอสลิปผ่านแล้วกดลิงก์เดิมอีกที หรือสมัครด้านล่างไปก่อน`
        : pass?.state === "invalid"
          ? "บัตรเพื่อนจากลิงก์นี้ใช้ไม่ได้ ขอลิงก์ใหม่จากเพื่อน หรือสมัครด้านล่างไปก่อน"
          : undefined;

  const backHref = source ? `/hackathon/elemental?src=${source}` : "/hackathon/elemental";
  const notice =
    inviteCode && !team
      ? "ไม่เจอทีมจากลิงก์นี้ ขอลิงก์ใหม่จากเพื่อน หรือสมัครด้านล่างไปก่อน"
      : teamFull
        ? `${teamLabel(team.name)} ครบ ${ELEMENTAL.maxGroupSize} คนแล้ว สร้างทีมใหม่หรือมาคนเดียวได้`
        : passNotice;
  // Dev only: ?demo=1 walks the flow without saving anything (see /hackathon/join/demo).
  const demo = process.env.NODE_ENV === "development" && first(params.demo) === "1";

  return (
    <main className={`${trirong.variable} min-h-[100dvh]`} style={{ backgroundColor: EL.cream, color: EL.ink }}>
      {open ? (
        <JoinFlow
          source={source}
          utm={Object.keys(utm).length ? utm : undefined}
          team={team && !teamFull ? team : undefined}
          buddyPass={buddyPass}
          notice={notice}
          backHref={backHref}
          demo={demo}
        />
      ) : (
        <div className="mx-auto max-w-xl px-5 py-16">
          <Link href={backHref} className="inline-flex items-center gap-2 text-sm" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
            <ArrowLeft className="h-4 w-4" /> {ELEMENTAL.edition} Hackathon
          </Link>
          <h1 className="mt-6 text-5xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.1 }}>
            ปิดรับสมัครแล้ว
          </h1>
          <p className="mt-3 text-lg" style={{ color: EL.inkSoft }}>ขอบคุณที่สนใจ {thaiDateLine()}</p>
        </div>
      )}
    </main>
  );
}
