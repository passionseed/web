import { getGalleryProduct } from "@/lib/hackathon/gallery";
import { getPlaceholderProduct } from "@/lib/hackathon/gallery-placeholders";
import { OG_SIZE, renderPoster } from "@/lib/og/poster";

export const alt = "Student projects | PassionSeed";
export const size = OG_SIZE;
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function Image({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const product = await getGalleryProduct(teamId) ?? getPlaceholderProduct(teamId);
  return renderPoster({ title: product?.product_name ?? "BUILT BY US", subtitle: "ไอเดียของนักเรียน ที่กลายเป็นผลงานจริง", label: "HACKATHON / GALLERY", theme: "bloom" });
}
