import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { WhiteboardRoom } from "@/components/whiteboard/WhiteboardRoom";
import { getViewer, openBoard } from "@/lib/supabase/whiteboards";

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
  if (!UUID.test(id)) {
    // Same order as before: signed-out visitors are sent to sign in first.
    if (!(await getViewer())) redirect(`/login?next=${encodeURIComponent(`/whiteboard/${id}`)}`);
    notFound();
  }
  const opened = await openBoard(id);
  if (opened === "signin") redirect(`/login?next=${encodeURIComponent(`/whiteboard/${id}`)}`);
  if (!opened) notFound();
  const { viewer, board } = opened;

  return (
    <WhiteboardRoom
      board={board}
      me={{ id: viewer.id, name: viewer.name, avatarUrl: viewer.avatarUrl, isAdmin: viewer.isAdmin }}
      templateId={template ?? null}
    />
  );
}
