import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { PayView } from "@/components/hackathon/elemental/PayView";
import { DEMO_STYLE_LEVELS, demoStyleCard } from "@/components/hackathon/elemental/team-style/demo";
import { teamStyleFonts } from "@/components/hackathon/elemental/team-style/fonts";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { parseElementalDiscordOutcome } from "@/lib/hackathon/elemental/discordLink";
import { elementalPayQr } from "@/lib/hackathon/elemental/pay-qr";
import { elementalPriceBaht } from "@/lib/hackathon/elemental/registration";
import { demoPagesOn, SHARE_DEMO_CODE } from "@/lib/hackathon/elemental/share";
import { studentDemo } from "@/lib/hackathon/elemental/share-demo";
import type { IncomingSeat } from "@/lib/hackathon/elemental/share-rules";
import type { RegistrationStatus } from "@/lib/supabase/hackathon-event-registrations";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pay page demo", robots: { index: false, follow: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const STATES: RegistrationStatus[] = ["pending", "review", "paid", "cancelled"];

/**
 * Development and PR previews only: the pay page with made-up data, so the
 * flow can be walked and screenshotted without saving a sign-up or a slip.
 * 404 in production.
 * /hackathon/join/demo?state=pending|review|paid|cancelled&mode=solo|create|join&n=0..4
 * (n: the place in sign-up order inside the team, so each teammate's ticket can be seen)
 * &discord=joined|not_member|taken|error shows each Discord state on the paid page.
 * &share=1|<state> shows the share card (1: no school yet; a state from lib/hackathon/elemental/share-demo.ts:
 *   start, early, close, devices-done, seat1-ready, seat1-given, seat2-progress, maxed, paid-naming-friend, after-close)
 *   on the pending, review or paid page; &phase=after-close shows it read-only.
 * &incoming=checking|given sets reg.incomingSeat: a free seat on its way from a friend's or teacher's link.
 * &style=unnamed|locked|colors|fonts|all|final gives the share card the team's board row at that level
 * (unnamed: no board name yet; final: after sign-up close). Editing is its own page: /hackathon/join/demo/team?style=…
 */
export default async function PayDemoPage({ searchParams }: { searchParams: SearchParams }) {
  if (!demoPagesOn()) notFound();
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
          { name: "ต้น", paid: true },
        ],
        spotsLeft: ELEMENTAL.maxGroupSize - 2,
      }
    : null;

  const styleLevel = DEMO_STYLE_LEVELS.find((l) => l === first(params.style));
  // &incoming=checking|given: a free seat on its way from a friend's or teacher's link.
  const incoming = first(params.incoming);
  const demoReg = {
    status: state,
    teamName: team?.name ?? null,
    memberCount: 1,
    amountBaht,
    memberNicknames: ["มิว"],
    team,
    isTeamStarter: mode === "create",
    teamPosition,
    discordJoined: first(params.discord) === "joined",
    incomingSeat: incoming === "checking" || incoming === "given" ? (incoming as IncomingSeat) : null,
  };

  return (
    <div className={`${trirong.variable} ${teamStyleFonts}`}>
      <PayView
        token="demo"
        demo
        reg={demoReg}
        qrSrc={state === "pending" ? await elementalPayQr(amountBaht) : null}
        links={{ line: "https://line.me/ti/g/demo", discord: "https://discord.gg/demo" }}
        discordOutcome={parseElementalDiscordOutcome(first(params.discord))}
        teamStyle={styleLevel ? demoStyleCard(styleLevel, { solo: !inTeam }) : null}
        share={
          first(params.share)
            ? {
                href: `/hackathon/join/demo/share${studentDemo(first(params.share)) ? `?s=${first(params.share)}` : ""}`,
                pollUrl: null,
                code: SHARE_DEMO_CODE,
                selfPaid: state === "paid" || state === "review",
                link: studentDemo(first(params.share)),
                phase: first(params.phase) === "after-close" || studentDemo(first(params.share))?.seats.phase === "after-close" ? "after-close" : "open",
              }
            : null
        }
      />
    </div>
  );
}
