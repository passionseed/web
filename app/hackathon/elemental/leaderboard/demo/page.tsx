import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { demoBoard } from "@/components/hackathon/elemental/leaderboard/demo-teams";
import { LeaderboardView } from "@/components/hackathon/elemental/leaderboard/LeaderboardView";
import { DEMO_TEAM_KEY } from "@/components/hackathon/elemental/team-style/demo";
import { teamStyleFonts } from "@/components/hackathon/elemental/team-style/fonts";
import { elementalCountingEndsAt } from "@/lib/hackathon/elemental/link-views-shared";
import { demoPagesOn } from "@/lib/hackathon/elemental/share";
import type { LeaderboardPayload } from "@/lib/hackathon/elemental/team-style-board";
import type { BoardYou } from "@/lib/hackathon/elemental/team-style-phase";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Team board demo", robots: { index: false, follow: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const STATES = ["live", "empty", "soon", "final", "unavailable"] as const;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const share = "/hackathon/join/demo/share";
const pay = "/hackathon/join/demo?state=pending&share=1&style=unnamed&edit=1";

/**
 * Development and PR previews only: the team board with made-up teams, so it
 * can be seen without real sign-ups. 404 in production.
 * /hackathon/elemental/leaderboard/demo?state=live|empty|soon|final|unavailable
 * &you=<row key>|unnamed|nodevices marks "your team" as if opened from a pay page
 * (without it, the pay demo's row in this tab does the same).
 */
export default async function LeaderboardDemoPage({ searchParams }: { searchParams: SearchParams }) {
  if (!demoPagesOn()) notFound();
  const params = await searchParams;
  const state = STATES.find((s) => s === first(params.state)) ?? "live";
  const youParam = first(params.you);
  const you: BoardYou | undefined =
    youParam === "unnamed"
      ? { key: "tdemo0none", shareHref: share, payHref: pay, devices: 6, named: false }
      : youParam === "nodevices"
        ? { key: "tdemo0zero", shareHref: share, payHref: pay, devices: 0, named: true }
        : youParam
          ? { key: youParam === "1" ? DEMO_TEAM_KEY : youParam, shareHref: share, payHref: pay, devices: 25, named: true }
          : undefined;
  const initial: LeaderboardPayload = {
    state: state === "empty" ? "live" : state,
    teams: state === "live" || state === "final" ? demoBoard() : [],
    updatedAt: new Date().toISOString(),
    countedUntil: elementalCountingEndsAt().toISOString(),
  };
  return (
    <div className={`${trirong.variable} ${teamStyleFonts}`}>
      <LeaderboardView initial={initial} poll={false} you={you} />
    </div>
  );
}
