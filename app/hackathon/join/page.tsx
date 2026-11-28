import type { Metadata } from "next";

import { TrackLinkView } from "@/components/hackathon/elemental/TrackLinkView";
import { JoinFlow } from "@/components/hackathon/elemental/join/JoinFlow";
import { Body, H1, Page, v } from "@/components/hackathon/elemental/share/ui";
import { ELEMENTAL, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";
import { parseBuddyOwe } from "@/lib/hackathon/elemental/buddy-pass";
import { elementalRegistrationOpen, normalizeSource } from "@/lib/hackathon/elemental/registration";
import { demoPagesOn } from "@/lib/hackathon/elemental/share";
import { teamLabel } from "@/lib/hackathon/elemental/team-name";
import { getBuddyPass, getTeamByInviteCode, type PublicTeam } from "@/lib/supabase/hackathon-event-registrations";

export const metadata: Metadata = {
  title: `สมัคร ${ELEMENTAL.edition} Hackathon`,
  description: `สมัคร ${ELEMENTAL.edition} Hackathon ${thaiDateLine()}`,
  robots: { index: false, follow: true },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Demo only (?demo=1&team=demo): a made-up team, so the invite screen shows without reading the database. */
const DEMO_TEAM: PublicTeam = {
  id: "demo",
  name: "ทีมมิว",
  inviteCode: "demo",
  roster: [
    { name: "มิว", paid: true },
    { name: "ต้น", paid: false },
  ],
  spotsLeft: ELEMENTAL.maxGroupSize - 2,
};
const DEMO_PASS_SENDER = "มิว";

export default async function ElementalJoinPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const source = normalizeSource(first(params.src) ?? first(params.utm_source));
  const utm: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
    const v = first(params[key]);
    if (v) utm[key] = v.slice(0, 120);
  }
  // Development and PR previews only: ?demo=1 walks the flow without saving anything (see /hackathon/join/demo).
  // &team=demo and &pass=demo show the invite and buddy-pass screens with made-up data.
  const demo = demoPagesOn() && first(params.demo) === "1";
  const open = elementalRegistrationOpen();
  const inviteCode = first(params.team);
  const team =
    demo && inviteCode === "demo"
      ? DEMO_TEAM
      : inviteCode
        ? await getTeamByInviteCode(ELEMENTAL.slug, inviteCode, ELEMENTAL.maxGroupSize)
        : null;
  const teamFull = team !== null && team.spotsLeft === 0;
  // A team link wins over a pass link: the two prices never mix.
  const passCode = inviteCode ? undefined : first(params.pass);
  const pass =
    demo && passCode === "demo"
      ? ({ state: "available", senderName: DEMO_PASS_SENDER } as const)
      : passCode
        ? await getBuddyPass(ELEMENTAL.slug, passCode)
        : null;
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

  return (
    <>
      {/* A share link (?src=share-<code> or t-<code>) kept from the landing, or opened here directly, counts this device once for that link. Not in the demo. */}
      {!demo && <TrackLinkView source={source} />}
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
        <Page surface="paper" back={{ href: backHref, label: ELEMENTAL.edition }}>
          <H1>ปิดรับสมัครแล้ว</H1>
          <div className="mt-3" style={{ color: v.secondary }}>
            <Body>ขอบคุณที่สนใจ {thaiDateLine()}</Body>
          </div>
        </Page>
      )}
    </>
  );
}
