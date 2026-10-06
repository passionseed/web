import { notFound } from "next/navigation";
import { getTipsFile } from "@/lib/content/tips-files";
import { OG_SIZE, renderPoster } from "@/lib/og/poster";

export const alt = "Tips | PassionSeed";
export const size = OG_SIZE;
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const file = getTipsFile((await params).slug);
  if (!file) notFound();
  return renderPoster({ title: file.title, subtitle: file.description, label: "TIPS / YOUR NEXT MOVE" });
}
