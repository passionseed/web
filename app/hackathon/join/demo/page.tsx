import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { PayView } from "@/components/hackathon/elemental/PayView";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { needsTeammates } from "@/lib/hackathon/elemental/community-links";
import { parseElementalDiscordOutcome } from "@/lib/hackathon/elemental/discordLink";
import { isParentView } from "@/lib/hackathon/elemental/parent-share";
import { elementalPayQr } from "@/lib/hackathon/elemental/pay-qr";
import { elementalPriceBaht } from "@/lib/hackathon/elemental/registration";
import type { RegistrationStatus } from "@/lib/supabase/hackathon-event-registrations";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pay page demo", robots: { index: false, follow: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const STATES: RegistrationStatus[] = ["pending", "review", "paid", "cancelled"];

/**
 * The pay page with made-up data, so the flow can be walked and screenshotted
 * without saving a sign-up or a slip. Local dev and Vercel preview deployments
 * only (so a reviewer can open it from a pull request); 404 on production.
 * /hackathon/join/demo?state=pending|review|paid|cancelled&mode=solo|create|join&n=0..4
 * (n: the place in sign-up order inside the team, so each teammate's ticket can be seen)
 * &discord=joined|not_member|taken|error shows each Discord state on the paid page.
 * &alone=1 leaves only the starter in the team, so the find-a-team OpenChat shows under it.
 * mode=solo shows the join-a-team card (type any 8-character code); in a team, "ออกจากทีม" is at the
 * bottom of the team card. &pass=1 adds an unused buddy pass, for the line about it (with a team: a
 * person who paid the solo price and joined later). &closed=1 shows the page after team changes close.
 * &join=demo shows the card for a friend's team link at the top: "join" when mode=solo, "move" in a team.
 * &join=full, &join=missing and &join=same show it when that team is full, not found, or already theirs.
 * &for=parent shows an unpaid page as a parent opens it from the student's link.
 */
export default async function PayDemoPage({ searchParams }: { searchParams: SearchParams }) {
  if (process.env.NODE_ENV !== "development" && process.env.VERCEL_ENV !== "preview") notFound();
  const params = await searchParams;
  const state = STATES.find((s) => s === first(params.state)) ?? "pending";
  const mode = first(params.mode) ?? "create";
  const inTeam = mode !== "solo";
  const amountBaht = elementalPriceBaht(1, inTeam);
  const n = Number(first(params.n));
  const teamPosition = !inTeam ? null : Number.isInteger(n) && n >= 0 ? n : mode === "create" ? 0 : 1;
  const team = inTeam
    ? {
        id: "demo",
        name: "ไฟป่า",
        inviteCode: "0123456789ab",
        roster: [
          { name: "มิว", paid: state === "paid" },
          ...(first(params.alone) === "1" ? [] : [{ name: "ต้น", paid: true }]),
        ],
        spotsLeft: ELEMENTAL.maxGroupSize - (first(params.alone) === "1" ? 1 : 2),
      }
    : null;

  const joinParam = first(params.join);
  const joinOffer = joinParam
    ? {
        code: "fedcba98",
        target:
          joinParam === "missing"
            ? null
            : joinParam === "same" && team
              ? { id: team.id, name: team.name, size: team.roster.length, spotsLeft: team.spotsLeft }
              : { id: "demo-2", name: "น้ำแข็ง", size: joinParam === "full" ? ELEMENTAL.maxGroupSize : 2, spotsLeft: joinParam === "full" ? 0 : ELEMENTAL.maxGroupSize - 2 },
      }
    : null;

  return (
    <div className={trirong.variable}>
      <PayView
        token="demo"
        demo
        joinOffer={joinOffer}
        shareHref={state === "paid" ? "/hackathon/join/demo/share" : null}
        reg={{ status: state, teamName: team?.name ?? null, memberCount: 1, amountBaht, memberNicknames: ["มิว"], team, isTeamStarter: mode === "create", teamPosition, discordJoined: first(params.discord) === "joined", buddyPass: first(params.pass) === "1" ? (state === "paid" ? { state: "available", code: "ba9876543210" } : { state: "locked" }) : null }}
        teamChangeOpen={first(params.closed) !== "1"}
        forParent={isParentView(params.for)}
        qrSrc={state === "pending" ? await elementalPayQr(amountBaht) : null}
        links={{ line: "https://line.me/ti/g/demo", discord: "https://discord.gg/demo" }}
        teamUpUrl={state === "pending" && needsTeammates({ memberCount: 1, team }, ELEMENTAL.teamMin) ? "https://line.me/ti/g2/demo" : null}
        discordOutcome={parseElementalDiscordOutcome(first(params.discord))}
      />
    </div>
  );
}
