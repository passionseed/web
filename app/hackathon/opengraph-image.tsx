import { copyForRoute } from "@/lib/og/copy";
import { OG_SIZE, renderPoster } from "@/lib/og/poster";

export const alt = "The Next Decade Hackathon | PassionSeed";
export const size = OG_SIZE;
export const contentType = "image/png";
export const runtime = "nodejs";

export default function Image() {
  return renderPoster(copyForRoute("/hackathon"));
}
