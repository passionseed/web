"use client";

import dynamic from "next/dynamic";

import type { WhiteboardDetail } from "@/lib/supabase/whiteboards";

// Excalidraw touches window on import, so it only loads in the browser.
const WhiteboardCanvas = dynamic(() => import("./WhiteboardCanvas"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-[#f8f7f4] text-sm text-neutral-500">
      กำลังเปิดบอร์ด · Opening board
    </div>
  ),
});

export function WhiteboardRoom(props: {
  board: WhiteboardDetail;
  me: { id: string; name: string; avatarUrl: string | null; isAdmin?: boolean };
  templateId?: string | null;
}) {
  return <WhiteboardCanvas {...props} />;
}
