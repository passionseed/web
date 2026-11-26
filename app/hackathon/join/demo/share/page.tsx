import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { ShareView, type ShareClaimView } from "@/components/hackathon/elemental/share/ShareView";
import { demoPagesOn, SHARE, SHARE_DEMO_CODE } from "@/lib/hackathon/elemental/share";
import { posterVersion } from "@/lib/hackathon/elemental/share-poster";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Share page demo", robots: { index: false, follow: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Development and PR previews only: the share page with made-up data, nothing saved.
 * /hackathon/join/demo/share?claim=none|held|sent|won&state=open|closed|paid&school=<typed at sign-up>&left=<seats>
 * The school search uses the real list; nothing is saved or held.
 */
export default async function ShareDemoPage({ searchParams }: { searchParams: SearchParams }) {
  if (!demoPagesOn()) notFound();
  const p = await searchParams;
  const claimState = first(p.claim) ?? "none";
  const state = (["open", "closed", "paid"] as const).find((s) => s === first(p.state)) ?? "open";
  const claim: ShareClaimView | null =
    claimState === "held" || claimState === "sent" || claimState === "won"
      ? {
          code: SHARE_DEMO_CODE,
          schoolName: "เตรียมอุดมศึกษา",
          province: "กรุงเทพมหานคร",
          status: claimState,
          heldUntil: new Date(Date.now() + SHARE.holdHours * 3600_000).toISOString(),
        }
      : null;
  return (
    <div className={trirong.variable}>
      <ShareView
        token="demo"
        demo
        state={state}
        claim={claim}
        seatsLeft={Number(first(p.left) ?? 27)}
        startQuery={first(p.school) ?? "เตรียมอุดม"}
        posterVersion={await posterVersion()}
      />
    </div>
  );
}
