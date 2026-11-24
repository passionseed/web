import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { PayView } from "@/components/hackathon/elemental/PayView";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { elementalCommunityLinks } from "@/lib/hackathon/elemental/community-links";
import { elementalPayQr } from "@/lib/hackathon/elemental/pay-qr";
import { getRegistrationByToken } from "@/lib/supabase/hackathon-event-registrations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `ชำระค่าสมัคร ${ELEMENTAL.edition} Hackathon`,
  robots: { index: false, follow: false },
  // The URL holds the pay token: don't leak it to other sites.
  referrer: "no-referrer",
};

/** The pay page for one sign-up. The token in the URL is the only key. */
export default async function ElementalPayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const reg = await getRegistrationByToken(token, ELEMENTAL.maxGroupSize);
  if (!reg) notFound();
  const pending = reg.status === "pending";
  const qrSrc = pending ? await elementalPayQr(reg.amountBaht) : null;
  // Only a paid page renders these.
  const links = reg.status === "paid" ? elementalCommunityLinks() : { line: null, discord: null };

  return (
    <div className={trirong.variable}>
      <PayView token={token} reg={reg} qrSrc={qrSrc} links={links} />
    </div>
  );
}
