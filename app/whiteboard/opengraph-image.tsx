import { renderWhiteboardCard } from "@/lib/og/whiteboard";
import { OG_SIZE } from "@/lib/og/poster";

export const alt = "ไวท์บอร์ด PassionSeed";
export const size = OG_SIZE;
export const contentType = "image/png";
export const runtime = "nodejs";

/** Boards themselves are private, so their links get this generic card. */
export default function Image() {
  return renderWhiteboardCard({ title: "ไวท์บอร์ด", subtitle: "คิด วาด ระดมไอเดียไปด้วยกันแบบเรียลไทม์" });
}
