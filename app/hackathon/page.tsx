import type { Metadata } from "next";

import { ElementalLanding } from "@/components/hackathon/elemental/ElementalLanding";
import { ELEMENTAL, prizeTotal, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";
import { elementalRegistrationOpen, normalizeSource } from "@/lib/hackathon/elemental/registration";
import { CANONICAL_ORIGIN } from "@/lib/seo/canonical-origin";

const TITLE = `${ELEMENTAL.edition} Hackathon | ${ELEMENTAL.series}`;
const DESCRIPTION = `${ELEMENTAL.edition} Hackathon: ดิน น้ำ ลม ไฟ ${thaiDateLine()} รางวัลรวม ${prizeTotal()} บาท สมัครคนเดียว ฿${ELEMENTAL.priceBaht} มากับเพื่อน ฿${ELEMENTAL.groupPriceBaht} ต่อคน`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // Tracked links (?src=ig) are the same page.
  alternates: { canonical: "/hackathon" },
  // Without these, link previews used the site-wide PassionSeed title.
  openGraph: { type: "website", siteName: "PassionSeed", locale: "th_TH", title: TITLE, description: DESCRIPTION, url: "/hackathon" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

/**
 * Event data for Google (schema.org Event), all from facts.ts. The Discord
 * link isn't public, so the online location is this page.
 */
function eventSchema(open: boolean) {
  const page = `${CANONICAL_ORIGIN}/hackathon`;
  const offer = (name: string, price: number) => ({
    "@type": "Offer",
    name,
    price,
    priceCurrency: "THB",
    url: `${CANONICAL_ORIGIN}/hackathon/join`,
    availability: open ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
    validThrough: `${ELEMENTAL.registrationClosesOn}T23:59:59+07:00`,
  });
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${ELEMENTAL.edition} Hackathon`,
    description: DESCRIPTION,
    startDate: ELEMENTAL.startDate,
    endDate: ELEMENTAL.endDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    location: { "@type": "VirtualLocation", url: page },
    image: [`${CANONICAL_ORIGIN}/hackathon/elemental/media/key-visual.webp`],
    url: page,
    inLanguage: "th",
    organizer: { "@type": "Organization", "@id": `${CANONICAL_ORIGIN}/#organization`, name: "PassionSeed", url: CANONICAL_ORIGIN },
    offers: [offer("สมัครคนเดียว", ELEMENTAL.priceBaht), offer("มากับเพื่อน (ต่อคน)", ELEMENTAL.groupPriceBaht)],
  };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** The current hackathon. Past ones live at /hackathon/past. */
export default async function HackathonPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  // Keep the tracked link (?src=ig, or utm_source) through to the sign-up form.
  const src = normalizeSource(first(params.src) ?? first(params.utm_source));
  const joinHref = src ? `/hackathon/join?src=${src}` : "/hackathon/join";
  const open = elementalRegistrationOpen();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema(open)) }} />
      <ElementalLanding joinHref={joinHref} open={open} />
    </>
  );
}
