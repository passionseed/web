import type { Metadata } from "next";

import { ElementalLanding } from "@/components/hackathon/elemental/ElementalLanding";
import { ELEMENTAL, prizeTotal, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";
import { elementalRegistrationOpen, normalizeSource } from "@/lib/hackathon/elemental/registration";

export const metadata: Metadata = {
  title: `${ELEMENTAL.edition} Hackathon | ${ELEMENTAL.series}`,
  description: `${ELEMENTAL.edition} Hackathon: ดิน น้ำ ลม ไฟ ${thaiDateLine()} รางวัลรวม ${prizeTotal()} บาท สมัครคนเดียว ฿${ELEMENTAL.priceBaht} มากับเพื่อน ฿${ELEMENTAL.groupPriceBaht} ต่อคน`,
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** The current hackathon. Past ones live at /hackathon/past. */
export default async function HackathonPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  // Keep the tracked link (?src=ig, or utm_source) through to the sign-up form.
  const src = normalizeSource(first(params.src) ?? first(params.utm_source));
  const joinHref = src ? `/hackathon/join?src=${src}` : "/hackathon/join";
  return <ElementalLanding joinHref={joinHref} open={elementalRegistrationOpen()} />;
}
