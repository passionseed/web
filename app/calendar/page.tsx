import type { Metadata } from "next";

import { CalendarPage } from "@/components/calendar/CalendarPage";
import { EnterBoard } from "@/components/whiteboard/EnterBoard";
import { bangkokParts, weekStart } from "@/lib/calendar/core";
import { isUuid } from "@/lib/calendar/route-guard";
import { bangkokToday } from "@/lib/content/shift-cohort";
import { blockStartsAt } from "@/lib/supabase/calendar";
import { getViewer } from "@/lib/supabase/whiteboards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ปฏิทินชุมชน | PassionSeed",
  robots: { index: false, follow: false },
};

/** Signed-out visits are redirected by the proxy, so this only renders for people signed in. */
export default async function CommunityCalendarPage({ searchParams }: { searchParams: Promise<{ week?: string; block?: string }> }) {
  const [{ week, block }, viewer] = await Promise.all([searchParams, getViewer()]);
  // Guest sessions have no account to put on a block; send them to sign in properly.
  if (!viewer) return <EnterBoard href="/login?next=/calendar" />;
  // A shared link (?block=) opens on that block's week with the block open.
  const startsAt = block && isUuid(block) ? await blockStartsAt(block).catch(() => null) : null;
  const day = startsAt ? bangkokParts(startsAt).date : week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : bangkokToday();
  return <CalendarPage monday={weekStart(day)} initialBlock={startsAt ? block : null} />;
}
