import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { WhiteboardRoom } from "@/components/whiteboard/WhiteboardRoom";
import { getViewer, loadBoard, roleFor } from "@/lib/supabase/whiteboards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Whiteboard | PassionSeed",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function WhiteboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ template?: string }>;
}) {
  const { id } = await params;
  const { template } = await searchParams;
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(`/whiteboard/${id}`)}`);
  if (!UUID.test(id)) notFound();

  const role = await roleFor(id, viewer);
  if (!role) notFound();
  const board = await loadBoard(id, viewer, role);
  if (!board) notFound();

  return (
    <WhiteboardRoom
      board={board}
      me={{ id: viewer.id, name: viewer.name, avatarUrl: viewer.avatarUrl }}
      templateId={template ?? null}
    />
  );
}
