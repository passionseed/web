import { notFound } from "next/navigation";
import { getShiftCohort, formatThaiDateRange } from "@/lib/content/shift-cohort";
import { OG_SIZE, renderPoster } from "@/lib/og/poster";

export const alt = "SHIFT | 7 วัน ปั้น 1 โปรเจกต์จริง";
export const size = OG_SIZE;
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function Image({ params }: { params: Promise<{ round: string }> }) {
  const { round } = await params;
  const cohort = getShiftCohort(Number(round));
  if (!cohort) notFound();
  return renderPoster({
    title: cohort.name,
    subtitle: "7 วัน ปั้น 1 โปรเจกต์จริง",
    label: "7 DAYS / REAL PROJECTS",
    footer: `${formatThaiDateRange(cohort.startDate, cohort.endDate)} · Live Project · Pivot Log`,
  });
}
