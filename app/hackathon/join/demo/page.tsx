import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { PayView } from "@/components/hackathon/elemental/PayView";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { needsTeammates } from "@/lib/hackathon/elemental/community-links";
import { parseElementalDiscordOutcome } from "@/lib/hackathon/elemental/discordLink";
import { elementalPayQr } from "@/lib/hackathon/elemental/pay-qr";
import { elementalPriceBaht } from "@/lib/hackathon/elemental/registration";
import type { RegistrationStatus } from "@/lib/supabase/hackathon-event-registrations";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pay page demo", robots: { index: false, follow: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const STATES: RegistrationStatus[] = ["pending", "review", "paid", "cancelled"];

/**
 * Dev only: the pay page with made-up data, so the flow can be walked and
 * screenshotted without saving a sign-up or a slip. 404 everywhere else.
 * /hackathon/join/demo?state=pending|review|paid|cancelled&mode=solo|create|join&n=0..4
 * (n: the place in sign-up order inside the team, so each teammate's ticket can be seen)
 * &discord=joined|not_member|taken|error shows each Discord state on the paid page.
 * &alone=1 leaves only the starter in the team, so the find-a-team OpenChat shows under it.
 */
export default async function PayDemoPage({ searchParams }: { searchParams: SearchParams }) {
  if (process.env.NODE_ENV !== "development") notFound();
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

  return (
    <div className={trirong.variable}>
      <PayView
        token="demo"
        demo
        reg={{ status: state, teamName: team?.name ?? null, memberCount: 1, amountBaht, memberNicknames: ["มิว"], team, isTeamStarter: mode === "create", teamPosition, discordJoined: first(params.discord) === "joined" }}
        qrSrc={state === "pending" ? await elementalPayQr(amountBaht) : null}
        links={{ line: "https://line.me/ti/g/demo", discord: "https://discord.gg/demo" }}
        teamUpUrl={state === "pending" && needsTeammates({ memberCount: 1, team }, ELEMENTAL.teamMin) ? "https://line.me/ti/g2/demo" : null}
        discordOutcome={parseElementalDiscordOutcome(first(params.discord))}
      />
    </div>
  );
}
