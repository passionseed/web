import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { demoLobby } from "@/components/hackathon/elemental/lobby/demo-lobby";
import { LobbyView } from "@/components/hackathon/elemental/lobby/LobbyView";
import { DEMO_TEAM_KEY } from "@/components/hackathon/elemental/team-style/demo";
import { teamStyleFonts } from "@/components/hackathon/elemental/team-style/fonts";
import { openingAt, type LobbyPayload } from "@/lib/hackathon/elemental/lobby";
import { demoPagesOn } from "@/lib/hackathon/elemental/share";
import type { BoardYou } from "@/lib/hackathon/elemental/team-style-phase";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Lobby demo", robots: { index: false, follow: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const STATES = ["waiting", "empty", "started", "over", "soon", "unavailable"] as const;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const pay = "/hackathon/join/demo?state=paid&share=1&style=fonts";

/**
 * Development and PR previews only: the waiting room with made-up teams.
 * 404 in production.
 * /hackathon/elemental/lobby/demo?state=waiting|empty|started|over|soon|unavailable
 * &you=1 (your tile pinned: ไฟป่า) | unnamed (no board name yet: the way to set one)
 * &sim=1 (teams walk in every 3 s) &tv=1 (the projector view) &n=<teams in the room>
 */
export default async function LobbyDemoPage({ searchParams }: { searchParams: SearchParams }) {
  if (!demoPagesOn()) notFound();
  const params = await searchParams;
  const state = STATES.find((s) => s === first(params.state)) ?? "waiting";
  const n = Number(first(params.n));
  const room = demoLobby(state === "empty" ? 0 : Number.isInteger(n) && n >= 0 ? n : undefined);
  const youParam = first(params.you);
  const you: BoardYou | undefined =
    youParam === "unnamed"
      ? { key: "tdemo0none", shareHref: null, payHref: pay, editHref: "/hackathon/join/demo/team?style=unnamed", devices: 6, named: false }
      : youParam
        ? { key: youParam === "1" ? DEMO_TEAM_KEY : youParam, shareHref: null, payHref: pay, editHref: "/hackathon/join/demo/team?style=all", devices: 142, named: true }
        : undefined;
  // A fixed clock for the countdown before the opening, so screenshots match: 6 days 4 h 12 min 33 s to go.
  const opening = openingAt();
  const now =
    state === "started" ? new Date(opening.getTime() + 20 * 60_000) : state === "over" ? new Date("2026-12-13T10:00:00+07:00") : new Date(opening.getTime() - ((6 * 24 + 4) * 3600 + 12 * 60 + 33) * 1000);
  const initial: LobbyPayload = {
    state: state === "empty" ? "waiting" : state,
    teams: state === "soon" || state === "unavailable" ? [] : room.teams,
    people: state === "soon" || state === "unavailable" ? 0 : room.people,
    openingAt: opening.toISOString(),
    now: now.toISOString(),
  };
  return (
    <div className={`${trirong.variable} ${teamStyleFonts}`}>
      <LobbyView
        initial={initial}
        poll={false}
        you={you}
        tv={first(params.tv) === "1"}
        simulate={first(params.sim) === "1"}
        signUpOpen
        boardHref="/hackathon/elemental/leaderboard/demo"
      />
    </div>
  );
}
