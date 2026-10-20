import type { Metadata } from "next";

import { BoardGate } from "@/components/shift/alumni-board/BoardGate";
import { BoardShell } from "@/components/shift/alumni-board/BoardShell";
import { boardAccessFor } from "@/components/shift/alumni-board/boardPage";
import board from "@/components/shift/alumni-board/board.module.css";
import { PostCard, PostForm } from "@/components/shift/alumni-board/Feed";
import { BOARD_PATH } from "@/lib/shift/alumniBoard";
import { feedPosts } from "@/lib/supabase/shift-alumni-board/feed";

/** /shift/alumni/board/feed: progress posts for the whole alumni community, with 🔥👏💡. */

export const metadata: Metadata = {
  title: "ความคืบหน้า | SHIFT Alumni",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AlumniBoardFeedPage() {
  const access = await boardAccessFor(`${BOARD_PATH}/feed`);
  if (access.kind !== "ok") {
    return (
      <BoardShell>
        <BoardGate access={access} />
      </BoardShell>
    );
  }
  const posts = await feedPosts(access.viewer);
  return (
    <BoardShell mentor={access.viewer.role === "mentor"}>
      <PostForm />
      {posts.length === 0 && <p className={board.muted}>ยังไม่มีโพสต์ เป็นคนแรกเลย</p>}
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </BoardShell>
  );
}
