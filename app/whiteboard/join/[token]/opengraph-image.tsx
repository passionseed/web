import { renderWhiteboardCard } from "@/lib/og/whiteboard";
import { OG_SIZE } from "@/lib/og/poster";
import { previewByToken } from "@/lib/supabase/whiteboards";

export const alt = "ชวนมาวาดบนไวท์บอร์ด PassionSeed";
export const size = OG_SIZE;
export const contentType = "image/png";
export const runtime = "nodejs";

/** Chat previews of a share link: the board itself, its name and who is inviting. */
export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const board = await previewByToken(token).catch(() => null);
  if (!board) {
    return renderWhiteboardCard({ title: "ไวท์บอร์ด", subtitle: "คิด วาด ระดมไอเดียไปด้วยกันแบบเรียลไทม์" });
  }
  return renderWhiteboardCard({
    title: board.title,
    subtitle: `${board.ownerName} ชวนมาวาดด้วยกัน`,
    chip: `${board.memberCount} คนในบอร์ด`,
    cursorName: board.ownerName,
    thumbnail: board.thumbnail,
  });
}
