import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { WhiteboardList } from "@/components/whiteboard/WhiteboardList";
import { getViewer, listBoards } from "@/lib/supabase/whiteboards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Whiteboard | PassionSeed",
  robots: { index: false, follow: false },
};

export default async function WhiteboardsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/whiteboard");
  return <WhiteboardList boards={await listBoards(viewer)} />;
}
