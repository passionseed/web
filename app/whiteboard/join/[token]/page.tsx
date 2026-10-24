import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getViewer, joinByToken } from "@/lib/supabase/whiteboards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Join whiteboard | PassionSeed",
  robots: { index: false, follow: false },
};

/** A share link: sign in, join with the link's access, open the board. */
export default async function JoinWhiteboardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(`/whiteboard/join/${token}`)}`);

  const result = await joinByToken(token, viewer);
  if (result.kind === "joined") redirect(`/whiteboard/${result.boardId}`);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0f0d1a] px-6 text-center text-white">
      <div className="ei-card ei-card--static max-w-sm p-8">
        <h1 className="text-xl font-semibold">ลิงก์นี้ใช้ไม่ได้แล้ว</h1>
        <p className="mt-2 text-sm text-white/60">
          เจ้าของบอร์ดอาจปิดลิงก์หรือเปลี่ยนลิงก์ใหม่ ขอลิงก์ล่าสุดจากเพื่อนอีกครั้งนะ
        </p>
        <Link href="/whiteboard" className="ei-button-dusk mt-6 inline-block px-4 py-2 text-sm">
          ไปที่บอร์ดของฉัน
        </Link>
      </div>
    </main>
  );
}
