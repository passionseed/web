import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { demoBoard } from "@/components/hackathon/elemental/leaderboard/demo-teams";
import { LeaderboardView } from "@/components/hackathon/elemental/leaderboard/LeaderboardView";
import { teamStyleFonts } from "@/components/hackathon/elemental/team-style/fonts";
import { demoPagesOn } from "@/lib/hackathon/elemental/share";
import type { LeaderboardPayload } from "@/lib/hackathon/elemental/team-style-board";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Team board demo", robots: { index: false, follow: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const STATES = ["live", "empty", "closed", "unavailable"] as const;

/**
 * Development and PR previews only: the team board with made-up teams, so it
 * can be seen without real sign-ups. 404 in production.
 * /hackathon/elemental/leaderboard/demo?state=live|empty|closed|unavailable
 */
export default async function LeaderboardDemoPage({ searchParams }: { searchParams: SearchParams }) {
  if (!demoPagesOn()) notFound();
  const raw = (await searchParams).state;
  const state = STATES.find((s) => s === (Array.isArray(raw) ? raw[0] : raw)) ?? "live";
  const initial: LeaderboardPayload = {
    state: state === "empty" ? "live" : state,
    teams: state === "live" ? demoBoard() : [],
    updatedAt: new Date().toISOString(),
  };
  return (
    <div className={`${trirong.variable} ${teamStyleFonts}`}>
      <LeaderboardView initial={initial} poll={false} />
    </div>
  );
}
