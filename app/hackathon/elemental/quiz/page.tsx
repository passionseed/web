import type { Metadata } from "next";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { ElementalQuiz } from "@/components/hackathon/elemental/quiz/ElementalQuiz";
import { EL } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { normalizeSource } from "@/lib/hackathon/elemental/registration";

const TITLE = "คุณคือธาตุอะไร | Elemental quiz";
const DESCRIPTION = `ดิน น้ำ ลม ไฟ หรืออีเธอร์ 8 ข้อ 1 นาที แล้วดูว่าทีมของคุณยังขาดธาตุไหน จาก ${ELEMENTAL.edition} Hackathon`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/hackathon/elemental/quiz" },
  openGraph: { type: "website", siteName: "PassionSeed", locale: "th_TH", title: TITLE, description: DESCRIPTION, url: "/hackathon/elemental/quiz", images: ["/hackathon/elemental/quiz/fire/opengraph-image"] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ElementalQuizPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const source = normalizeSource(first(params.src) ?? first(params.utm_source));
  return (
    <main className={trirong.variable} style={{ backgroundColor: EL.char, color: EL.cream }}>
      <ElementalQuiz source={source} />
    </main>
  );
}
