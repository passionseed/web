import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { ShareView } from "@/components/hackathon/elemental/share/ShareView";
import { DEMO_STYLE_LEVELS, demoStyleCard } from "@/components/hackathon/elemental/team-style/demo";
import { teamStyleFonts } from "@/components/hackathon/elemental/team-style/fonts";
import { TeamStyleRow } from "@/components/hackathon/elemental/team-style/TeamStyleRow";
import { demoPagesOn } from "@/lib/hackathon/elemental/share";
import { studentDemo } from "@/lib/hackathon/elemental/share-demo";
import { posterVersion } from "@/lib/hackathon/elemental/share-poster";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Share page demo", robots: { index: false, follow: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Development and PR previews only: the student share page with made-up data, nothing saved.
 * /hackathon/join/demo/share?s=<state>&paid=1&school=<typed at sign-up>&phase=off
 * s: (none) picks a school · start · early · seat1-ready · seat1-given · seat2-progress ·
 *    maxed · paid-naming-friend · after-close (lib/hackathon/elemental/share-demo.ts)
 * &style=<level> gives maxed and after-close the team's board row (team-style/demo.ts levels).
 * The school search uses the real list.
 */
export default async function ShareDemoPage({ searchParams }: { searchParams: SearchParams }) {
  if (!demoPagesOn()) notFound();
  const p = await searchParams;
  const link = studentDemo(first(p.s));
  const level = DEMO_STYLE_LEVELS.find((l) => l === first(p.style));
  return (
    <div className={`${trirong.variable} ${teamStyleFonts}`}>
      <ShareView
        token="demo"
        demo
        state={first(p.phase) === "off" ? "closed" : link?.seats.phase === "after-close" || first(p.phase) === "after-close" ? "after-close" : "open"}
        link={link}
        selfPaid={link?.selfPaid ?? first(p.paid) === "1"}
        startQuery={first(p.school) ?? "เตรียมอุดม"}
        posterVersion={await posterVersion()}
        teamRow={level ? <TeamStyleRow token="demo" demo data={demoStyleCard(level, { solo: false })} /> : undefined}
      />
    </div>
  );
}
