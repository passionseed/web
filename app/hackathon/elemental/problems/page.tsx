import type { Metadata } from "next";

import { DEMO_OWNER_PROBLEMS, OWNER_PROBLEMS } from "@/components/hackathon/elemental/problem-owners";
import { ProblemBoard } from "@/components/hackathon/elemental/problems/ProblemBoard";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { elementalRegistrationOpen, normalizeSource } from "@/lib/hackathon/elemental/registration";

const TITLE = `บอร์ดโจทย์ | ${ELEMENTAL.edition} Hackathon`;
const DESCRIPTION = `โจทย์ทั้ง 5 ธาตุของ ${ELEMENTAL.edition} Hackathon ดิน น้ำ ลม ไฟ อีเธอร์ มีโจทย์ตั้งต้นและโจทย์จากเจ้าของโจทย์ สำหรับนักเรียน ${ELEMENTAL.gradesTh}`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/hackathon/elemental/problems" },
  openGraph: {
    type: "website",
    siteName: "PassionSeed",
    locale: "th_TH",
    title: TITLE,
    description: DESCRIPTION,
    // The image is ./opengraph-image.ts (the key art with today's dates); the
    // key-visual.webp poster still prints the old ones.
    url: "/hackathon/elemental/problems",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Sample owner tiles (?demo=1) show on preview links and local dev only, so a
 * reviewer can see an unlocked tile before any owner confirms. Never on
 * passionseed.org. (`.env.local` pulled from Vercel says VERCEL_ENV=production,
 * so local dev is let in by NODE_ENV instead.)
 */
function showDemo(param: string | undefined): boolean {
  return param === "1" && (process.env.VERCEL_ENV === "preview" || process.env.NODE_ENV === "development");
}

export default async function ElementalProblemsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  // Keep the tracked link (?src=ig) through to the sign-up form, as the landing page does.
  const src = normalizeSource(first(params.src) ?? first(params.utm_source));
  const query = src ? `?src=${src}` : "";
  const owners = showDemo(first(params.demo)) ? [...OWNER_PROBLEMS, ...DEMO_OWNER_PROBLEMS] : OWNER_PROBLEMS;
  return (
    <ProblemBoard
      owners={owners}
      joinHref={`/hackathon/join${query}`}
      homeHref={`/hackathon/elemental${query}`}
      registrationOpen={elementalRegistrationOpen()}
      source={src}
    />
  );
}
