import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { ShareView } from "@/components/hackathon/elemental/share/ShareView";
import { DEMO_STYLE_LEVELS, demoStyleCard } from "@/components/hackathon/elemental/team-style/demo";
import { teamStyleFonts } from "@/components/hackathon/elemental/team-style/fonts";
import { TeamLine } from "@/components/hackathon/elemental/team-style/TeamLine";
import { demoPagesOn, SHARE_DEMO_CODE } from "@/lib/hackathon/elemental/share";
import { STUDENT_DEMO_TEAM_DEVICES, studentDemo, type StudentDemoState } from "@/lib/hackathon/elemental/share-demo";
import { posterVersion, storyVersion } from "@/lib/hackathon/elemental/share-poster";
import { clampStyle, type TeamStyleCardData } from "@/lib/hackathon/elemental/team-style";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Share page demo", robots: { index: false, follow: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Development and PR previews only: the student share page with made-up data, nothing saved.
 * /hackathon/join/demo/share?s=<state>&school=<typed at sign-up>&phase=off&solo=1
 * s: (none) picks a school · start · early · colors-unlocked · fonts-unlocked · all-unlocked ·
 *    story-unlocked · story-revoked · after-close (lib/hackathon/elemental/share-demo.ts)
 * The team's devices follow the state; &solo=1 makes it a team of one; &board=0 hides the
 * team (as before the board launches). The school search uses the real list.
 */
export default async function ShareDemoPage({ searchParams }: { searchParams: SearchParams }) {
  if (!demoPagesOn()) notFound();
  const p = await searchParams;
  const s = first(p.s);
  const link = studentDemo(s);
  const solo = first(p.solo) === "1";
  // The team row for this state: the demo team, with this state's devices and Story unlock.
  const devices = link ? STUDENT_DEMO_TEAM_DEVICES[s as StudentDemoState] : 0;
  const level = DEMO_STYLE_LEVELS.find((l) => l === first(p.style)) ?? (devices >= 50 ? "all" : devices >= 25 ? "fonts" : devices >= 10 ? "colors" : devices > 0 ? "locked" : "unnamed");
  const storyUnlocked = link?.storyProof === "unlocked";
  const base = demoStyleCard(level, { solo });
  const team: TeamStyleCardData | null =
    link && first(p.board) !== "0"
      ? { ...base, devices, storyUnlocked, style: clampStyle(base.style, devices, storyUnlocked), final: link.phase === "after-close" || base.final }
      : null;
  // "← หน้าของฉัน" opens the demo pay page.
  const backHref = "/hackathon/join/demo?state=paid&mode=solo";
  return (
    <div className={`${trirong.variable} ${teamStyleFonts}`}>
      <ShareView
        token="demo"
        demo
        state={first(p.phase) === "off" ? "closed" : link?.phase === "after-close" || first(p.phase) === "after-close" ? "after-close" : "open"}
        link={link}
        code={SHARE_DEMO_CODE}
        backHref={backHref}
        startQuery={first(p.school) ?? "เตรียมอุดม"}
        posterVersion={await posterVersion()}
        storyVersion={await storyVersion()}
        team={team}
        teamRow={team ? <TeamLine token="demo" demo data={team} /> : undefined}
      />
    </div>
  );
}
