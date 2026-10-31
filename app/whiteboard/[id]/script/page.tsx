import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ScriptRoom } from "@/components/whiteboard/script/ScriptRoom";
import { getViewer, roleFor } from "@/lib/supabase/whiteboards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "สคริปต์ | PassionSeed",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The presenter's script for a board, in its own tab. Signed-out visits redirect in the proxy. */
export default async function WhiteboardScriptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const viewer = await getViewer();
  if (!viewer || !(await roleFor(id, viewer))) notFound();

  return <ScriptRoom boardId={id} />;
}
