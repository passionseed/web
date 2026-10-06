import { copyForRoute } from "@/lib/og/copy";
import { OG_SIZE, renderPoster } from "@/lib/og/poster";

export const alt = "SHIFT | 7 วัน ปั้น 1 โปรเจกต์จริง";
export const size = OG_SIZE;
export const contentType = "image/png";
export const runtime = "nodejs";

export default function Image() {
  return renderPoster(copyForRoute("/shift"));
}
