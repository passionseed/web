import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WorksheetSheet } from "@/components/worksheet/WorksheetSheet";
import { WORKSHEETS, getWorksheet } from "@/lib/work/audience-segments";

export function generateStaticParams() {
  return WORKSHEETS.map((worksheet) => ({ slug: worksheet.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const worksheet = getWorksheet(slug);

  if (!worksheet) {
    return { title: "ไม่พบใบงาน | PassionSeed" };
  }

  return {
    title: `${worksheet.thaiTitle} | ใบงานฟรี PassionSeed`,
    description: worksheet.promise,
  };
}

export default async function WorksheetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const worksheet = getWorksheet(slug);

  if (!worksheet) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#faf7f2] font-bai-jamjuree text-stone-900 print:bg-white">
      <WorksheetSheet worksheet={worksheet} />
    </main>
  );
}
