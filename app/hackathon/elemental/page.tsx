import type { Metadata } from "next";

import { ElementalLanding } from "@/components/hackathon/elemental/ElementalLanding";
import { TrackLinkView } from "@/components/hackathon/elemental/TrackLinkView";
import { TrackStep } from "@/components/hackathon/elemental/TrackStep";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { elementalRegistrationOpen, normalizeSource } from "@/lib/hackathon/elemental/registration";
import posterBase from "@/lib/hackathon/elemental/share/poster-base.json";
import {
  demoPagesOn,
  elementalShareDescription,
  SHARE_DEMO_CODE,
  shareOpen,
  TEACHER_DEMO_CODE,
  type ShareKind,
} from "@/lib/hackathon/elemental/share";
import { CANONICAL_ORIGIN } from "@/lib/seo/canonical-origin";
import { findLinkKind } from "@/lib/supabase/hackathon-share-links";

const TITLE = `${ELEMENTAL.edition} Hackathon | ${ELEMENTAL.series}`;
const DESCRIPTION = elementalShareDescription();

const BASE_METADATA: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // Tracked links (?src=ig) are the same page.
  alternates: { canonical: "/hackathon/elemental" },
  // Without these, link previews used the site-wide PassionSeed title.
  openGraph: { type: "website", siteName: "PassionSeed", locale: "th_TH", title: TITLE, description: DESCRIPTION, url: "/hackathon/elemental" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** A share link's tag: ?src=share-<code> (a student) or ?src=t-<code> (a teacher). */
const SHARE_SOURCE_RE = /^(share|t)-([0-9a-f]{8})$/;

/** Whether this code has a share link (the demo codes count where demo pages are on). */
async function linkKind(code: string): Promise<ShareKind | null> {
  if (demoPagesOn() && code === SHARE_DEMO_CODE) return "student";
  if (demoPagesOn() && code === TEACHER_DEMO_CODE) return "teacher";
  return findLinkKind(ELEMENTAL.slug, code);
}

/**
 * A share link pasted in LINE previews as the sharer's own poster: for
 * ?src=share-<code> or ?src=t-<code> whose code has a link, og:image is that
 * poster's 1200×630 crop (the poster route's ?format=og). Anything else, or
 * any error, keeps the page's own card.
 */
export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const match = first((await searchParams).src)?.match(SHARE_SOURCE_RE);
  if (!match) return BASE_METADATA;
  const code = match[2];
  try {
    if (!(await linkKind(code))) return BASE_METADATA;
  } catch {
    return BASE_METADATA;
  }
  const image = {
    url: `/api/hackathon/elemental/share/poster/${code}?v=${posterBase.version}&format=og`,
    width: 1200,
    height: 630,
    alt: `โปสเตอร์ ${ELEMENTAL.edition} Hackathon No. ${code.toUpperCase()}`,
  };
  return {
    ...BASE_METADATA,
    openGraph: { ...BASE_METADATA.openGraph, images: [image] },
    twitter: { ...BASE_METADATA.twitter, images: [image.url] },
  };
}

/**
 * Event data for Google (schema.org Event), all from facts.ts. Mixed: online
 * on Discord until Demo Day, which is onsite. The Discord link isn't public,
 * so the online location is this page. No street address is on record for
 * the Demo Day venue, so it gives only the city.
 */
function eventSchema(open: boolean) {
  const page = `${CANONICAL_ORIGIN}/hackathon/elemental`;
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
    eventAttendanceMode: "https://schema.org/MixedEventAttendanceMode",
    location: [
      { "@type": "VirtualLocation", url: page },
      {
        "@type": "Place",
        name: ELEMENTAL.demoDay.venueEn,
        address: { "@type": "PostalAddress", addressLocality: ELEMENTAL.demoDay.city, addressCountry: ELEMENTAL.demoDay.country },
      },
    ],
    // The link preview (./opengraph-image.ts): the key-visual.webp poster still prints the old dates.
    image: [`${CANONICAL_ORIGIN}/hackathon/elemental/opengraph-image`],
    url: page,
    inLanguage: "th",
    organizer: { "@type": "Organization", "@id": `${CANONICAL_ORIGIN}/#organization`, name: "PassionSeed", url: CANONICAL_ORIGIN },
    offers: [offer("สมัครคนเดียว", ELEMENTAL.priceBaht), offer("มากับเพื่อน (ต่อคน)", ELEMENTAL.groupPriceBaht)],
  };
}

/** ELEMENTAL's permanent home. /hackathon redirects here while it is the current hackathon (next.config.mjs). */
export default async function ElementalPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  // Keep the tracked link (?src=ig, or utm_source) through to the sign-up form.
  const src = normalizeSource(first(params.src) ?? first(params.utm_source));
  const joinHref = src ? `/hackathon/join?src=${src}` : "/hackathon/join";
  const open = elementalRegistrationOpen();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema(open)) }} />
      <TrackStep step="landing" source={src} />
      <TrackLinkView source={src} />
      <ElementalLanding joinHref={joinHref} open={open} shareLive={shareOpen()} />
    </>
  );
}
