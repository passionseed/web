import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { PayView } from "@/components/hackathon/elemental/PayView";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
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
 * /hackathon/join/demo?state=pending|review|paid|cancelled&mode=solo|create|join
 */
export default async function PayDemoPage({ searchParams }: { searchParams: SearchParams }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const params = await searchParams;
  const state = STATES.find((s) => s === first(params.state)) ?? "pending";
  const mode = first(params.mode) ?? "create";
  const inTeam = mode !== "solo";
  const amountBaht = elementalPriceBaht(1, inTeam);
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

  return (
    <div className={trirong.variable}>
      <PayView
        token="demo"
        demo
        reg={{ status: state, teamName: team?.name ?? null, memberCount: 1, amountBaht, memberNicknames: ["มิว"], team, isTeamStarter: mode === "create" }}
        qrSrc={state === "pending" ? await elementalPayQr(amountBaht) : null}
        links={{ line: "https://line.me/ti/g/demo", discord: "https://discord.gg/demo" }}
      />
    </div>
  );
}
