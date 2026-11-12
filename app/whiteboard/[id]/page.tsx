import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { WhiteboardRoom } from "@/components/whiteboard/WhiteboardRoom";
import { ELEMENT_ID } from "@/lib/shift-island/canvas-link";
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
  searchParams: Promise<{ template?: string | string[]; focus?: string | string[] }>;
}) {
  const { id } = await params;
  const { template, focus } = await searchParams;
  // ?focus=<element id> (the SHIFT High island's canvas links): only an id that looks like Excalidraw's.
  const focusId = typeof focus === "string" && ELEMENT_ID.test(focus) ? focus : null;
  // Signing in comes back to the same element.
  const back = `/whiteboard/${id}${focusId ? `?focus=${focusId}` : ""}`;
  if (!UUID.test(id)) {
    // Same order as before: signed-out visitors are sent to sign in first.
    if (!(await getViewer())) redirect(`/login?next=${encodeURIComponent(back)}`);
    notFound();
  }
  const opened = await openBoard(id);
  if (opened === "signin") redirect(`/login?next=${encodeURIComponent(back)}`);
  if (!opened) notFound();
  const { viewer, board } = opened;

  return (
    <WhiteboardRoom
      board={board}
      me={{ id: viewer.id, name: viewer.name, avatarUrl: viewer.avatarUrl, isAdmin: viewer.isAdmin }}
      templateId={typeof template === "string" ? template : null}
      focusId={focusId}
    />
  );
}
