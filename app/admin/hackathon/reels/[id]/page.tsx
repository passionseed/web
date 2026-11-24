import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReelStudio } from "@/components/admin/reels/ReelStudio";
import { REELS } from "@/lib/content/elemental-reels";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { reelById } from "@/lib/reels/studio";

export const metadata: Metadata = { title: "Reel Studio: film" };
export const dynamic = "force-dynamic";

export default async function ReelFilmPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const reel = reelById(REELS, id);
  if (!reel) notFound();

  return <ReelStudio reel={reel} />;
}
